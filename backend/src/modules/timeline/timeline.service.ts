import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, PrismaClient, TimelineEntry } from '@prisma/client';
import { AchievementOwnerType, OrderStatus, TimelineSourceType } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { requireFamilyId } from '../../common/family-context';
import { paginate, type PaginatedResponseDto } from '../../common/pagination.dto';
import type {
  CreateManualEntryDto,
  ReplyTimelineEntryDto,
  TimelineEntryDto,
  TimelineQueryDto,
} from './dto/timeline-entry.dto';
import type { MonthlySummaryDto } from './dto/monthly-summary.dto';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface CreateFromOrderInput {
  familyId: string;
  orderId: string;
  occurredAt: Date;
  imageUrls: string[];
  customerUserId: string;
  chefUserId: string;
  customerComment?: string | null;
  chefComment?: string | null;
}

@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: TimelineQueryDto,
  ): Promise<PaginatedResponseDto<TimelineEntryDto>> {
    const familyId = await requireFamilyId(this.prisma, userId);

    const where: Prisma.TimelineEntryWhereInput = { familyId };
    if (query.from || query.to) {
      where.occurredAt = {};
      if (query.from) where.occurredAt.gte = new Date(query.from);
      if (query.to) where.occurredAt.lte = new Date(query.to);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.timelineEntry.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: {
          customerUser: { select: { nickname: true } },
          chefUser: { select: { nickname: true } },
        },
      }),
      this.prisma.timelineEntry.count({ where }),
    ]);

    return paginate(
      items.map((e) => this.toDto(e, userId)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async createManual(userId: string, dto: CreateManualEntryDto): Promise<TimelineEntryDto> {
    const familyId = await requireFamilyId(this.prisma, userId);
    const entry = await this.prisma.timelineEntry.create({
      data: {
        familyId,
        sourceType: TimelineSourceType.MANUAL,
        occurredAt: new Date(dto.occurredAt),
        imageUrls: (dto.imageUrls ?? []) as unknown as Prisma.InputJsonValue,
        customerUserId: userId,
        chefUserId: null,
        customerComment: dto.comment ?? null,
        chefComment: null,
      },
    });
    return this.toDto(entry, userId);
  }

  async reply(userId: string, id: string, dto: ReplyTimelineEntryDto): Promise<TimelineEntryDto> {
    const entry = await this.requireEntry(userId, id);

    if (entry.sourceType !== TimelineSourceType.MANUAL) {
      throw new ForbiddenException({
        code: 'CANNOT_REPLY_ORDER_ENTRY',
        message: '只能回复手动补记的条目',
      });
    }
    if (entry.customerUserId === userId) {
      throw new ForbiddenException({
        code: 'CANNOT_REPLY_OWN_ENTRY',
        message: '不能回复自己创建的条目',
      });
    }
    if (entry.chefComment) {
      throw new ForbiddenException({
        code: 'ALREADY_REPLIED',
        message: '该条目已经回复过了',
      });
    }

    const updated = await this.prisma.timelineEntry.update({
      where: { id: entry.id },
      data: {
        chefUserId: userId,
        chefComment: dto.comment,
      },
      include: {
        customerUser: { select: { nickname: true } },
        chefUser: { select: { nickname: true } },
      },
    });
    return this.toDto(updated, userId);
  }

  async hide(userId: string, id: string): Promise<TimelineEntryDto> {
    const entry = await this.requireEntry(userId, id);
    const updated = await this.prisma.timelineEntry.update({
      where: { id: entry.id },
      data: { hiddenByUserId: userId },
    });
    return this.toDto(updated, userId);
  }

  async unhide(userId: string, id: string): Promise<TimelineEntryDto> {
    const entry = await this.requireEntry(userId, id);
    if (entry.hiddenByUserId !== userId) return this.toDto(entry, userId);
    const updated = await this.prisma.timelineEntry.update({
      where: { id: entry.id },
      data: { hiddenByUserId: null },
    });
    return this.toDto(updated, userId);
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    const entry = await this.requireEntry(userId, id);
    if (entry.sourceType !== TimelineSourceType.MANUAL) {
      throw new ForbiddenException({
        code: 'CANNOT_DELETE_ORDER_ENTRY',
        message: '订单生成的条目不能删除，只能隐藏',
      });
    }
    await this.prisma.timelineEntry.delete({ where: { id: entry.id } });
    return { id: entry.id, deleted: true };
  }

  /**
   * 月度回顾。
   * 聚合本月（或指定月）家庭维度的：
   *   - 已完成订单数
   *   - 平均评分
   *   - 厨师爱心币总额
   *   - Top 5 最常做的菜
   *   - 双方贡献（做菜数 / 点菜数）
   *   - 当月解锁徽章 keys
   */
  async monthlySummary(userId: string, month?: string): Promise<MonthlySummaryDto> {
    const familyId = await requireFamilyId(this.prisma, userId);
    const { start, end, label } = parseMonth(month);

    const completedOrders = await this.prisma.order.findMany({
      where: {
        familyId,
        status: OrderStatus.COMPLETED,
        completedAt: { gte: start, lt: end },
      },
      include: {
        items: true,
        rating: true,
      },
    });

    const totalOrders = completedOrders.length;
    const ratingSum = completedOrders.reduce((s, o) => (o.rating ? s + o.rating.stars : s), 0);
    const ratingCount = completedOrders.filter((o) => o.rating).length;
    const avgRating = ratingCount === 0 ? null : Math.round((ratingSum / ratingCount) * 100) / 100;

    const totalLovePoints = completedOrders.reduce((s, o) => s + o.totalLovePoints, 0);

    // 菜品聚合
    const dishCount = new Map<string, { count: number; recipeId: string | null }>();
    for (const order of completedOrders) {
      for (const item of order.items) {
        const snap = (item.recipeSnapshot ?? {}) as Record<string, unknown>;
        const name = String(snap.name ?? '未命名');
        const prev = dishCount.get(name);
        if (prev) {
          prev.count += 1;
        } else {
          dishCount.set(name, { count: 1, recipeId: item.recipeId });
        }
      }
    }
    const topRecipes = Array.from(dishCount.entries())
      .map(([name, info]) => ({
        recipeName: name,
        recipeId: info.recipeId,
        count: info.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 贡献度聚合
    const userIds = new Set<string>();
    for (const o of completedOrders) {
      userIds.add(o.customerUserId);
      userIds.add(o.chefUserId);
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, nickname: true },
    });
    const userNameMap = new Map(users.map((u) => [u.id, u.nickname]));
    const contributorsMap = new Map<
      string,
      { userId: string; cookedCount: number; orderedCount: number }
    >();
    for (const o of completedOrders) {
      const chef = contributorsMap.get(o.chefUserId) ?? {
        userId: o.chefUserId,
        cookedCount: 0,
        orderedCount: 0,
      };
      chef.cookedCount += 1;
      contributorsMap.set(o.chefUserId, chef);

      const customer = contributorsMap.get(o.customerUserId) ?? {
        userId: o.customerUserId,
        cookedCount: 0,
        orderedCount: 0,
      };
      customer.orderedCount += 1;
      contributorsMap.set(o.customerUserId, customer);
    }
    const contributors = Array.from(contributorsMap.values()).map((c) => ({
      userId: c.userId,
      nickname: userNameMap.get(c.userId) ?? '未知',
      cookedCount: c.cookedCount,
      orderedCount: c.orderedCount,
    }));

    // 当月徽章
    const familyMemberIds = await this.prisma.familyMember.findMany({
      where: { familyId, leftAt: null },
      select: { userId: true },
    });
    const memberIds = familyMemberIds.map((m) => m.userId);
    const achievements = await this.prisma.achievement.findMany({
      where: {
        OR: [
          { ownerType: AchievementOwnerType.FAMILY, ownerId: familyId },
          {
            ownerType: AchievementOwnerType.USER,
            ownerId: { in: memberIds },
          },
        ],
        unlockedAt: { gte: start, lt: end },
      },
      select: { badgeKey: true },
    });
    const unlockedBadgeKeys = Array.from(new Set(achievements.map((a) => a.badgeKey)));

    return {
      month: label,
      totalOrders,
      avgRating,
      totalLovePoints,
      topRecipes,
      contributors,
      unlockedBadgeKeys,
    };
  }

  /** 内部接口：订单评价完成时调用，生成时间线条目 */
  async createFromOrder(input: CreateFromOrderInput, tx?: TxClient): Promise<TimelineEntry> {
    const client = tx ?? (this.prisma as unknown as TxClient);
    return client.timelineEntry.create({
      data: {
        familyId: input.familyId,
        sourceType: TimelineSourceType.ORDER,
        sourceOrderId: input.orderId,
        occurredAt: input.occurredAt,
        imageUrls: (input.imageUrls ?? []) as unknown as Prisma.InputJsonValue,
        customerUserId: input.customerUserId,
        chefUserId: input.chefUserId,
        customerComment: input.customerComment ?? null,
        chefComment: input.chefComment ?? null,
      },
    });
  }

  // ---- internal ----

  private async requireEntry(userId: string, id: string): Promise<TimelineEntry> {
    const familyId = await requireFamilyId(this.prisma, userId);
    const entry = await this.prisma.timelineEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException({
        code: 'TIMELINE_ENTRY_NOT_FOUND',
        message: '条目不存在',
      });
    }
    if (entry.familyId !== familyId) {
      throw new ForbiddenException({
        code: 'TIMELINE_ENTRY_NOT_IN_YOUR_FAMILY',
        message: '不能操作其他家庭的时间线',
      });
    }
    return entry;
  }

  private toDto(
    entry: TimelineEntry & {
      customerUser?: { nickname: string } | null;
      chefUser?: { nickname: string } | null;
    },
    viewerUserId: string,
  ): TimelineEntryDto {
    return {
      id: entry.id,
      sourceType: entry.sourceType,
      sourceOrderId: entry.sourceOrderId,
      occurredAt: entry.occurredAt,
      imageUrls: Array.isArray(entry.imageUrls) ? (entry.imageUrls as string[]) : [],
      customerUserId: entry.customerUserId,
      customerNickname: entry.customerUser?.nickname ?? null,
      chefUserId: entry.chefUserId,
      chefNickname: entry.chefUser?.nickname ?? null,
      customerComment: entry.customerComment,
      chefComment: entry.chefComment,
      hiddenForMe: entry.hiddenByUserId === viewerUserId,
      createdAt: entry.createdAt,
    };
  }
}

function parseMonth(month: string | undefined): {
  start: Date;
  end: Date;
  label: string;
} {
  const now = new Date();
  let year: number;
  let monthZeroBased: number;
  if (month) {
    const [y, m] = month.split('-').map(Number);
    year = y!;
    monthZeroBased = m! - 1;
  } else {
    year = now.getFullYear();
    monthZeroBased = now.getMonth();
  }
  const start = new Date(year, monthZeroBased, 1, 0, 0, 0, 0);
  const end = new Date(year, monthZeroBased + 1, 1, 0, 0, 0, 0);
  const label = `${year}-${String(monthZeroBased + 1).padStart(2, '0')}`;
  return { start, end, label };
}
