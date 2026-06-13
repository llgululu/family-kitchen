import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AchievementOwnerType } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, type PaginatedResponseDto } from '../../common/pagination.dto';
import type { PaginationQueryDto } from '../../common/pagination.dto';
import type {
  AdminFamilyDetailDto,
  AdminFamilyQueryDto,
  AdminFamilySummaryDto,
} from './dto/admin-resource.dto';

@Injectable()
export class AdminFamilyService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminFamilyQueryDto): Promise<PaginatedResponseDto<AdminFamilySummaryDto>> {
    const where: Prisma.FamilyWhereInput = {};
    if (query.statuses?.length) where.status = { in: query.statuses };
    if (query.search) {
      where.OR = [{ name: { contains: query.search } }, { inviteCode: { contains: query.search } }];
    }
    const [families, total] = await this.prisma.$transaction([
      this.prisma.family.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: {
          _count: { select: { members: true, orders: true } },
        },
      }),
      this.prisma.family.count({ where }),
    ]);
    return paginate(
      families.map((f) => ({
        id: f.id,
        name: f.name,
        status: f.status,
        memberCount: f._count.members,
        orderCount: f._count.orders,
        createdAt: f.createdAt,
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  async detail(id: string): Promise<AdminFamilyDetailDto> {
    const family = await this.prisma.family.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { nickname: true, avatarUrl: true, gender: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, status: true, createdAt: true },
        },
        _count: { select: { members: true, orders: true } },
      },
    });
    if (!family) {
      throw new NotFoundException({
        code: 'FAMILY_NOT_FOUND',
        message: '家庭空间不存在',
      });
    }
    return {
      id: family.id,
      name: family.name,
      status: family.status,
      memberCount: family._count.members,
      orderCount: family._count.orders,
      createdAt: family.createdAt,
      members: family.members.map((m) => ({
        userId: m.userId,
        nickname: m.user.nickname,
        avatarUrl: m.user.avatarUrl,
        gender: m.user.gender,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      recentOrders: family.orders,
    };
  }

  /** 家庭爱心币账本（跨成员） */
  async listLedger(familyId: string, query: PaginationQueryDto) {
    await this.requireFamily(familyId);
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.lovePointLog.findMany({
        where: { familyId },
        include: { user: { select: { nickname: true } } },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.lovePointLog.count({ where: { familyId } }),
    ]);
    return paginate(
      logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        userNickname: l.user.nickname,
        changeAmount: l.changeAmount,
        balanceAfter: l.balanceAfter,
        changeType: l.changeType,
        sourceOrderId: l.sourceOrderId,
        description: l.description,
        isReversed: l.isReversed,
        createdAt: l.createdAt,
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  /** 家庭菜谱 */
  async listRecipes(familyId: string, query: PaginationQueryDto) {
    await this.requireFamily(familyId);
    const [recipes, total] = await this.prisma.$transaction([
      this.prisma.recipe.findMany({
        where: { familyId },
        orderBy: { updatedAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.recipe.count({ where: { familyId } }),
    ]);
    return paginate(
      recipes.map((r) => ({
        id: r.id,
        name: r.name,
        difficulty: r.difficulty,
        mealTags: Array.isArray(r.mealTags) ? (r.mealTags as string[]) : [],
        flavorTags: Array.isArray(r.flavorTags) ? (r.flavorTags as string[]) : [],
        isDeleted: r.isDeleted,
        orderCount: r.orderCount,
        avgRating: r.avgRating,
        updatedAt: r.updatedAt,
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  /** 家庭维度成就 */
  async listAchievements(familyId: string) {
    await this.requireFamily(familyId);
    return this.prisma.achievement.findMany({
      where: { ownerType: AchievementOwnerType.FAMILY, ownerId: familyId },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  private async requireFamily(id: string): Promise<void> {
    const family = await this.prisma.family.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!family) {
      throw new NotFoundException({
        code: 'FAMILY_NOT_FOUND',
        message: '家庭空间不存在',
      });
    }
  }
}
