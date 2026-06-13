import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminMetricsDto } from './dto/admin-metrics.dto';

@Injectable()
export class AdminMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(): Promise<AdminMetricsDto> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = startOfMonth(now);

    const [
      totalUsers,
      totalFamilies,
      weeklyOrders,
      activeFamilyIds,
      todayActiveUsers,
      monthlyAbsoluteFlow,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.family.count(),
      this.prisma.order.count({
        where: { status: OrderStatus.COMPLETED, completedAt: { gte: weekStart } },
      }),
      this.collectActiveFamilyIds(weekStart),
      this.collectTodayActiveUserIds(todayStart),
      this.sumAbsoluteFlow(monthStart),
    ]);

    const doubleActiveRate = await this.computeDoubleActiveRate(activeFamilyIds, weekStart);

    return {
      totalUsers,
      totalFamilies,
      activeFamiliesLast7d: activeFamilyIds.size,
      todayDau: todayActiveUsers.size,
      weeklyOrders,
      doubleActiveRate,
      monthlyLovePointVolume: monthlyAbsoluteFlow,
      snapshotAt: now,
    };
  }

  // ============================================================
  // 私有：聚合逻辑
  // ============================================================

  /** 近 7 天有任何订单活动（创建 / 接单 / 上菜）的家庭 ID 集合 */
  private async collectActiveFamilyIds(since: Date): Promise<Set<string>> {
    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { familyId: true },
    });
    return new Set(orders.map((o) => o.familyId));
  }

  /** 今日有任何消息 / 订单创建 / 评分行为的用户 ID 集合 */
  private async collectTodayActiveUserIds(since: Date): Promise<Set<string>> {
    const [orders, messages, ratings] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: since } },
        select: { customerUserId: true, chefUserId: true },
      }),
      this.prisma.orderMessage.findMany({
        where: { createdAt: { gte: since }, senderUserId: { not: null } },
        select: { senderUserId: true },
      }),
      this.prisma.rating.findMany({
        where: { createdAt: { gte: since } },
        select: { raterUserId: true },
      }),
    ]);
    const set = new Set<string>();
    for (const o of orders) {
      set.add(o.customerUserId);
      set.add(o.chefUserId);
    }
    for (const m of messages) {
      if (m.senderUserId) set.add(m.senderUserId);
    }
    for (const r of ratings) set.add(r.raterUserId);
    return set;
  }

  /**
   * 双活率：在 active 集合内，家庭中两位成员都在 7 天内有过任意写操作的占比。
   * 单成员家庭忽略（分母里不算）。
   */
  private async computeDoubleActiveRate(
    activeFamilyIds: Set<string>,
    since: Date,
  ): Promise<number> {
    if (activeFamilyIds.size === 0) return 0;
    const ids = Array.from(activeFamilyIds);
    const families = await this.prisma.family.findMany({
      where: { id: { in: ids } },
      include: {
        members: { where: { leftAt: null }, select: { userId: true } },
        orders: {
          where: { createdAt: { gte: since } },
          select: { customerUserId: true, chefUserId: true },
        },
      },
    });
    let totalDouble = 0;
    let totalEligible = 0;
    for (const f of families) {
      if (f.members.length < 2) continue;
      totalEligible++;
      const active = new Set<string>();
      for (const o of f.orders) {
        active.add(o.customerUserId);
        active.add(o.chefUserId);
      }
      const allMembersActive = f.members.every((m) => active.has(m.userId));
      if (allMembersActive) totalDouble++;
    }
    if (totalEligible === 0) return 0;
    return Math.round((totalDouble / totalEligible) * 100) / 100;
  }

  /** 本月爱心币流转：sum(|changeAmount|) */
  private async sumAbsoluteFlow(since: Date): Promise<number> {
    const logs = await this.prisma.lovePointLog.findMany({
      where: { createdAt: { gte: since } },
      select: { changeAmount: true },
    });
    let sum = 0;
    for (const l of logs) sum += Math.abs(l.changeAmount);
    return sum;
  }
}

// ============================================================
// helpers
// ============================================================

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
