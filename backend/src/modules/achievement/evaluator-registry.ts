import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaDelegate = {
  count: (args: { where: unknown }) => Promise<number>;
  findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
};

/**
 * 评估器上下文 —— 包含触发事件时传入的全部信息。
 * 不同 triggerType 会填充不同的字段。
 */
export interface EvaluateContext {
  prisma: PrismaService;
  /** 触发事件的用户 ID */
  userId: string;
  /** 用户所在家庭 ID */
  familyId: string;
  /** 触发事件类型 */
  triggerType: string;

  // ── order 相关（order_rated / order_served / order_created）──
  order?: {
    id: string;
    familyId: string;
    customerUserId: string;
    chefUserId: string;
    acceptedAt?: Date | null;
    servedAt?: Date | null;
    completedAt?: Date | null;
    items?: Array<{ recipeId: string | null; recipeSnapshot: unknown }>;
  };
  stars?: number;
  comment?: string | null;

  // ── recipe 相关 ──
  recipe?: { id: string; familyId: string; createdByUserId: string };

  // ── message 相关 ──
  message?: {
    id: string;
    orderId: string;
    type: string;
    content: Record<string, unknown>;
    senderUserId: string;
  };

  // ── tip / love point 相关 ──
  amount?: number;
  changeType?: string;

  // ── family 相关 ──
  family?: { id: string; createdAt: Date };
}

export interface EvaluateResult {
  /** 是否满足条件 */
  matched: boolean;
  /** 匹配时的 ownerId（user 维度=userId, family 维度=familyId） */
  ownerId: string;
  /** 进度当前值（用于进度条） */
  current?: number;
  /** metadata 快照 */
  metadata?: Record<string, unknown>;
}

export type EvaluatorFn = (
  ctx: EvaluateContext,
  config: Record<string, unknown>,
  ownerType: string,
) => Promise<EvaluateResult | null>;

/**
 * 构建通用 where 条件，根据 model 和 scopeBy 字段确定统计维度。
 */
function buildScopeWhere(
  model: string,
  scopeBy: string,
  scopeValue: string,
  filters: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const where: Record<string, unknown> = { [scopeBy]: scopeValue, ...filters, ...extra };
  return where;
}

@Injectable()
export class EvaluatorRegistry {
  private readonly logger = new Logger(EvaluatorRegistry.name);
  private readonly evaluators = new Map<string, EvaluatorFn>();

  constructor(private readonly prisma: PrismaService) {
    this.register('count', this.evaluateCount.bind(this));
    this.register('streak', this.evaluateStreak.bind(this));
    this.register('sum', this.evaluateSum.bind(this));
    this.register('time_check', this.evaluateTimeCheck.bind(this));
    this.register('special_date', this.evaluateSpecialDate.bind(this));
    this.register('family_age', this.evaluateFamilyAge.bind(this));
    this.register('recipe_stat', this.evaluateRecipeStat.bind(this));
    this.register('first_time', this.evaluateFirstTime.bind(this));
    this.register('message_distinct', this.evaluateMessageDistinct.bind(this));
    this.register('no_action', this.evaluateNoAction.bind(this));
    this.register('both_members', this.evaluateBothMembers.bind(this));
  }

  register(type: string, fn: EvaluatorFn): void {
    this.evaluators.set(type, fn);
  }

  get(type: string): EvaluatorFn | undefined {
    return this.evaluators.get(type);
  }

  // ================================================================
  // 评估器实现
  // ================================================================

