import { Injectable, Logger } from '@nestjs/common';
import type { Achievement, BadgeDefinition, Prisma } from '@prisma/client';
import { AchievementOwnerType } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { requireFamilyId } from '../../common/family-context';
import { TtlCache } from '../../common/ttl-cache';
import type { EvaluateContext } from './evaluator-registry';
import { EvaluatorRegistry } from './evaluator-registry';
import type { AchievementDto } from './dto/achievement.dto';

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);
  /** 1-minute TTL cache for badge definitions by triggerType. */
  private readonly badgeCache = new TtlCache<BadgeDefinition[]>(60_000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluatorRegistry: EvaluatorRegistry,
  ) {}

  /**
   * 通用评估入口：根据 triggerType 查找所有匹配的 BadgeDefinition，
   * 逐一执行评估器，命中则创建 Achievement 记录。
   * 失败不抛错（业务流程不应被成就触发阻断）。
   */
  async evaluate(triggerType: string, ctx: EvaluateContext): Promise<Achievement[]> {
    const unlocked: Achievement[] = [];

    // 从缓存或 DB 查询 isActive 且 triggerType 匹配的徽章定义
    const badgeDefs = await this.badgeCache.getOrRefresh(triggerType, () =>
      this.prisma.badgeDefinition.findMany({
        where: { isActive: true, triggerType },
        orderBy: { sortOrder: 'asc' },
      }),
    );

    for (const badge of badgeDefs) {
      try {
        const evaluatorFn = this.evaluatorRegistry.get(badge.evaluatorType);
        if (!evaluatorFn) {
          this.logger.warn(`Unknown evaluator type: ${badge.evaluatorType} for badge ${badge.key}`);
          continue;
        }

        const config = badge.evaluatorConfig as Record<string, unknown>;
        const result = await evaluatorFn(ctx, config, badge.ownerType);

        if (!result || !result.matched) continue;

        // 幂等：检查是否已解锁
        const existing = await this.prisma.achievement.findUnique({
          where: {
            ownerType_ownerId_badgeKey: {
              ownerType: badge.ownerType,
              ownerId: result.ownerId,
              badgeKey: badge.key,
            },
          },
        });
        if (existing) continue;

        const created = await this.prisma.achievement.create({
          data: {
            ownerType: badge.ownerType,
            ownerId: result.ownerId,
            badgeKey: badge.key,
            sourceOrderId: ctx.order?.id ?? null,
            metadata: (result.metadata ?? {}) as Prisma.InputJsonValue,
          },
        });
        unlocked.push(created);
        this.logger.log(`unlocked badge ${badge.key} for ${badge.ownerType}:${result.ownerId}`);
      } catch (err) {
        this.logger.warn(
          `badge ${badge.key} evaluate failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return unlocked;
  }

  /**
   * 保留向后兼容的 evaluateAfterRating 方法
   * 内部转调通用 evaluate()
   */
  async evaluateAfterRating(ctx: {
    prisma: PrismaService;
    order: {
      id: string;
      familyId: string;
      customerUserId: string;
      chefUserId: string;
      servedAt?: Date | null;
      completedAt?: Date | null;
      items?: Array<{ recipeId: string | null; recipeSnapshot: unknown }>;
    };
    stars: number;
    comment?: string | null;
  }): Promise<Achievement[]> {
    const userId = ctx.order.customerUserId;
    const evalCtx: EvaluateContext = {
      prisma: this.prisma,
      userId,
      familyId: ctx.order.familyId,
      triggerType: 'order_rated',
      order: ctx.order,
      stars: ctx.stars,
      comment: ctx.comment,
    };

    return this.evaluate('order_rated', evalCtx);
  }

  /** 我的个人成就 */
  async listMine(userId: string): Promise<AchievementDto[]> {
    await requireFamilyId(this.prisma, userId);
    const items = await this.prisma.achievement.findMany({
      where: { ownerType: AchievementOwnerType.USER, ownerId: userId },
      orderBy: { unlockedAt: 'desc' },
      include: { badgeDefinition: true },
    });
    return items.map((a) => this.toDto(a));
  }

  /** 家庭成就 */
  async listFamily(userId: string): Promise<AchievementDto[]> {
    const familyId = await requireFamilyId(this.prisma, userId);
    const items = await this.prisma.achievement.findMany({
      where: { ownerType: AchievementOwnerType.FAMILY, ownerId: familyId },
      orderBy: { unlockedAt: 'desc' },
      include: { badgeDefinition: true },
    });
    return items.map((a) => this.toDto(a));
  }

  /** 进度 API：返回所有活跃徽章的进度信息 */
  async getProgress(userId: string): Promise<BadgeProgressDto[]> {
    const familyId = await requireFamilyId(this.prisma, userId);

    const badgeDefs = await this.prisma.badgeDefinition.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // 查已解锁的
    const [userAchievements, familyAchievements] = await Promise.all([
      this.prisma.achievement.findMany({
        where: { ownerType: AchievementOwnerType.USER, ownerId: userId },
        select: { badgeKey: true },
      }),
      this.prisma.achievement.findMany({
        where: { ownerType: AchievementOwnerType.FAMILY, ownerId: familyId },
        select: { badgeKey: true },
      }),
    ]);

    const unlockedKeys = new Set([
      ...userAchievements.map((a) => a.badgeKey),
      ...familyAchievements.map((a) => a.badgeKey),
    ]);

    const result: BadgeProgressDto[] = [];

    for (const badge of badgeDefs) {
      const isUnlocked = unlockedKeys.has(badge.key);

      // 隐藏成就未解锁时不显示
      if (badge.hidden && !isUnlocked) continue;

      result.push({
        badgeKey: badge.key,
        title: badge.title,
        description: badge.description,
        emoji: badge.emoji,
        category: badge.category,
        ownerType: badge.ownerType,
        hidden: badge.hidden,
        isUnlocked,
        current: badge.progressTarget ? (isUnlocked ? badge.progressTarget : null) : null,
        target: badge.progressTarget,
      });
    }

    return result;
  }

  /** Clear badge definition cache (call after admin CRUD). */
  clearBadgeCache(): void {
    this.badgeCache.clear();
  }

  private toDto(a: Achievement & { badgeDefinition?: BadgeDefinition | null }): AchievementDto {
    const def = a.badgeDefinition;
    return {
      id: a.id,
      ownerType: a.ownerType,
      ownerId: a.ownerId,
      badgeKey: a.badgeKey,
      title: def?.title ?? null,
      description: def?.description ?? null,
      emoji: def?.emoji ?? null,
      category: def?.category ?? null,
      hidden: def?.hidden ?? false,
      sourceOrderId: a.sourceOrderId,
      metadata: (a.metadata ?? {}) as Record<string, unknown>,
      unlockedAt: a.unlockedAt,
    };
  }
}

export interface BadgeProgressDto {
  badgeKey: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  ownerType: string;
  hidden: boolean;
  isUnlocked: boolean;
  current: number | null;
  target: number | null;
}
