import { Test } from '@nestjs/testing';
import { AchievementOwnerType, OrderStatus } from '@family-kitchen/shared';
import { AchievementService } from './achievement.service';
import { PrismaService } from '../../prisma/prisma.service';

function ctx(overrides: Partial<{ stars: number }> = {}) {
  return {
    order: {
      id: 'o1',
      familyId: 'fam1',
      customerUserId: 'u-customer',
      chefUserId: 'u-chef',
    },
    stars: overrides.stars ?? 5,
  };
}

describe('AchievementService', () => {
  let service: AchievementService;
  let prisma: {
    user: { findUnique: jest.Mock };
    order: { count: jest.Mock; findMany: jest.Mock };
    achievement: { findUnique: jest.Mock; create: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      order: { count: jest.fn(), findMany: jest.fn() },
      achievement: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation((args) =>
            Promise.resolve({ id: `a-${Math.random()}`, ...args.data }),
          ),
        findMany: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [AchievementService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get<AchievementService>(AchievementService);
  });

  describe('family milestones', () => {
    it('unlocks family_first_dish when family count reaches 1', async () => {
      // count(family completed) = 1; chef count = 1
      prisma.order.count
        .mockResolvedValueOnce(1) // family_first_dish
        .mockResolvedValueOnce(1) // family_10
        .mockResolvedValueOnce(1) // family_100
        .mockResolvedValueOnce(1) // family_365
        .mockResolvedValueOnce(1) // chef_first_dish
        .mockResolvedValueOnce(1) // chef_10
        .mockResolvedValueOnce(1); // chef_100
      prisma.order.findMany.mockResolvedValue([]); // streak: not enough orders

      const unlocked = await service.evaluateAfterRating({
        prisma: prisma as never,
        ...ctx(),
      });

      const keys = unlocked.map((u) => u.badgeKey).sort();
      expect(keys).toContain('family_first_dish');
      expect(keys).toContain('chef_first_dish');
      // 不到 10 不解锁 family_10
      expect(keys).not.toContain('family_10_dishes');
    });

    it('unlocks family_10_dishes when count reaches exactly 10', async () => {
      prisma.order.count
        .mockResolvedValueOnce(10) // family_first - 不解锁
        .mockResolvedValueOnce(10) // family_10 - 解锁
        .mockResolvedValueOnce(10) // family_100
        .mockResolvedValueOnce(10) // family_365
        .mockResolvedValueOnce(10) // chef_first
        .mockResolvedValueOnce(10) // chef_10 - 解锁
        .mockResolvedValueOnce(10); // chef_100
      prisma.order.findMany.mockResolvedValue([]);

      const unlocked = await service.evaluateAfterRating({
        prisma: prisma as never,
        ...ctx(),
      });
      const keys = unlocked.map((u) => u.badgeKey);
      expect(keys).toContain('family_10_dishes');
      expect(keys).toContain('chef_10_dishes');
      expect(keys).not.toContain('family_first_dish'); // 不在阈值上
    });
  });

  describe('five star streak', () => {
    it('does not unlock if current rating < 5', async () => {
      prisma.order.count.mockResolvedValue(0);
      prisma.order.findMany.mockResolvedValue([]);
      const unlocked = await service.evaluateAfterRating({
        prisma: prisma as never,
        ...ctx({ stars: 4 }),
      });
      expect(unlocked.find((u) => u.badgeKey === 'five_star_streak_5')).toBeUndefined();
    });

    it('unlocks five_star_streak_5 when last 5 orders all 5 stars', async () => {
      prisma.order.count.mockResolvedValue(0);
      prisma.order.findMany.mockResolvedValue(
        Array.from({ length: 5 }, () => ({ rating: { stars: 5 } })),
      );
      const unlocked = await service.evaluateAfterRating({
        prisma: prisma as never,
        ...ctx({ stars: 5 }),
      });
      expect(unlocked.find((u) => u.badgeKey === 'five_star_streak_5')).toBeDefined();
    });

    it('does not unlock if any in last 5 is < 5 stars', async () => {
      prisma.order.count.mockResolvedValue(0);
      prisma.order.findMany.mockResolvedValue([
        { rating: { stars: 5 } },
        { rating: { stars: 4 } },
        { rating: { stars: 5 } },
        { rating: { stars: 5 } },
        { rating: { stars: 5 } },
      ]);
      const unlocked = await service.evaluateAfterRating({
        prisma: prisma as never,
        ...ctx({ stars: 5 }),
      });
      expect(unlocked.find((u) => u.badgeKey === 'five_star_streak_5')).toBeUndefined();
    });
  });

  describe('idempotency', () => {
    it('does not re-unlock an existing badge', async () => {
      prisma.order.count.mockResolvedValue(1);
      prisma.order.findMany.mockResolvedValue([]);
      // 已存在 family_first_dish
      prisma.achievement.findUnique.mockImplementation((args) => {
        const key = args.where.ownerType_ownerId_badgeKey.badgeKey;
        return Promise.resolve(key === 'family_first_dish' ? { id: 'existing' } : null);
      });

      const unlocked = await service.evaluateAfterRating({
        prisma: prisma as never,
        ...ctx(),
      });
      const keys = unlocked.map((u) => u.badgeKey);
      expect(keys).not.toContain('family_first_dish');
      expect(keys).toContain('chef_first_dish'); // 仍能解锁其他的
    });
  });

  describe('listMine', () => {
    it('filters by ownerType=user and userId', async () => {
      prisma.user.findUnique.mockResolvedValue({ currentFamilyId: 'fam1' });
      prisma.achievement.findMany.mockResolvedValue([
        {
          id: 'a1',
          ownerType: 'user',
          ownerId: 'u-chef',
          badgeKey: 'chef_first_dish',
          sourceOrderId: 'o1',
          metadata: {},
          unlockedAt: new Date(),
        },
      ]);
      const result = await service.listMine('u-chef');
      expect(prisma.achievement.findMany).toHaveBeenCalledWith({
        where: { ownerType: AchievementOwnerType.USER, ownerId: 'u-chef' },
        orderBy: { unlockedAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('厨师初体验'); // 装饰了 registry 元信息
    });
  });

  it('uses OrderStatus.COMPLETED in count query', async () => {
    prisma.order.count.mockResolvedValue(1);
    prisma.order.findMany.mockResolvedValue([]);
    await service.evaluateAfterRating({ prisma: prisma as never, ...ctx() });
    expect(prisma.order.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: OrderStatus.COMPLETED }),
      }),
    );
  });
});
