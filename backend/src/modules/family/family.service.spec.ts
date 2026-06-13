import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  FAMILY_LIMITS,
  LOVE_POINT_FORMULA,
  ORDER_TIMING,
  PAGINATION,
  RATING_LIMITS,
  RECIPE_LIMITS,
  RUSH_LIMITS,
} from '@family-kitchen/shared';
import { FamilyService } from './family.service';
import { BusinessConfigService } from '../business-config/business-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';
import { AchievementService } from '../achievement/achievement.service';

const bizConfigMock = {
  getLovePointFormula: () => LOVE_POINT_FORMULA,
  getRushLimits: () => RUSH_LIMITS,
  getOrderTiming: () => ORDER_TIMING,
  getRecipeLimits: () => RECIPE_LIMITS,
  getFamilyLimits: () => FAMILY_LIMITS,
  getRatingLimits: () => RATING_LIMITS,
  getPagination: () => PAGINATION,
  getWxTemplateId: () => '',
};

/** 简单的 Prisma 客户端 mock：返回链可控的 mock 函数 */
function createPrismaMock() {
  return {
    user: { findUnique: jest.fn(), update: jest.fn() },
    family: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    familyMember: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(this)),
  };
}

describe('FamilyService', () => {
  let service: FamilyService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    // $transaction: 把 tx 替换成 prisma 自身，简化测试
    prisma.$transaction = jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(prisma));

    const moduleRef = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: PrismaService, useValue: prisma },
        { provide: BusinessConfigService, useValue: bizConfigMock },
        { provide: WsGateway, useValue: { sendToUser: jest.fn() } },
        { provide: AchievementService, useValue: { evaluate: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get<FamilyService>(FamilyService);
  });

  describe('create', () => {
    it('refuses when user already in a family', async () => {
      prisma.familyMember.findFirst.mockResolvedValue({
        id: 'm1',
        familyId: 'f1',
        userId: 'u1',
        role: 'creator',
        leftAt: null,
      });
      await expect(service.create('u1', { name: '小厨房' })).rejects.toThrow(ConflictException);
    });

    it('creates family + member + sets user.currentFamilyId', async () => {
      prisma.familyMember.findFirst.mockResolvedValue(null);
      prisma.family.create.mockResolvedValue({
        id: 'f1',
        name: '我们的小厨房',
        relationType: 'couple',
        anniversaryDate: null,
        status: 'active',
        creatorUserId: 'u1',
        createdAt: new Date(),
      });
      prisma.family.findUnique.mockResolvedValue({
        id: 'f1',
        name: '我们的小厨房',
        relationType: 'couple',
        anniversaryDate: null,
        status: 'active',
        creatorUserId: 'u1',
        createdAt: new Date(),
        members: [
          {
            userId: 'u1',
            role: 'creator',
            joinedAt: new Date(),
            user: { nickname: '小 A', avatarUrl: null },
          },
        ],
      });

      const result = await service.create('u1', { name: '我们的小厨房' });

      expect(prisma.family.create).toHaveBeenCalled();
      expect(prisma.familyMember.create).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { currentFamilyId: 'f1' },
      });
      expect(result.id).toBe('f1');
      expect(result.myRole).toBe('creator');
    });
  });

  describe('joinByCode', () => {
    it('throws on invalid code', async () => {
      prisma.familyMember.findFirst.mockResolvedValue(null);
      prisma.family.findUnique.mockResolvedValue(null);
      await expect(service.joinByCode('u2', 'BADCODE')).rejects.toThrow(NotFoundException);
    });

    it('throws on expired invite', async () => {
      prisma.familyMember.findFirst.mockResolvedValue(null);
      prisma.family.findUnique.mockResolvedValue({
        id: 'f1',
        creatorUserId: 'u1',
        inviteCode: 'CODE1234',
        inviteCodeExpiresAt: new Date(Date.now() - 1000),
        status: 'active',
      });
      await expect(service.joinByCode('u2', 'CODE1234')).rejects.toThrow(BadRequestException);
    });

    it('refuses creator joining their own family', async () => {
      prisma.familyMember.findFirst.mockResolvedValue(null);
      prisma.family.findUnique.mockResolvedValue({
        id: 'f1',
        creatorUserId: 'u1',
        inviteCode: 'CODE1234',
        inviteCodeExpiresAt: new Date(Date.now() + 100_000),
        status: 'active',
      });
      await expect(service.joinByCode('u1', 'CODE1234')).rejects.toThrow(BadRequestException);
    });

    it('refuses when family full', async () => {
      prisma.familyMember.findFirst.mockResolvedValue(null);
      prisma.family.findUnique.mockResolvedValue({
        id: 'f1',
        creatorUserId: 'u1',
        inviteCode: 'CODE1234',
        inviteCodeExpiresAt: new Date(Date.now() + 100_000),
        status: 'active',
      });
      prisma.familyMember.count.mockResolvedValue(2);
      await expect(service.joinByCode('u2', 'CODE1234')).rejects.toThrow(ConflictException);
    });
  });
});
