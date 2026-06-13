import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Order, OrderMessage, Prisma } from '@prisma/client';
import { LovePointChangeType, OrderMessageType, OrderStatus } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { requireFamilyId } from '../../common/family-context';
import { paginate, type PaginatedResponseDto } from '../../common/pagination.dto';
import { LovePointService } from '../love-point/love-point.service';
import { NotificationService } from '../notification/notification.service';
import { BusinessConfigService } from '../business-config/business-config.service';
import { WsGateway } from '../ws/ws.gateway';
import { AchievementService } from '../achievement/achievement.service';
import type { EvaluateContext } from '../achievement/evaluator-registry';
import type { PaginationQueryDto } from '../../common/pagination.dto';
import type { CreateMessageDto, MessageDto } from './dto/create-message.dto';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lovePoint: LovePointService,
    private readonly notification: NotificationService,
    private readonly bizConfig: BusinessConfigService,
    private readonly ws: WsGateway,
    private readonly achievement: AchievementService,
  ) {}

  async list(
    userId: string,
    orderId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<MessageDto>> {
    const order = await this.requireParticipant(userId, orderId);
    const [messages, total] = await this.prisma.$transaction([
      this.prisma.orderMessage.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: 'asc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.orderMessage.count({ where: { orderId: order.id } }),
    ]);
    return paginate(
      messages.map((m) => this.toDto(m)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async send(userId: string, orderId: string, dto: CreateMessageDto): Promise<MessageDto> {
    const order = await this.requireParticipant(userId, orderId);
    if (this.isTerminal(order.status)) {
      throw new BadRequestException({
        code: 'ORDER_CLOSED',
        message: '订单已结束，不能再发消息',
      });
    }

    const content = await this.buildContent(userId, order, dto);
    const message = await this.prisma.orderMessage.create({
      data: {
        orderId: order.id,
        senderUserId: userId,
        type: dto.type,
        content,
      },
    });
    const msgDto = this.toDto(message);
    const recipientId = userId === order.chefUserId ? order.customerUserId : order.chefUserId;
    this.ws.sendToUser(recipientId, 'order:message', {
      orderId: order.id,
      message: msgDto,
    });

    // 触发 message_sent 成就评估
    void this.triggerMessageAchievement(userId, order, message);

    return msgDto;
  }

  async markRead(userId: string, orderId: string): Promise<string[]> {
    const order = await this.requireParticipant(userId, orderId);
    const unread = await this.prisma.orderMessage.findMany({
      where: { orderId: order.id, senderUserId: { not: userId }, readAt: null },
      select: { id: true },
    });
    if (unread.length === 0) return [];
    const ids = unread.map((m) => m.id);
    const now = new Date();
    await this.prisma.orderMessage.updateMany({
      where: { id: { in: ids } },
      data: { readAt: now },
    });
    // 通知对方：你的消息已读
    const otherId = userId === order.chefUserId ? order.customerUserId : order.chefUserId;
    this.ws.sendToUser(otherId, 'order:messagesRead', {
      orderId: order.id,
      messageIds: ids,
      readAt: now.toISOString(),
    });
    return ids;
  }

  // ============================================================
  // internal
  // ============================================================

  private async buildContent(
    userId: string,
    order: Order,
    dto: CreateMessageDto,
  ): Promise<Prisma.InputJsonValue> {
    switch (dto.type) {
      case OrderMessageType.TEXT: {
        if (!dto.text) {
          throw new BadRequestException({ code: 'TEXT_REQUIRED', message: 'text 字段必填' });
        }
        return { text: dto.text };
      }
      case OrderMessageType.EMOJI: {
        if (!dto.emojiKey) {
          throw new BadRequestException({
            code: 'EMOJI_REQUIRED',
            message: 'emojiKey 字段必填',
          });
        }
        return { emojiKey: dto.emojiKey };
      }
      case OrderMessageType.IMAGE: {
        if (!dto.imageUrl) {
          throw new BadRequestException({
            code: 'IMAGE_REQUIRED',
            message: 'imageUrl 字段必填',
          });
        }
        return { imageUrl: dto.imageUrl };
      }
      case OrderMessageType.RUSH: {
        const rushCount = await this.checkRushLimit(userId, order);
        void this.notification.sendOrderRushed(order.id, rushCount);
        return { kind: 'rush' };
      }
      case OrderMessageType.TIP: {
        if (!dto.tip) {
          throw new BadRequestException({ code: 'TIP_REQUIRED', message: 'tip 字段必填' });
        }
        await this.settleTip(userId, order, dto.tip.amount, dto.tip.title);
        return { amount: dto.tip.amount, title: dto.tip.title ?? null };
      }
      default:
        throw new BadRequestException({
          code: 'UNSUPPORTED_TYPE',
          message: `不支持的消息类型 ${String(dto.type)}`,
        });
    }
  }

  /** @returns 通过校验后本次将成为第几次催菜 */
  private async checkRushLimit(userId: string, order: Order): Promise<number> {
    // 必须是食客在催
    if (order.customerUserId !== userId) {
      throw new ForbiddenException({
        code: 'RUSH_FOR_CUSTOMER_ONLY',
        message: '只有食客可以催菜',
      });
    }
    // 厨师必须在烹饪中
    if (order.status !== OrderStatus.COOKING) {
      throw new BadRequestException({
        code: 'RUSH_NOT_ALLOWED',
        message: '只有「烹饪中」状态可以催菜',
      });
    }
    const rushLimits = this.bizConfig.getRushLimits();
    const rushCount = await this.prisma.orderMessage.count({
      where: { orderId: order.id, type: OrderMessageType.RUSH },
    });
    if (rushCount >= rushLimits.MAX_PER_ORDER) {
      throw new ConflictException({
        code: 'RUSH_LIMIT_EXCEEDED',
        message: `每单最多催 ${rushLimits.MAX_PER_ORDER} 次`,
      });
    }
    const recent = await this.prisma.orderMessage.findFirst({
      where: { orderId: order.id, type: OrderMessageType.RUSH },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const elapsedSec = (Date.now() - recent.createdAt.getTime()) / 1000;
      if (elapsedSec < rushLimits.COOLDOWN_SECONDS) {
        const wait = Math.ceil(rushLimits.COOLDOWN_SECONDS - elapsedSec);
        throw new ConflictException({
          code: 'RUSH_TOO_FREQUENT',
          message: `请 ${wait} 秒后再催`,
        });
      }
    }
    return rushCount + 1;
  }

  private async settleTip(
    userId: string,
    order: Order,
    amount: number,
    title?: string,
  ): Promise<void> {
    if (userId !== order.customerUserId) {
      throw new ForbiddenException({
        code: 'TIP_FOR_CUSTOMER_ONLY',
        message: '只有食客可以打赏',
      });
    }
    if (userId === order.chefUserId) {
      throw new BadRequestException({
        code: 'CANNOT_TIP_SELF',
        message: '不能打赏自己',
      });
    }
    const balance = await this.lovePoint.getMyBalance(userId);
    if (balance.balance < amount) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_BALANCE',
        message: `爱心币余额不足（当前 ${balance.balance}）`,
      });
    }
    const reversibleUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const desc = title ? `打赏：${title}` : '打赏';
    await this.prisma.$transaction(async (tx) => {
      await this.lovePoint.addLog(
        {
          userId,
          familyId: order.familyId,
          changeAmount: -amount,
          changeType: LovePointChangeType.TIP_SEND,
          sourceOrderId: order.id,
          description: desc,
          reversibleUntil,
        },
        tx as never,
      );
      await this.lovePoint.addLog(
        {
          userId: order.chefUserId,
          familyId: order.familyId,
          changeAmount: amount,
          changeType: LovePointChangeType.TIP_RECEIVE,
          sourceOrderId: order.id,
          description: desc,
        },
        tx as never,
      );
    });
  }

  private isTerminal(status: string): boolean {
    return (['completed', 'rejected', 'cancelled'] as const).includes(
      status as 'completed' | 'rejected' | 'cancelled',
    );
  }

  private async requireParticipant(userId: string, orderId: string): Promise<Order> {
    const familyId = await requireFamilyId(this.prisma, userId);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: '订单不存在' });
    }
    if (order.familyId !== familyId) {
      throw new ForbiddenException({
        code: 'ORDER_NOT_IN_YOUR_FAMILY',
        message: '不能操作其他小厨房的订单',
      });
    }
    if (order.customerUserId !== userId && order.chefUserId !== userId) {
      throw new ForbiddenException({
        code: 'NOT_ORDER_PARTICIPANT',
        message: '你不是这笔订单的参与者',
      });
    }
    return order;
  }

  private toDto(m: OrderMessage): MessageDto {
    return {
      id: m.id,
      senderUserId: m.senderUserId,
      type: m.type,
      content: (m.content ?? {}) as Record<string, unknown>,
      createdAt: m.createdAt,
      readAt: m.readAt,
    };
  }

  /** 触发 message_sent / tip_settled 成就评估（fire-and-forget） */
  private async triggerMessageAchievement(
    userId: string,
    order: Order,
    message: OrderMessage,
  ): Promise<void> {
    try {
      const familyId = order.familyId;

      // message_sent 成就
      const msgCtx: EvaluateContext = {
        prisma: this.prisma,
        userId,
        familyId,
        triggerType: 'message_sent',
        order: {
          id: order.id,
          familyId: order.familyId,
          customerUserId: order.customerUserId,
          chefUserId: order.chefUserId,
        },
        message: {
          id: message.id,
          orderId: order.id,
          type: message.type,
          content: (message.content ?? {}) as Record<string, unknown>,
          senderUserId: message.senderUserId ?? userId,
        },
      };
      await this.achievement.evaluate('message_sent', msgCtx);

      // tip_settled 成就（仅 TIP 类型消息）
      if (message.type === OrderMessageType.TIP) {
        const tipContent = (message.content ?? {}) as Record<string, unknown>;
        const tipCtx: EvaluateContext = {
          prisma: this.prisma,
          userId,
          familyId,
          triggerType: 'tip_settled',
          order: {
            id: order.id,
            familyId: order.familyId,
            customerUserId: order.customerUserId,
            chefUserId: order.chefUserId,
          },
          amount: Number(tipContent.amount ?? 0),
        };
        await this.achievement.evaluate('tip_settled', tipCtx);
      }
    } catch {
      // 成就评估失败不应影响主流程
    }
  }
}
