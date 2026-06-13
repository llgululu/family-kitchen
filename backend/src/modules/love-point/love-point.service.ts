import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { LovePointLog, Prisma, PrismaClient } from '@prisma/client';
import { LovePointChangeType } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { requireFamilyId } from '../../common/family-context';
import { paginate, type PaginatedResponseDto } from '../../common/pagination.dto';
import type {
  LovePointBalanceDto,
  LovePointLogDto,
  LovePointLogQueryDto,
} from './dto/love-point-log.dto';
import type { EvaluateContext } from '../achievement/evaluator-registry';
import { AchievementService } from '../achievement/achievement.service';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface AddLogInput {
  userId: string;
  familyId: string;
  changeAmount: number;
  changeType: string;
  sourceOrderId?: string | null;
  description?: string | null;
  reversibleUntil?: Date | null;
}

@Injectable()
export class LovePointService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly achievement: AchievementService,
  ) {}

  /** 仅个人钱包：余额 = 最后一条 log.balanceAfter，没有则 0 */
  async getMyBalance(userId: string): Promise<LovePointBalanceDto> {
    const familyId = await requireFamilyId(this.prisma, userId);
    const latest = await this.prisma.lovePointLog.findFirst({
      where: { userId, familyId },
      orderBy: { createdAt: 'desc' },
    });
    const balance = latest?.balanceAfter ?? 0;

    const monthStart = startOfMonth(new Date());
    const monthLogs = await this.prisma.lovePointLog.findMany({
      where: { userId, familyId, createdAt: { gte: monthStart } },
      select: { changeAmount: true },
    });
    let monthEarned = 0;
    let monthSpent = 0;
    for (const log of monthLogs) {
      if (log.changeAmount >= 0) monthEarned += log.changeAmount;
      else monthSpent += -log.changeAmount;
    }
    return { balance, monthEarned, monthSpent };
  }

  async getMyLogs(
    userId: string,
    query: LovePointLogQueryDto,
  ): Promise<PaginatedResponseDto<LovePointLogDto>> {
    const familyId = await requireFamilyId(this.prisma, userId);

    const where: Prisma.LovePointLogWhereInput =
      query.scope === 'family' ? { familyId } : { userId, familyId };
    if (query.changeTypes?.length) {
      where.changeType = { in: query.changeTypes };
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.lovePointLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.lovePointLog.count({ where }),
    ]);

    return paginate(
      logs.map((l) => this.toDto(l)),
      total,
      query.page,
      query.pageSize,
    );
  }

  /**
   * 内部接口：追加一条流水。
   * 必须在外层事务中调用 / 或单独事务，保证 balanceAfter 计算原子性。
   * @param tx 可选：传入事务客户端，否则用 PrismaService（独立小事务）
   */
  async addLog(input: AddLogInput, tx?: TxClient): Promise<LovePointLog> {
    const client = tx ?? (this.prisma as unknown as TxClient);
    const latest = await client.lovePointLog.findFirst({
      where: { userId: input.userId, familyId: input.familyId },
      orderBy: { createdAt: 'desc' },
    });
    const previous = latest?.balanceAfter ?? 0;
    const balanceAfter = previous + input.changeAmount;
    return client.lovePointLog.create({
      data: {
        userId: input.userId,
        familyId: input.familyId,
        changeAmount: input.changeAmount,
        balanceAfter,
        changeType: input.changeType,
        sourceOrderId: input.sourceOrderId ?? null,
        description: input.description ?? null,
        reversibleUntil: input.reversibleUntil ?? null,
      },
    });
  }

  /** 同上但批量，按数组顺序累加 balanceAfter */
  async addLogs(inputs: AddLogInput[], tx?: TxClient): Promise<LovePointLog[]> {
    const results: LovePointLog[] = [];
    for (const input of inputs) {
      results.push(await this.addLog(input, tx));
    }
    return results;
  }

  /** 每日签到：检查当日是否已签到，未签到则 +2 爱心币 */
  async checkIn(userId: string): Promise<{ earned: number }> {
    const familyId = await requireFamilyId(this.prisma, userId);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existing = await this.prisma.lovePointLog.findFirst({
      where: {
        userId,
        familyId,
        changeType: LovePointChangeType.CHECK_IN,
        createdAt: { gte: todayStart },
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_CHECKED_IN',
        message: '今日已签到',
      });
    }

    const earned = 2;
    await this.addLog({
      userId,
      familyId,
      changeAmount: earned,
      changeType: LovePointChangeType.CHECK_IN,
      description: '每日签到',
    });

    // 触发 daily_check 成就评估
    void this.triggerDailyCheck(userId, familyId);

    return { earned };
  }

  /**
   * 撤回打赏：原 tip_send 流水可在 24h 内由原发起人撤回。
   * 反向写一条 refund 流水（食客 +X，厨师 -X），并把原流水标记 is_reversed。
   */
  async reverseLog(userId: string, logId: string): Promise<LovePointLog[]> {
    const log = await this.prisma.lovePointLog.findUnique({ where: { id: logId } });
    if (!log) {
      throw new NotFoundException({
        code: 'LOG_NOT_FOUND',
        message: '流水不存在',
      });
    }
    if (log.userId !== userId) {
      throw new ForbiddenException({
        code: 'NOT_LOG_OWNER',
        message: '只能撤回自己的流水',
      });
    }
    if (log.changeType !== LovePointChangeType.TIP_SEND) {
      throw new BadRequestException({
        code: 'NOT_REVERSIBLE_TYPE',
        message: '只有打赏可以撤回',
      });
    }
    if (log.isReversed) {
      throw new ConflictException({
        code: 'ALREADY_REVERSED',
        message: '该流水已撤回',
      });
    }
    if (!log.reversibleUntil || log.reversibleUntil < new Date()) {
      throw new BadRequestException({
        code: 'REVERSIBLE_EXPIRED',
        message: '撤回时间已过（仅 24 小时内可撤回）',
      });
    }
    if (!log.sourceOrderId) {
      throw new BadRequestException({
        code: 'MISSING_SOURCE_ORDER',
        message: '原流水缺少订单关联，无法定位收款方',
      });
    }
    const order = await this.prisma.order.findUnique({
      where: { id: log.sourceOrderId },
    });
    if (!order) {
      throw new BadRequestException({
        code: 'ORDER_NOT_FOUND',
        message: '原订单不存在',
      });
    }

    const tipAmountAbs = Math.abs(log.changeAmount); // 原流水是负数
    const result = await this.prisma.$transaction(async (tx) => {
      // 退回食客
      const refundToCustomer = await this.addLog(
        {
          userId: log.userId,
          familyId: log.familyId,
          changeAmount: tipAmountAbs,
          changeType: LovePointChangeType.REFUND,
          sourceOrderId: log.sourceOrderId,
          description: `撤回打赏（原 ${log.description ?? ''}）`,
        },
        tx as never,
      );
      // 从厨师扣回
      await this.addLog(
        {
          userId: order.chefUserId,
          familyId: log.familyId,
          changeAmount: -tipAmountAbs,
          changeType: LovePointChangeType.REFUND,
          sourceOrderId: log.sourceOrderId,
          description: `打赏被撤回（原 ${log.description ?? ''}）`,
        },
        tx as never,
      );
      // 退款流水反指原流水；原流水标记为已撤回
      await tx.lovePointLog.update({
        where: { id: refundToCustomer.id },
        data: { reversedFromId: log.id },
      });
      await tx.lovePointLog.update({
        where: { id: log.id },
        data: { isReversed: true },
      });
      return [refundToCustomer];
    });

    return result;
  }

  private async triggerDailyCheck(userId: string, familyId: string): Promise<void> {
    try {
      const ctx: EvaluateContext = {
        prisma: this.prisma,
        userId,
        familyId,
        triggerType: 'daily_check',
      };
      await this.achievement.evaluate('daily_check', ctx);
    } catch {
      // 成就评估失败不应影响主流程
    }
  }

  private toDto(log: LovePointLog): LovePointLogDto {
    return {
      id: log.id,
      userId: log.userId,
      changeAmount: log.changeAmount,
      balanceAfter: log.balanceAfter,
      changeType: log.changeType,
      sourceOrderId: log.sourceOrderId,
      description: log.description,
      createdAt: log.createdAt,
    };
  }
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