  /**
   * count: 计数达到阈值
   * config: { model, filters?, scopeBy, threshold, itemFilter?, sameDay? }
   */
  private async evaluateCount(
    ctx: EvaluateContext,
    config: Record<string, unknown>,
    ownerType: string,
  ): Promise<EvaluateResult | null> {
    const model = String(config.model);
    const scopeBy = String(config.scopeBy);
    const threshold = Number(config.threshold);
    const filters = (config.filters ?? {}) as Record<string, unknown>;
    const itemFilter = config.itemFilter as Record<string, unknown> | undefined;
    const sameDay = config.sameDay as string | undefined;

    const scopeValue = ownerType === 'user' ? ctx.userId : ctx.familyId;
    // 对于 chef/customer 维度，scopeBy 可能是 chefUserId/customerUserId
    const actualScopeValue = this.resolveScopeValue(ctx, scopeBy, ownerType);

    const extra: Record<string, unknown> = {};
    if (sameDay && ctx.order) {
      const dateField = sameDay;
      const dateValue = (ctx.order as unknown as Record<string, unknown>)[dateField];
      if (dateValue) {
        const d = new Date(dateValue as Date);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const end = new Date(start.getTime() + 86400000);
        extra[dateField] = { gte: start, lt: end };
      }
    }

    const where = buildScopeWhere(model, scopeBy, actualScopeValue, filters, extra);

    // 特殊处理 itemFilter: 需要筛选 order items 的菜谱难度
    if (itemFilter && ctx.order?.items) {
      return this.evaluateCountWithItemFilter(ctx, config, ownerType, itemFilter);
    }

    const count = await this.countModel(model, where);

    if (count >= threshold) {
      return { matched: true, ownerId: scopeValue, current: count, metadata: { count } };
    }

    // 未匹配但返回进度信息
    if (ownerType === this.inferOwnerType(scopeBy, ctx)) {
      return { matched: false, ownerId: scopeValue, current: count };
    }
    return null;
  }

  /**
   * streak: 连续 N 条记录满足条件
   * config: { model, scopeBy, check, length, include? }
   */
  private async evaluateStreak(
    ctx: EvaluateContext,
    config: Record<string, unknown>,
    ownerType: string,
  ): Promise<EvaluateResult | null> {
    const model = String(config.model);
    const scopeBy = String(config.scopeBy);
    const length = Number(config.length);
    const check = String(config.check);
    const include = (config.include ?? 'rating') as string;
    const filters = (config.filters ?? {}) as Record<string, unknown>;

    const actualScopeValue = this.resolveScopeValue(ctx, scopeBy, ownerType);
    const scopeValue = ownerType === 'user' ? ctx.userId : ctx.familyId;

    const where = buildScopeWhere(model, scopeBy, actualScopeValue, filters);

    const records = await this.findManyModel(model, where, { completedAt: 'desc' }, length, [
      include,
    ]);

    if (records.length < length) {
      return { matched: false, ownerId: scopeValue, current: records.length };
    }

    // 检查连续条件
    let allMatch = true;
    for (const record of records) {
      if (!this.checkCondition(check, record)) {
        allMatch = false;
        break;
      }
    }

    if (allMatch) {
      return { matched: true, ownerId: scopeValue, current: length, metadata: { streak: length } };
    }

    // 计算当前连续数
    let currentStreak = 0;
    for (const record of records) {
      if (this.checkCondition(check, record)) {
        currentStreak++;
      } else {
        break;
      }
    }

    return { matched: false, ownerId: scopeValue, current: currentStreak };
  }

  /**
   * sum: 聚合求和达到阈值
   * config: { model, scopeBy, filters?, sumField, threshold }
   */
  private async evaluateSum(
    ctx: EvaluateContext,
    config: Record<string, unknown>,
    ownerType: string,
  ): Promise<EvaluateResult | null> {
    const model = String(config.model);
    const scopeBy = String(config.scopeBy);
    const sumField = String(config.sumField);
    const threshold = Number(config.threshold);
    const filters = (config.filters ?? {}) as Record<string, unknown>;

    const actualScopeValue = this.resolveScopeValue(ctx, scopeBy, ownerType);
    const scopeValue = ownerType === 'user' ? ctx.userId : ctx.familyId;

    const where = buildScopeWhere(model, scopeBy, actualScopeValue, filters);

    const result = await this.aggregateSum(model, sumField, where);

    if (result >= threshold) {
      return { matched: true, ownerId: scopeValue, current: result, metadata: { total: result } };
    }

    return { matched: false, ownerId: scopeValue, current: result };
  }

