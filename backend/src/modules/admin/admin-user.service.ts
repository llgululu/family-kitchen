import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AchievementOwnerType } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, type PaginatedResponseDto } from '../../common/pagination.dto';
import type { PaginationQueryDto } from '../../common/pagination.dto';
import type {
  AdminOrderSummaryDto,
  AdminUserDetailDto,
  AdminUserQueryDto,
  AdminUserSummaryDto,
} from './dto/admin-resource.dto';

@Injectable()
export class AdminUserService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminUserQueryDto): Promise<PaginatedResponseDto<AdminUserSummaryDto>> {
    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      where.nickname = { contains: query.search };
    }
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: {
          _count: {
            select: {
              ordersAsCustomer: true,
              ordersAsChef: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(
      users.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        avatarUrl: u.avatarUrl,
        gender: u.gender,
        currentFamilyId: u.currentFamilyId,
        orderCount: u._count.ordersAsCustomer + u._count.ordersAsChef,
        createdAt: u.createdAt,
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  async detail(id: string): Promise<AdminUserDetailDto & { deletedAt: Date | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            ordersAsCustomer: true,
            ordersAsChef: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '用户不存在' });
    }
    const [latestLog, achievementCount] = await Promise.all([
      this.prisma.lovePointLog.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      }),
      this.prisma.achievement.count({
        where: { ownerType: AchievementOwnerType.USER, ownerId: user.id },
      }),
    ]);
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      phone: maskPhone(user.phone),
      signature: user.signature,
      currentFamilyId: user.currentFamilyId,
      orderCount: user._count.ordersAsCustomer + user._count.ordersAsChef,
      createdAt: user.createdAt,
      lovePointBalance: latestLog?.balanceAfter ?? 0,
      achievementCount,
      deletedAt: user.deletedAt,
    };
  }

  /** 用户的爱心币流水（admin 视角） */
  async listLovePointLogs(userId: string, query: PaginationQueryDto) {
    await this.requireUser(userId);
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.lovePointLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.lovePointLog.count({ where: { userId } }),
    ]);
    return paginate(
      logs.map((l) => ({
        id: l.id,
        familyId: l.familyId,
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

  /** 用户的个人成就 */
  async listAchievements(userId: string) {
    await this.requireUser(userId);
    return this.prisma.achievement.findMany({
      where: { ownerType: AchievementOwnerType.USER, ownerId: userId },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  /** 用户参与的订单（食客或厨师） */
  async listOrders(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<AdminOrderSummaryDto & { roleInOrder: 'customer' | 'chef' }>> {
    await this.requireUser(userId);
    const where: Prisma.OrderWhereInput = {
      OR: [{ customerUserId: userId }, { chefUserId: userId }],
    };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(
      orders.map((o) => ({
        id: o.id,
        familyId: o.familyId,
        customerUserId: o.customerUserId,
        chefUserId: o.chefUserId,
        status: o.status,
        totalLovePoints: o.totalLovePoints,
        createdAt: o.createdAt,
        completedAt: o.completedAt,
        roleInOrder: o.customerUserId === userId ? ('customer' as const) : ('chef' as const),
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  private async requireUser(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '用户不存在' });
    }
  }
}

/** 138****1234 */
function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  if (phone.length < 7) return phone.slice(0, 2) + '****';
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
