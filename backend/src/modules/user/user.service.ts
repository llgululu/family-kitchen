import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FamilyStatus } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../auth/password.util';
import { WsGateway } from '../ws/ws.gateway';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { BindCredentialsDto } from './dto/bind-credentials.dto';
import type { UserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: WsGateway,
  ) {}

  /** 获取厨师等级 */
  async getChefLevel(userId: string): Promise<{
    level: string;
    title: string;
    emoji: string;
    totalOrders: number;
    avgRating: number;
    nextLevel: { title: string; minOrders: number; minAvgRating: number } | null;
    levels: Array<{
      key: string;
      title: string;
      emoji: string;
      minOrders: number;
      minAvgRating: number;
    }>;
  }> {
    // 从数据库查询启用的等级定义
    const chefLevels = await this.prisma.chefLevelDefinition.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (chefLevels.length === 0) {
      return { level: '', title: '', emoji: '', totalOrders: 0, avgRating: 0, nextLevel: null, levels: [] };
    }

    const stats = await this.prisma.order.aggregate({
      where: {
        chefUserId: userId,
        status: { in: ['completed', 'rated', 'served'] },
      },
      _count: { id: true },
    });
    const totalOrders = stats._count.id;

    const ratingAgg = await this.prisma.rating.aggregate({
      where: {
        order: { chefUserId: userId },
      },
      _avg: { stars: true },
    });
    const avgRating = ratingAgg._avg.stars ?? 0;

    // 从高到低找第一个满足条件的等级
    let currentLevel = chefLevels[0];
    for (let i = chefLevels.length - 1; i >= 0; i--) {
      const lv = chefLevels[i];
      if (totalOrders >= lv.minOrders && avgRating >= Number(lv.minAvgRating)) {
        currentLevel = lv;
        break;
      }
    }

    // 找下一等级
    const currentIdx = chefLevels.findIndex((l) => l.key === currentLevel.key);
    const nextLevelDef = currentIdx < chefLevels.length - 1 ? chefLevels[currentIdx + 1] : null;

    return {
      level: currentLevel.key,
      title: currentLevel.title,
      emoji: currentLevel.emoji,
      totalOrders,
      avgRating: Math.round(avgRating * 10) / 10,
      nextLevel: nextLevelDef
        ? {
            title: nextLevelDef.title,
            minOrders: nextLevelDef.minOrders,
            minAvgRating: Number(nextLevelDef.minAvgRating),
          }
        : null,
      levels: chefLevels.map((lv) => ({
        key: lv.key,
        title: lv.title,
        emoji: lv.emoji,
        minOrders: lv.minOrders,
        minAvgRating: Number(lv.minAvgRating),
      })),
    };
  }

  async findById(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '用户不存在' });
    }
    return this.toDto(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserDto> {
    if (Object.keys(dto).length === 0) {
      return this.findById(userId);
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return this.toDto(updated);
  }

  /**
   * 绑定手机号 + 设置登录密码（供微信用户在小程序内开通 H5 登录，实现跨端互通）。
   * 手机号冲突时区分三种场景：已注销账号静默释放、有家庭活跃账号、无家庭活跃账号。
   */
  async bindCredentials(userId: string, dto: BindCredentialsDto): Promise<UserDto> {
    const owner = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (owner && owner.id !== userId) {
      if (owner.deletedAt) {
        await this.prisma.user.update({
          where: { id: owner.id },
          data: { phone: null },
        });
      } else if (owner.currentFamilyId) {
        throw new ConflictException({
          code: 'PHONE_BOUND_TO_FAMILY',
          message: '该手机号已关联另一个家庭，请先退出该家庭后再绑定',
        });
      } else {
        throw new ConflictException({
          code: 'PHONE_REGISTERED_NO_FAMILY',
          message: '该手机号已注册但未加入家庭，请联系客服处理',
        });
      }
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { phone: dto.phone, passwordHash: await hashPassword(dto.password) },
    });
    return this.toDto(updated);
  }

  async getNotificationPrefs(userId: string): Promise<Record<string, boolean>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    if (!user) return {};
    const prefs = user.notificationPrefs as Record<string, boolean>;
    return prefs && typeof prefs === 'object' ? prefs : {};
  }

  async updateNotificationPrefs(
    userId: string,
    prefs: Record<string, boolean>,
  ): Promise<Record<string, boolean>> {
    const current = await this.getNotificationPrefs(userId);
    const merged = { ...current, ...prefs };
    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPrefs: merged },
    });
    return merged;
  }

  /**
   * 注销账号：软删（置 deletedAt），并退出当前家庭。
   * 已经注销的账号再次注销返回 409。
   */
  async deleteMe(userId: string): Promise<{ deletedAt: Date }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '用户不存在' });
    }
    if (user.deletedAt) {
      throw new ConflictException({
        code: 'ALREADY_DELETED',
        message: '账号已注销',
      });
    }
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // 退出家庭
      if (user.currentFamilyId) {
        await tx.familyMember.updateMany({
          where: { userId, leftAt: null },
          data: { leftAt: now },
        });
        // 看是否要把家庭转 dissolving（没人了）
        const remaining = await tx.familyMember.count({
          where: { familyId: user.currentFamilyId, leftAt: null },
        });
        if (remaining === 0) {
          await tx.family.update({
            where: { id: user.currentFamilyId },
            data: { status: FamilyStatus.DISSOLVING, dissolvingAt: now },
          });
        }
      }
      // 软删
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: now,
          currentFamilyId: null,
        },
      });
    });

    // 通知家庭里剩余的成员
    if (user.currentFamilyId) {
      const remainingMembers = await this.prisma.familyMember.findMany({
        where: { familyId: user.currentFamilyId, leftAt: null },
        select: { userId: true },
      });
      for (const rm of remainingMembers) {
        this.ws.sendToUser(rm.userId, 'family:member_left', {
          familyId: user.currentFamilyId,
          member: {
            nickname: user.nickname,
            avatarUrl: user.avatarUrl,
          },
        });
      }
    }

    return { deletedAt: now };
  }

  private toDto(user: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    gender: string | null;
    signature: string | null;
    currentFamilyId: string | null;
    phone: string | null;
    passwordHash: string | null;
    createdAt: Date;
  }): UserDto {
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      signature: user.signature,
      currentFamilyId: user.currentFamilyId,
      phone: user.phone,
      hasPassword: !!user.passwordHash,
      createdAt: user.createdAt,
    };
  }
}