  /**
   * time_check: 时间字段在指定时段 / 两个时间差在范围内
   * config: { field, hourRange?: {start, end}, withinMinutesFrom?: string, maxMinutes?: number }
   */
  private async evaluateTimeCheck(
    ctx: EvaluateContext,
    config: Record<string, unknown>,
    ownerType: string,
  ): Promise<EvaluateResult | null> {
    const scopeValue = ownerType === 'user' ? ctx.userId : ctx.familyId;

    // hourRange 检查（如深夜食堂）
    if (config.hourRange) {
      const field = String(config.field);
      const hourRange = config.hourRange as { start: number; end: number };
      const fieldValue = this.getContextFieldValue(ctx, field);

      if (!fieldValue) return { matched: false, ownerId: scopeValue, current: 0 };

      const hour = new Date(fieldValue as Date).getHours();
      const { start, end } = hourRange;

      const inRange =
        start > end
          ? hour >= start || hour < end // 跨午夜
          : hour >= start && hour < end;

      return { matched: inRange, ownerId: scopeValue, current: inRange ? 1 : 0 };
    }

    // withinMinutesFrom 检查（如闪电大厨）
    if (config.withinMinutesFrom && config.maxMinutes) {
      const field = String(config.field);
      const fromField = String(config.withinMinutesFrom);
      const maxMinutes = Number(config.maxMinutes);

      const to = this.getContextFieldValue(ctx, field) as Date | undefined;
      const from = this.getContextFieldValue(ctx, fromField) as Date | undefined;

      if (!to || !from) return { matched: false, ownerId: scopeValue, current: 0 };

      const diffMs = new Date(to).getTime() - new Date(from).getTime();
      const diffMin = diffMs / 60000;
      const matched = diffMin <= maxMinutes;

      return {
        matched,
        ownerId: scopeValue,
        current: matched ? 1 : 0,
        metadata: { minutes: Math.round(diffMin) },
      };
    }

    return null;
  }

  /**
   * special_date: 日期匹配特定节日
   * config: { field, dates: string[] }
   */
  private async evaluateSpecialDate(
    ctx: EvaluateContext,
    config: Record<string, unknown>,
    ownerType: string,
  ): Promise<EvaluateResult | null> {
    const field = String(config.field);
    const dates = config.dates as string[];
    const scopeValue = ownerType === 'user' ? ctx.userId : ctx.familyId;

    const fieldValue = this.getContextFieldValue(ctx, field) as Date | undefined;
    if (!fieldValue) return { matched: false, ownerId: scopeValue, current: 0 };

    const d = new Date(fieldValue);
    const monthDay = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (dates.includes(monthDay)) {
      return { matched: true, ownerId: scopeValue, current: 1, metadata: { date: monthDay } };
    }

    // 动态节日检查（如中秋节）
    if (dates.includes('dynamic_mid_autumn') && this.isMidAutumn(d)) {
      return { matched: true, ownerId: scopeValue, current: 1, metadata: { date: 'mid_autumn' } };
    }

    return { matched: false, ownerId: scopeValue, current: 0 };
  }

  /**
   * family_age: 家庭创建满 N 天
   * config: { minDays }
   */
  private async evaluateFamilyAge(
    ctx: EvaluateContext,
    config: Record<string, unknown>,
    ownerType: string,
  ): Promise<EvaluateResult | null> {
    const minDays = Number(config.minDays);
    const family =
      ctx.family ?? (await ctx.prisma.family.findUnique({ where: { id: ctx.familyId } }));
    if (!family) return null;

    const days = Math.floor((Date.now() - new Date(family.createdAt).getTime()) / 86400000);

    if (days >= minDays) {
      return { matched: true, ownerId: ctx.familyId, current: days, metadata: { days } };
    }

    return { matched: false, ownerId: ctx.familyId, current: days };
  }

