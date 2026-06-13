import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface DailyCount {
  date: string;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface StarsCount {
  stars: number;
  count: number;
}

export interface MonthFlow {
  month: string;
  flow: number;
}

export interface TopRecipe {
  name: string;
  orderCount: number;
}

export interface AnalyticsData {
  dailyOrders: DailyCount[];
  orderStatusDistribution: StatusCount[];
  ratingDistribution: StarsCount[];
  dailyActiveUsers: DailyCount[];
  monthlyLovePoints: MonthFlow[];
  topRecipes: TopRecipe[];
}

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(): Promise<AnalyticsData> {
    const now = new Date();

    const [
      dailyOrders,
      orderStatusDistribution,
      ratingDistribution,
      dailyActiveUsers,
      monthlyLovePoints,
      topRecipes,
    ] = await Promise.all([
      this.getDailyOrders(now),
      this.getOrderStatusDistribution(),
      this.getRatingDistribution(),
      this.getDailyActiveUsers(now),
      this.getMonthlyLovePoints(now),
      this.getTopRecipes(),
    ]);

    return {
      dailyOrders,
      orderStatusDistribution,
      ratingDistribution,
      dailyActiveUsers,
      monthlyLovePoints,
      topRecipes,
    };
  }

  // ============================================================
  // 私有：各维度聚合
  // ============================================================

  /** 近 30 天每日订单量 */
  private async getDailyOrders(now: Date): Promise<DailyCount[]> {
    const since = new Date(now);
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const rows = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: since } },
      _count: true,
    });

    return this.fillDailyCounts(
      rows.map((r) => ({
        date: formatDate(new Date(r.createdAt)),
        count: r._count,
      })),
      since,
      now,
    );
  }

  /** 订单状态分布 */
  private async getOrderStatusDistribution(): Promise<StatusCount[]> {
    const rows = await this.prisma.order.groupBy({
      by: ['status'],
      _count: true,
      orderBy: { _count: { status: 'desc' } },
    });
    return rows.map((r) => ({ status: r.status, count: r._count }));
  }

  /** 评分分布（1-5 星） */
  private async getRatingDistribution(): Promise<StarsCount[]> {
    const rows = await this.prisma.rating.groupBy({
      by: ['stars'],
      _count: true,
      orderBy: { stars: 'asc' },
    });
    // 保证 1-5 星都有条目
    const map = new Map<number, number>();
    for (const r of rows) map.set(r.stars, r._count);
    const result: StarsCount[] = [];
    for (let s = 1; s <= 5; s++) {
      result.push({ stars: s, count: map.get(s) ?? 0 });
    }
    return result;
  }

  /** 近 30 天每日活跃用户 */
  private async getDailyActiveUsers(now: Date): Promise<DailyCount[]> {
    const since = new Date(now);
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    // 活跃 = 当天有订单创建 / 消息 / 评分
    const [orders, messages, ratings] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, customerUserId: true, chefUserId: true },
      }),
      this.prisma.orderMessage.findMany({
        where: { createdAt: { gte: since }, senderUserId: { not: null } },
        select: { createdAt: true, senderUserId: true },
      }),
      this.prisma.rating.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, raterUserId: true },
      }),
    ]);

    // 按天聚合去重用户
    const dailyMap = new Map<string, Set<string>>();
    const ensure = (d: string) => {
      if (!dailyMap.has(d)) dailyMap.set(d, new Set());
      return dailyMap.get(d)!;
    };

    for (const o of orders) {
      const d = formatDate(o.createdAt);
      ensure(d).add(o.customerUserId);
      ensure(d).add(o.chefUserId);
    }
    for (const m of messages) {
      if (m.senderUserId) ensure(formatDate(m.createdAt)).add(m.senderUserId);
    }
    for (const r of ratings) {
      ensure(formatDate(r.createdAt)).add(r.raterUserId);
    }

    const counts: DailyCount[] = [];
    for (const [date, users] of dailyMap) {
      counts.push({ date, count: users.size });
    }
    return this.fillDailyCounts(counts, since, now);
  }

  /** 近 6 个月爱心币流转（绝对值之和） */
  private async getMonthlyLovePoints(now: Date): Promise<MonthFlow[]> {
    const months: MonthFlow[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const logs = await this.prisma.lovePointLog.findMany({
        where: { createdAt: { gte: m, lt: mEnd } },
        select: { changeAmount: true },
      });
      let flow = 0;
      for (const l of logs) flow += Math.abs(l.changeAmount);
      months.push({
        month: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`,
        flow,
      });
    }
    return months;
  }

  /** 热门菜谱 Top 10（按 orderCount 降序） */
  private async getTopRecipes(): Promise<TopRecipe[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: { isDeleted: false },
      select: { name: true, orderCount: true },
      orderBy: { orderCount: 'desc' },
      take: 10,
    });
    return recipes.map((r) => ({
      name: r.name,
      orderCount: r.orderCount,
    }));
  }

  // ============================================================
  // 工具
  // ============================================================

  /** 补齐 30 天空白天 */
  private fillDailyCounts(counts: DailyCount[], since: Date, now: Date): DailyCount[] {
    const map = new Map(counts.map((c) => [c.date, c.count]));
    const result: DailyCount[] = [];
    const d = new Date(since);
    while (d <= now) {
      const key = formatDate(d);
      result.push({ date: key, count: map.get(key) ?? 0 });
      d.setDate(d.getDate() + 1);
    }
    return result;
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
