import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { FamilyMemberRole, FamilyStatus, RelationType } from '@family-kitchen/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessConfigService } from '../business-config/business-config.service';
import { invalidateFamilyIdCache } from '../../common/family-context';
import { WsGateway } from '../ws/ws.gateway';
import { AchievementService } from '../achievement/achievement.service';
import type { CreateFamilyDto } from './dto/create-family.dto';
import type { UpdateFamilyDto } from './dto/update-family.dto';
import type { FamilyDto, FamilyMemberDto, InviteCodeDto } from './dto/family.dto';

function customAlphabet(alphabet: string, size: number): () => string {
  return () => {
    const bytes = randomBytes(size);
    let result = '';
    for (let i = 0; i < size; i++) {
      result += alphabet[bytes[i] % alphabet.length];
    }
    return result;
  };
}

const generateInviteCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bizConfig: BusinessConfigService,
    private readonly ws: WsGateway,
    private readonly achievement: AchievementService,
  ) {}

  /** 创建小厨房并把自己加为 creator 成员 */
  async create(userId: string, dto: CreateFamilyDto): Promise<FamilyDto> {
    await this.ensureUserHasNoActiveFamily(userId);

    const family = await this.prisma.$transaction(async (tx) => {
      const created = await tx.family.create({
        data: {
          name: dto.name,
          relationType: RelationType.COUPLE,
          anniversaryDate: dto.anniversaryDate ? new Date(dto.anniversaryDate) : null,
          creatorUserId: userId,
          status: FamilyStatus.ACTIVE,
        },
      });
      await tx.familyMember.create({
        data: {
          familyId: created.id,
          userId,
          role: FamilyMemberRole.CREATOR,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { currentFamilyId: created.id },
      });
      return created;
    });

    // 触发 family_joined 成就评估（创建者加入）
    void this.triggerFamilyJoined(userId, family.id);

    invalidateFamilyIdCache(userId);
    return this.getFamilyDtoForUser(family.id, userId);
  }

  /** 生成 / 刷新邀请码（任何成员均可操作） */
  async generateInviteCode(userId: string): Promise<InviteCodeDto> {
    const member = await this.requireUserMembership(userId);

    const maxMembers = this.bizConfig.getFamilyLimits().MAX_MEMBERS;
    // 已达上限不允许再邀请
    const activeCount = await this.prisma.familyMember.count({
      where: { familyId: member.familyId, leftAt: null },
    });
    if (activeCount >= maxMembers) {
      throw new ConflictException({
        code: 'FAMILY_FULL',
        message: `家庭空间已满（${maxMembers} 人）`,
      });
    }

    const code = generateInviteCode();
    const expiresAt = new Date(
      Date.now() + this.bizConfig.getOrderTiming().INVITE_CODE_TTL_SECONDS * 1000,
    );
    await this.prisma.family.update({
      where: { id: member.familyId },
      data: { inviteCode: code, inviteCodeExpiresAt: expiresAt },
    });
    return { inviteCode: code, expiresAt };
  }

  /** 通过邀请码加入 */
  async joinByCode(userId: string, inviteCode: string): Promise<FamilyDto> {
    await this.ensureUserHasNoActiveFamily(userId);

    const family = await this.prisma.family.findUnique({ where: { inviteCode } });
    if (!family || family.status !== FamilyStatus.ACTIVE) {
      throw new NotFoundException({
        code: 'INVITE_CODE_INVALID',
        message: '邀请码无效',
      });
    }
    if (!family.inviteCodeExpiresAt || family.inviteCodeExpiresAt < new Date()) {
      throw new BadRequestException({
        code: 'INVITE_CODE_EXPIRED',
        message: '邀请码已过期',
      });
    }
    if (family.creatorUserId === userId) {
      throw new BadRequestException({
        code: 'CANNOT_JOIN_OWN_FAMILY',
        message: '不能加入自己创建的小厨房',
      });
    }

    const maxMembersJoin = this.bizConfig.getFamilyLimits().MAX_MEMBERS;
    const activeCount = await this.prisma.familyMember.count({
      where: { familyId: family.id, leftAt: null },
    });
    if (activeCount >= maxMembersJoin) {
      throw new ConflictException({
        code: 'FAMILY_FULL',
        message: `家庭空间已满（${maxMembersJoin} 人）`,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.familyMember.create({
        data: {
          familyId: family.id,
          userId,
          role: FamilyMemberRole.MEMBER,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { currentFamilyId: family.id },
      });
      // 加入后邀请码立即失效，防止第三个人捡漏
      await tx.family.update({
        where: { id: family.id },
        data: { inviteCode: null, inviteCodeExpiresAt: null },
      });
    });

    // Notify the family creator in real-time
    const joiningUser = await this.prisma.user.findUnique({ where: { id: userId } });
    this.ws.sendToUser(family.creatorUserId, 'family:member_joined', {
      familyId: family.id,
      member: {
        nickname: joiningUser?.nickname,
        avatarUrl: joiningUser?.avatarUrl,
      },
    });

    // 触发 family_joined 成就评估（新成员加入）
    void this.triggerFamilyJoined(userId, family.id);

    invalidateFamilyIdCache(userId);
    return this.getFamilyDtoForUser(family.id, userId);
  }

  /** 获取我的小厨房 */
  async getMyFamily(userId: string): Promise<FamilyDto | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.currentFamilyId) return null;
    return this.getFamilyDtoForUser(user.currentFamilyId, userId);
  }

  /** 单方面退出（进入 dissolving 状态，30 天可恢复） */
  async leave(userId: string): Promise<{ status: string; dissolvingAt: Date | null }> {
    const member = await this.requireUserMembership(userId);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.familyMember.update({
        where: { id: member.id },
        data: { leftAt: now },
      });
      await tx.user.update({
        where: { id: userId },
        data: { currentFamilyId: null },
      });
      // 当家庭里没人了，整个家庭进入 dissolving
      const remaining = await tx.familyMember.count({
        where: { familyId: member.familyId, leftAt: null },
      });
      if (remaining === 0) {
        await tx.family.update({
          where: { id: member.familyId },
          data: { status: FamilyStatus.DISSOLVING, dissolvingAt: now },
        });
      }
    });

    invalidateFamilyIdCache(userId);

    // 通知家庭里剩余的成员
    const leavingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    const remainingMembers = await this.prisma.familyMember.findMany({
      where: { familyId: member.familyId, leftAt: null },
      select: { userId: true },
    });
    for (const rm of remainingMembers) {
      this.ws.sendToUser(rm.userId, 'family:member_left', {
        familyId: member.familyId,
        member: {
          nickname: leavingUser?.nickname,
          avatarUrl: leavingUser?.avatarUrl,
        },
      });
    }

    const family = await this.prisma.family.findUnique({ where: { id: member.familyId } });
    return {
      status: family?.status ?? FamilyStatus.DISSOLVING,
      dissolvingAt: family?.dissolvingAt ?? null,
    };
  }

  /** 更新家庭基本信息（仅 creator） */
  async update(userId: string, dto: UpdateFamilyDto): Promise<FamilyDto> {
    const member = await this.requireUserMembership(userId);
    if (member.role !== FamilyMemberRole.CREATOR) {
      throw new BadRequestException({
        code: 'NOT_FAMILY_CREATOR',
        message: '只有创建者可以修改',
      });
    }
    await this.prisma.family.update({
      where: { id: member.familyId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.anniversaryDate !== undefined
          ? { anniversaryDate: new Date(dto.anniversaryDate) }
          : {}),
      },
    });
    return this.getFamilyDtoForUser(member.familyId, userId);
  }

  // ---- internal ----

  private async ensureUserHasNoActiveFamily(userId: string): Promise<void> {
    const active = await this.prisma.familyMember.findFirst({
      where: { userId, leftAt: null },
    });
    if (active) {
      throw new ConflictException({
        code: 'USER_ALREADY_IN_FAMILY',
        message: '你已加入一个小厨房，先退出才能创建/加入新的',
      });
    }
  }

  private async requireUserMembership(userId: string): Promise<{
    id: string;
    familyId: string;
    role: string;
  }> {
    const member = await this.prisma.familyMember.findFirst({
      where: { userId, leftAt: null },
    });
    if (!member) {
      throw new NotFoundException({
        code: 'NOT_IN_FAMILY',
        message: '你还没有加入任何小厨房',
      });
    }
    return member;
  }

  private async getFamilyDtoForUser(familyId: string, userId: string): Promise<FamilyDto> {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: {
        members: {
          where: { leftAt: null },
          include: { user: true },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!family) {
      throw new NotFoundException({
        code: 'FAMILY_NOT_FOUND',
        message: '家庭不存在',
      });
    }
    const members: FamilyMemberDto[] = family.members.map((m) => ({
      userId: m.userId,
      nickname: m.user.nickname,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
    const myMember = family.members.find((m) => m.userId === userId);
    return {
      id: family.id,
      name: family.name,
      relationType: family.relationType,
      anniversaryDate: family.anniversaryDate,
      status: family.status,
      creatorUserId: family.creatorUserId,
      createdAt: family.createdAt,
      members,
      myRole: myMember?.role ?? null,
    };
  }

  private async triggerFamilyJoined(userId: string, familyId: string): Promise<void> {
    try {
      const family = await this.prisma.family.findUnique({ where: { id: familyId } });
      if (!family) return;
      await this.achievement.evaluate('family_joined', {
        prisma: this.prisma,
        userId,
        familyId,
        triggerType: 'family_joined',
        family: { id: family.id, createdAt: family.createdAt },
      });
    } catch {
      // 成就评估失败不应影响主流程
    }
  }
}
