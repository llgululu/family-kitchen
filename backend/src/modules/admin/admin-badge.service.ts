import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, type PaginatedResponseDto } from '../../common/pagination.dto';
import { AchievementService } from '../achievement/achievement.service';

export interface BadgeListItem {
  id: string;
  key: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  ownerType: string;
  triggerType: string;
  evaluatorType: string;
  evaluatorConfig: unknown;
  hidden: boolean;
  progressTarget: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  unlockCount: number;
}

export interface BadgeQueryDto {
  page?: number;
  pageSize?: number;
  category?: string;
  isActive?: boolean;
  search?: string;
  get skip(): number;
  get take(): number;
}

export class BadgeQueryDtoImpl implements BadgeQueryDto {
  constructor(
    public page = 1,
    public pageSize = 20,
    public category?: string,
    public isActive?: boolean,
    public search?: string,
  ) {}

  get skip() {
    return (this.page - 1) * this.pageSize;
  }
  get take() {
    return this.pageSize;
  }
}

export interface CreateBadgeDto {
  key: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  ownerType: string;
  triggerType: string;
  evaluatorType: string;
  evaluatorConfig: Record<string, unknown>;
  hidden?: boolean;
  progressTarget?: number | null;
  sortOrder?: number;
}

export interface UpdateBadgeDto {
  title?: string;
  description?: string;
  emoji?: string;
  category?: string;
  ownerType?: string;
  triggerType?: string;
  evaluatorType?: string;
  evaluatorConfig?: Record<string, unknown>;
  hidden?: boolean;
  progressTarget?: number | null;
  sortOrder?: number;
}

@Injectable()
export class AdminBadgeService {
  private readonly logger = new Logger(AdminBadgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementService: AchievementService,
  ) {}

  async list(query: BadgeQueryDto): Promise<PaginatedResponseDto<BadgeListItem>> {
    const where: Prisma.BadgeDefinitionWhereInput = {};
    if (query.category) where.category = query.category;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { key: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.badgeDefinition.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: query.skip,
        take: query.take,
        include: { _count: { select: { achievements: true } } },
      }),
      this.prisma.badgeDefinition.count({ where }),
    ]);

    return paginate(
      items.map((item) => ({
        ...item,
        unlockCount: item._count.achievements,
      })),
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  async get(key: string) {
    const badge = await this.prisma.badgeDefinition.findUnique({
      where: { key },
      include: { _count: { select: { achievements: true } } },
    });
    if (!badge) {
      throw new NotFoundException({ code: 'BADGE_NOT_FOUND', message: '徽章不存在' });
    }
    return { ...badge, unlockCount: badge._count.achievements };
  }

  async create(dto: CreateBadgeDto) {
    // 检查 key 唯一性
    const existing = await this.prisma.badgeDefinition.findUnique({ where: { key: dto.key } });
    if (existing) {
      throw new BadRequestException({ code: 'BADGE_KEY_EXISTS', message: '徽章 key 已存在' });
    }
    const result = await this.prisma.badgeDefinition.create({
      data: {
        key: dto.key,
        title: dto.title,
        description: dto.description,
        emoji: dto.emoji,
        category: dto.category,
        ownerType: dto.ownerType,
        triggerType: dto.triggerType,
        evaluatorType: dto.evaluatorType,
        evaluatorConfig: dto.evaluatorConfig as Prisma.InputJsonValue,
        hidden: dto.hidden ?? false,
        progressTarget: dto.progressTarget ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    this.achievementService.clearBadgeCache();
    return result;
  }

  async update(key: string, dto: UpdateBadgeDto) {
    await this.requireBadge(key);
    const result = await this.prisma.badgeDefinition.update({
      where: { key },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.emoji !== undefined ? { emoji: dto.emoji } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.ownerType !== undefined ? { ownerType: dto.ownerType } : {}),
        ...(dto.triggerType !== undefined ? { triggerType: dto.triggerType } : {}),
        ...(dto.evaluatorType !== undefined ? { evaluatorType: dto.evaluatorType } : {}),
        ...(dto.evaluatorConfig !== undefined
          ? { evaluatorConfig: dto.evaluatorConfig as Prisma.InputJsonValue }
          : {}),
        ...(dto.hidden !== undefined ? { hidden: dto.hidden } : {}),
        ...(dto.progressTarget !== undefined ? { progressTarget: dto.progressTarget } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    this.achievementService.clearBadgeCache();
    return result;
  }

  async toggle(key: string) {
    const badge = await this.requireBadge(key);
    const result = await this.prisma.badgeDefinition.update({
      where: { key },
      data: { isActive: !badge.isActive },
    });
    this.achievementService.clearBadgeCache();
    return result;
  }

  async remove(key: string) {
    await this.requireBadge(key);
    // 检查是否有关联成就
    const count = await this.prisma.achievement.count({
      where: { badgeKey: key },
    });
    const result =
      count > 0
        ? await this.prisma.badgeDefinition.update({
            where: { key },
            data: { isActive: false },
          })
        : await this.prisma.badgeDefinition.delete({ where: { key } });
    this.achievementService.clearBadgeCache();
    return result;
  }

  async getStats(key: string) {
    await this.requireBadge(key);
    const [total, byOwnerType] = await Promise.all([
      this.prisma.achievement.count({ where: { badgeKey: key } }),
      this.prisma.achievement.groupBy({
        by: ['ownerType'],
        where: { badgeKey: key },
        _count: { id: true },
      }),
    ]);
    return {
      badgeKey: key,
      totalUnlocked: total,
      byOwnerType: byOwnerType.map((g) => ({
        ownerType: g.ownerType,
        count: g._count.id,
      })),
    };
  }

  /** 重新执行种子数据 */
  async seed() {
    const { execSync } = require('child_process');
    try {
      execSync('npx ts-node prisma/seed-badges.ts', {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 30000,
      });
      return { success: true, message: '种子数据执行完成' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException({
        code: 'SEED_FAILED',
        message: `种子数据执行失败: ${message}`,
      });
    }
  }

  private async requireBadge(key: string) {
    const badge = await this.prisma.badgeDefinition.findUnique({ where: { key } });
    if (!badge) {
      throw new NotFoundException({ code: 'BADGE_NOT_FOUND', message: '徽章不存在' });
    }
    return badge;
  }
}
