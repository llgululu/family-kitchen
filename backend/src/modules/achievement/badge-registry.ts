import { AchievementOwnerType, OrderStatus } from '@family-kitchen/shared';
import type { PrismaService } from '../../prisma/prisma.service';

export interface BadgeContext {
  prisma: PrismaService;
  /** 触发本次评估的订单 */
  order: {
    id: string;
    familyId: string;
    customerUserId: string;
    chefUserId: string;
  };
  /** 评分 */
  stars: number;
}

export interface UnlockResult {
  /** owner_type=user/family；user 维度通常是厨师，family 维度是整家庭 */
  ownerType: (typeof AchievementOwnerType)[keyof typeof AchievementOwnerType];
  ownerId: string;
  metadata?: Record<string, unknown>;
}

export interface BadgeDef {
  key: string;
  title: string;
  description: string;
  /** 评估函数返回 UnlockResult 表示需要解锁；返回 null 表示不触发 */
  evaluate(ctx: BadgeContext): Promise<UnlockResult | null>;
}

/** 家庭维度：累计已完成订单数达到阈值 */
function familyMilestone(threshold: number, key: string, title: string): BadgeDef {
  return {
    key,
    title,
    description: `家庭累计完成 ${threshold} 道菜`,
    async evaluate({ prisma, order }) {
      const count = await prisma.order.count({
        where: { familyId: order.familyId, status: OrderStatus.COMPLETED },
      });
      // count 已包含本次（rating 时已 update 到 completed）
      if (count !== threshold) return null;
      return {
        ownerType: AchievementOwnerType.FAMILY,
        ownerId: order.familyId,
        metadata: { count },
      };
    },
  };
}

/** 厨师维度：累计完成做菜数达到阈值 */
function chefMilestone(threshold: number, key: string, title: string): BadgeDef {
  return {
    key,
    title,
    description: `厨师累计做 ${threshold} 道菜`,
    async evaluate({ prisma, order }) {
      const count = await prisma.order.count({
        where: { chefUserId: order.chefUserId, status: OrderStatus.COMPLETED },
      });
      if (count !== threshold) return null;
      return {
        ownerType: AchievementOwnerType.USER,
        ownerId: order.chefUserId,
        metadata: { count },
      };
    },
  };
}

/** 厨师维度：连续 N 次 5 星评价 */
function fiveStarStreak(threshold: number, key: string, title: string): BadgeDef {
  return {
    key,
    title,
    description: `厨师连续 ${threshold} 次拿到 5 星`,
    async evaluate({ prisma, order, stars }) {
      if (stars !== 5) return null;
      // 取该厨师最近 N 条已完成订单 + rating，判断是否全 5 星
      const recent = await prisma.order.findMany({
        where: { chefUserId: order.chefUserId, status: OrderStatus.COMPLETED },
        include: { rating: true },
        orderBy: { completedAt: 'desc' },
        take: threshold,
      });
      if (recent.length < threshold) return null;
      if (recent.every((o) => o.rating?.stars === 5)) {
        return {
          ownerType: AchievementOwnerType.USER,
          ownerId: order.chefUserId,
          metadata: { streak: threshold },
        };
      }
      return null;
    },
  };
}

/** 全部徽章定义；新增徽章只需在此追加即可 */
export const BADGE_REGISTRY: readonly BadgeDef[] = [
  familyMilestone(1, 'family_first_dish', '第一道菜'),
  familyMilestone(10, 'family_10_dishes', '家庭第 10 道菜'),
  familyMilestone(100, 'family_100_dishes', '家庭第 100 道菜'),
  familyMilestone(365, 'family_365_dishes', '家庭第 365 道菜'),
  chefMilestone(1, 'chef_first_dish', '厨师初体验'),
  chefMilestone(10, 'chef_10_dishes', '厨师小学徒'),
  chefMilestone(100, 'chef_100_dishes', '厨师大师傅'),
  fiveStarStreak(5, 'five_star_streak_5', '五星连击 ×5'),
] as const;

export function findBadgeDef(key: string): BadgeDef | undefined {
  return BADGE_REGISTRY.find((b) => b.key === key);
}