  /**
   * recipe_stat: 某菜谱的统计值达标
   * config: { statField, threshold, minOrderCount? }
   */
  private async evaluateRecipeStat(
    ctx: EvaluateContext,
    config: Record<string, unknown>,
    ownerType: string,
  ): Promise<EvaluateResult | null> {
    const statField = String(config.statField);
    const threshold = Number(config.threshold);
    const minOrderCount = config.minOrderCount as number | undefined;

    // 查找当前订单涉及的菜谱中是否有达标的
    const items = ctx.order?.items ?? [];
    for (const item of items) {
      if (!item.recipeId) continue;
      const recipe = await ctx.prisma.recipe.findUnique({ where: { id: item.recipeId } });
      if (!recipe) continue;

      if (minOrderCount && recipe.orderCount < minOrderCount) continue;

      const value = Number((recipe as unknown as Record<string, unknown>)[statField]);
      if (statField === 'orderCount' && value >= threshold) {
        return {
          matched: true,
          ownerId: ctx.familyId,
          current: value,
          metadata: { recipeId: recipe.id, recipeName: recipe.name, value },
        };
      }
      if (statField === 'avgRating' && value >= threshold) {
        return {
          matched: true,
          ownerId: ctx.familyId,
          current: value,
          metadata: { recipeId: recipe.id, recipeName: recipe.name, value },
        };
      }
    }

    return { matched: false, ownerId: ctx.familyId, current: 0 };
  }

  /**
   * first_time: 首次触发某事件（count=1）
   * config: { model, scopeBy, filters? }
   */
  private async evaluateFirstTime(
    ctx: EvaluateContext,
    config: Record<string, unknown>,
    ownerType: string,
  ): Promise<EvaluateResult | null> {
    const model = String(config.model);
    const scopeBy = String(config.scopeBy);
    const filters = (config.filters ?? {}) as Record<string, unknown>;

    const actualScopeValue = this.resolveScopeValue(ctx, scopeBy, ownerType);
    const scopeValue = ownerType === 'user' ? ctx.userId : ctx.familyId;

    const where = buildScopeWhere(model, scopeBy, actualScopeValue, filters);
    const count = await this.countModel(model, where);

    if (count === 1) {
      return { matched: true, ownerId: scopeValue, current: 1 };
    }

    return { matched: false, ownerId: scopeValue, current: count };
  }

  /**
   * message_distinct: 使用了 N 种不同值
   * config: { model, scopeBy, filters?, distinctField, totalCount }
   */
  private async evaluateMessageDistinct(
    ctx: EvaluateContext,
    config: Record<string, unknown>,
    ownerType: string,
  ): Promise<EvaluateResult | null> {
    const model = String(config.model);
    const scopeBy = String(config.scopeBy);
    const filters = (config.filters ?? {}) as Record<string, unknown>;
    const distinctField = String(config.distinctField);
    const totalCount = Number(config.totalCount);

    const actualScopeValue = this.resolveScopeValue(ctx, scopeBy, ownerType);
    const scopeValue = ownerType === 'user' ? ctx.userId : ctx.familyId;

    const where = buildScopeWhere(model, scopeBy, actualScopeValue, filters);

    // For message_distinct, we need to find distinct values of a field
    // distinctField like 'content.emojiKey' means we group by the content JSON field
    const records = await this.findManyModel(model, where, { createdAt: 'desc' }, 1000, []);

    const distinctValues = new Set<string>();
    for (const record of records) {
      const value = this.getNestedValue(record, distinctField);
      if (value) distinctValues.add(String(value));
    }

    const count = distinctValues.size;

    if (count >= totalCount) {
      return {
        matched: true,
        ownerId: scopeValue,
        current: count,
        metadata: { distinctCount: count },
      };
    }

    return { matched: false, ownerId: scopeValue, current: count };
  }

