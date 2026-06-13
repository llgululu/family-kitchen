import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderMessageType, OrderStatus } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BusinessConfigService } from '../business-config/business-config.service';
import { WsGateway } from '../ws/ws.gateway';

/**
 * 每 5 分钟扫一次：
 * 1. 期望上菜时间在「未来 15 分钟」内的活跃订单 → 提醒厨师
 * 2. 烹饪中且已超过期望上菜时间的订单 → 自动催菜消息
 */
@Injectable()
export class OrderRemindCron {
  private readonly logger = new Logger(OrderRemindCron.name);
  private readonly remindedOrderIds = new Set<string>();
  private readonly overdueNudgedOrderIds = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
    private readonly bizConfig: BusinessConfigService,
    private readonly wsGateway: WsGateway,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async run(): Promise<void> {
    await this.remindUpcoming();
    await this.remindOverdue();
  }

  /** 期望时间临近 → 提醒厨师 */
  private async remindUpcoming(): Promise<void> {
    const now = Date.now();
    const upperBound = new Date(
      now + this.bizConfig.getOrderTiming().REMIND_CHEF_BEFORE_MINUTES * 60 * 1000,
    );
    const lowerBound = new Date(now);

    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.ACCEPTED, OrderStatus.PREPPING, OrderStatus.COOKING] },
        expectedServeAt: { gte: lowerBound, lte: upperBound },
      },
      select: { id: true },
      take: 200,
    });

    for (const order of orders) {
      if (this.remindedOrderIds.has(order.id)) continue;
      this.remindedOrderIds.add(order.id);
      try {
        await this.notification.sendOrderReminder(order.id);
      } catch (err) {
        this.logger.warn(
          `order-remind 订单 ${order.id} 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (this.remindedOrderIds.size > 10_000) {
      this.remindedOrderIds.clear();
    }
  }

  /** 烹饪中且已逾期 → 自动催菜系统消息 */
  private async remindOverdue(): Promise<void> {
    const now = new Date();

    const overdueOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.COOKING,
        expectedServeAt: { lt: now },
      },
      select: { id: true, chefUserId: true, customerUserId: true, familyId: true },
      take: 200,
    });

    for (const order of overdueOrders) {
      if (this.overdueNudgedOrderIds.has(order.id)) continue;
      this.overdueNudgedOrderIds.add(order.id);
      try {
        // 插入系统消息
        await this.prisma.orderMessage.create({
          data: {
            orderId: order.id,
            senderUserId: 'system',
            type: OrderMessageType.SYSTEM,
            content: '订单已超时，厨师正在努力烹饪中…',
          },
        });
        // WebSocket 推送给双方
        this.wsGateway.sendToUser(order.chefUserId, 'order_message', { orderId: order.id });
        this.wsGateway.sendToUser(order.customerUserId, 'order_message', { orderId: order.id });
      } catch (err) {
        this.logger.warn(
          `overdue-nudge 订单 ${order.id} 失败: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (this.overdueNudgedOrderIds.size > 10_000) {
      this.overdueNudgedOrderIds.clear();
    }
  }
}