  /**
   * no_action: 完成 N 次但无某行为
   * config: { countModel, countScopeBy, countFilters?, countThreshold, excludeModel, excludeFilters?, excludeScopeBy }
   */
  private async evaluateNoAction(
    ctx: EvaluateContext,
    config: Record<string, unknown>,
    ownerType: string,
  ): Promise<EvaluateResult | null> {
    const countModel = String(config.countModel);
    const countScopeBy = String(config.countScopeBy);
    const countFilters = (config.countFilters ?? {}) as Record<string, unknown>;
    const countThreshold = Number(config.countThreshold);
    const excludeModel = String(config.excludeModel);
    const excludeFilters = (config.excludeFilters ?? {}) as Record<string, unknown>;
    const excludeScopeBy = String(config.excludeScopeBy);

    const scopeValue = ownerType === 'user' ? ctx.userId : ctx.familyId;

    // 先查完成数
    const countWhere = buildScopeWhere(countModel, countScopeBy, scopeValue, countFilters);
    const count = await this.countModel(countModel, countWhere);

    if (count < countThreshold) {
      return { matched: false, ownerId: scopeValue, current: count };
    }

    // 查这些订单中是否有被排除的行为
    // 获取已完成订单的 ID
    const orders = await this.findManyModel(
      countModel,
      countWhere,
      { createdAt: 'desc' },
      countThreshold,
      [],
    );
    const orderIds = orders.map((o) => String(o.id));

    const excludeCount = await this.countModel(excludeModel, {
      [excludeScopeBy]: { in: orderIds },
      ...excludeFilters,
    });

    if (excludeCount === 0) {
      return {
        matched: true,
        ownerId: scopeValue,
        current: count,
        metadata: { orderCount: count },
      };
    }

    return { matched: false, ownerId: scopeValue, current: count };
  }

  /**
   * both_members: 家庭双方各完成至少 N 次
   * config: { threshold }
   */
  private async evaluateBothMembers(
    ctx: EvaluateContext,
    config: Record<string, unknown>,
    ownerType: string,
  ): Promise<EvaluateResult | null> {
    const threshold = Number(config.threshold);

    // 获取家庭成员
    const members = await ctx.prisma.familyMember.findMany({
      where: { familyId: ctx.familyId, leftAt: null },
    });

    if (members.length < 2) return { matched: false, ownerId: ctx.familyId, current: 0 };

    // 检查每个成员的做菜数
    let allMeetThreshold = true;
    let minCount = Infinity;

    for (const member of members) {
      const count = await ctx.prisma.order.count({
        where: { chefUserId: member.userId, familyId: ctx.familyId, status: 'completed' },
      });
      if (count < threshold) allMeetThreshold = false;
      if (count < minCount) minCount = count;
    }

    if (allMeetThreshold) {
      return { matched: true, ownerId: ctx.familyId, current: threshold, metadata: { threshold } };
    }

    return { matched: false, ownerId: ctx.familyId, current: minCount === Infinity ? 0 : minCount };
  }

  // ================================================================
  // 辅助方法
  // ================================================================

  private resolveScopeValue(ctx: EvaluateContext, scopeBy: string, ownerType: string): string {
    // 根据 scopeBy 字段名从 context 中取值
    if (scopeBy === 'chefUserId' && ctx.order) return ctx.order.chefUserId;
    if (scopeBy === 'customerUserId' && ctx.order) return ctx.order.customerUserId;
    if (scopeBy === 'senderUserId' && ctx.message) return ctx.message.senderUserId;
    if (scopeBy === 'raterUserId') return ctx.userId;
    if (scopeBy === 'userId') return ctx.userId;
    if (scopeBy === 'createdByUserId' && ctx.recipe) return ctx.recipe.createdByUserId;
    if (scopeBy === 'familyId') return ctx.familyId;
    // 默认
    return ownerType === 'user' ? ctx.userId : ctx.familyId;
  }

  private inferOwnerType(scopeBy: string, ctx: EvaluateContext): string {
    if (scopeBy === 'familyId') return 'family';
    if (scopeBy === 'chefUserId' || scopeBy === 'customerUserId') {
      // 这些是 user 维度但需要特殊 scopeValue
      return 'user';
    }
    return 'user';
  }

  private getContextFieldValue(ctx: EvaluateContext, field: string): Date | undefined {
    if (field === 'servedAt' && ctx.order) return ctx.order.servedAt ?? undefined;
    if (field === 'completedAt' && ctx.order) return ctx.order.completedAt ?? undefined;
    if (field === 'acceptedAt' && ctx.order) return ctx.order.acceptedAt ?? undefined;
    return undefined;
  }

  private checkCondition(check: string, record: Record<string, unknown>): boolean {
    // 支持 "stars===5" 格式
    const match = check.match(/^(\w+)(===|>=|<=|>|<|!==)(.+)$/);
    if (!match) return false;

    const [, field, op, valueStr] = match;
    const raw = record[field];
    const nested =
      typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).stars : undefined;
    const actual = (raw ?? nested) as number | string;
    const expected = (isNaN(Number(valueStr)) ? valueStr : Number(valueStr)) as number | string;

    switch (op) {
      case '===':
        return actual == expected;
      case '>=':
        return actual >= expected;
      case '<=':
        return actual <= expected;
      case '>':
        return actual > expected;
      case '<':
        return actual < expected;
      case '!==':
        return actual != expected;
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current == null) return null;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private async countModel(model: string, where: Record<string, unknown>): Promise<number> {
    const prisma = this.prisma as unknown as Record<string, PrismaDelegate>;
    if (!prisma[model]) {
      this.logger.warn(`Unknown model: ${model}`);
      return 0;
    }
    return prisma[model].count({ where });
  }

  private async findManyModel(
    model: string,
    where: Record<string, unknown>,
    orderBy: Record<string, string>,
    take: number,
    include: string[],
  ): Promise<Record<string, unknown>[]> {
    const prisma = this.prisma as unknown as Record<string, PrismaDelegate>;
    if (!prisma[model]) {
      this.logger.warn(`Unknown model: ${model}`);
      return [];
    }
    const includeObj: Record<string, boolean> = {};
    for (const inc of include) {
      includeObj[inc] = true;
    }
    return prisma[model].findMany({
      where,
      orderBy,
      take,
      include: Object.keys(includeObj).length > 0 ? includeObj : undefined,
    });
  }

  private async aggregateSum(
    model: string,
    field: string,
    where: Record<string, unknown>,
  ): Promise<number> {
    const prisma = this.prisma as unknown as Record<string, PrismaDelegate>;
    if (!prisma[model]) {
      this.logger.warn(`Unknown model: ${model}`);
      return 0;
    }
    const records = await prisma[model].findMany({ where, select: { [field]: true } });
    return records.reduce((sum: number, r) => sum + (Number(r[field]) || 0), 0);
  }

  /** 简易中秋节日检测（基于农历八月初十五近似） */
  private isMidAutumn(date: Date): boolean {
    const midAutumnDates = [
      '2025-10-06',
      '2026-09-25',
      '2027-09-15',
      '2028-10-03',
      '2029-09-22',
      '2030-09-12',
      '2031-10-01',
      '2032-09-19',
      '2033-09-08',
      '2034-09-27',
      '2035-09-16',
    ];
    const mmdd = `${date.getMonth() + 1}-${date.getDate()}`;
    return midAutumnDates.some((d) => {
      const md = new Date(d);
      return md.getMonth() === date.getMonth() && md.getDate() === date.getDate();
    });
  }

  private async evaluateCountWithItemFilter(
    ctx: EvaluateContext,
    config: Record<string, unknown>,
    ownerType: string,
    itemFilter: Record<string, unknown>,
  ): Promise<EvaluateResult | null> {
    const model = String(config.model);
    const scopeBy = String(config.scopeBy);
    const threshold = Number(config.threshold);
    const filters = (config.filters ?? {}) as Record<string, unknown>;

    const actualScopeValue = this.resolveScopeValue(ctx, scopeBy, ownerType);
    const scopeValue = ownerType === 'user' ? ctx.userId : ctx.familyId;

    // 查找包含特定难度菜品的已完成订单
    const recipeDifficulty = itemFilter.recipeDifficulty as number | undefined;
    if (recipeDifficulty) {
      const orders = await ctx.prisma.order.findMany({
        where: {
          [scopeBy]: actualScopeValue,
          status: 'completed',
          items: {
            some: {
              recipeSnapshot: {
                path: 'difficulty' as const,
                equals: recipeDifficulty,
              },
            },
          },
        },
      });
      const count = orders.length;

      if (count >= threshold) {
        return { matched: true, ownerId: scopeValue, current: count, metadata: { count } };
      }
      return { matched: false, ownerId: scopeValue, current: count };
    }

    return { matched: false, ownerId: scopeValue, current: 0 };
  }
}
