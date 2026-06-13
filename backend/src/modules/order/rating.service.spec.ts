import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  FAMILY_LIMITS,
  LOVE_POINT_FORMULA,
  LovePointChangeType,
  ORDER_TIMING,
  OrderStatus,
  PAGINATION,
  RATING_LIMITS,
  RECIPE_LIMITS,
  RUSH_LIMITS,
} from '@family-kitchen/shared';
import { RatingService } from './rating.service';
import { LovePointService } from '../love-point/love-point.service';
import { TimelineService } from '../timeline/timeline.service';
import { AchievementService } from '../achievement/achievement.service';
import { NotificationService } from '../notification/notification.service';
import { BusinessConfigService } from '../business-config/business-config.service';
import { PrismaService } from '../../prisma/prisma.service';

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

function buildOrder(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: 'o1',
    familyId: 'fam1',
    customerUserId: 'u-customer',
    chefUserId: 'u-chef',
    status: OrderStatus.SERVED,
    servedAt: now,
    servedImageUrls: ['https://x.com/a.jpg'],
    items: [
      { id: 'oi1', recipeId: 'r1', recipeSnapshot: { difficulty: 2 } },
      { id: 'oi2', recipeId: 'r2', recipeSnapshot: { difficulty: 4 } },
    ],
    rating: null,
    ...overrides,
  };
}

describe('RatingService', () => {
  let service: RatingService;
  let prisma: {
    user: { findUnique: jest.Mock };
    order: { findUnique: jest.Mock; update: jest.Mock };
    rating: { create: jest.Mock };
    recipe: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let lovePoint: { addLog: jest.Mock };
  let timeline: { createFromOrder: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ currentFamilyId: 'fam1' }) },
      order: { findUnique: jest.fn(), update: jest.fn() },
      rating: { create: jest.fn() },
      recipe: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (cb: unknown) => {
        if (typeof cb === 'function') return (cb as (tx: unknown) => Promise<unknown>)(prisma);
        return Promise.all(cb as Promise<unknown>[]);
      }),
    };
    lovePoint = { addLog: jest.fn() };
    timeline = {
      createFromOrder: jest.fn().mockResolvedValue({ id: 'tl1' }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        RatingService,
        { provide: PrismaService, useValue: prisma },
        { provide: LovePointService, useValue: lovePoint },
        { provide: TimelineService, useValue: timeline },
        { provide: AchievementService, useValue: { evaluateOnOrderRated: jest.fn(), evaluate: jest.fn() } },
        { provide: NotificationService, useValue: { sendAchievementUnlocked: jest.fn() } },
        { provide: BusinessConfigService, useValue: bizConfigMock },
      ],
    }).compile();
    service = moduleRef.get<RatingService>(RatingService);
  });

  describe('guards', () => {
    it('404 if order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.create('u-customer', 'o1', { stars: 5 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('403 cross family', async () => {
      prisma.order.findUnique.mockResolvedValue(buildOrder({ familyId: 'other' }));
      await expect(service.create('u-customer', 'o1', { stars: 5 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('403 if chef tries to rate', async () => {
      prisma.order.findUnique.mockResolvedValue(buildOrder());
      await expect(service.create('u-chef', 'o1', { stars: 5 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('409 if already rated', async () => {
      prisma.order.findUnique.mockResolvedValue(buildOrder({ rating: { id: 'r1' } }));
      await expect(service.create('u-customer', 'o1', { stars: 5 })).rejects.toThrow(
        ConflictException,
      );
    });

    it('400 if order not served yet', async () => {
      prisma.order.findUnique.mockResolvedValue(buildOrder({ status: OrderStatus.COOKING }));
      await expect(service.create('u-customer', 'o1', { stars: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('settlement', () => {
    beforeEach(() => {
      prisma.order.findUnique.mockResolvedValue(buildOrder());
      prisma.rating.create.mockImplementation((args) =>
        Promise.resolve({
          id: 'rating1',
          orderId: args.data.orderId,
          raterUserId: args.data.raterUserId,
          stars: args.data.stars,
          comment: args.data.comment,
          imageUrls: args.data.imageUrls,
          createdAt: new Date(),
        }),
      );
      prisma.recipe.findUnique.mockResolvedValue({
        id: 'r1',
        orderCount: 0,
        avgRating: null,
      });
    });

    it('computes love points: 3-star → no bonus', async () => {
      // 公式：sum(每道菜的 BASE + difficulty*MULT)
      // 菜 1: 5 + 2*2 = 9; 菜 2: 5 + 4*2 = 13; total = 22
      // 3 星不加成
      const result = await service.create('u-customer', 'o1', { stars: 3 });
      expect(result.lovePointsAwarded).toBe(22);
    });

    it('computes love points: 5-star adds rating bonus + extra', async () => {
      // base 22 + (5-3)*2 = 4 + 5 = 31
      const result = await service.create('u-customer', 'o1', { stars: 5 });
      const expected =
        22 +
        (5 - 3) * LOVE_POINT_FORMULA.RATING_BONUS_MULTIPLIER +
        LOVE_POINT_FORMULA.FIVE_STAR_EXTRA_BONUS;
      expect(result.lovePointsAwarded).toBe(expected);
    });

    it('writes chef love-point log with cook_reward type', async () => {
      await service.create('u-customer', 'o1', { stars: 4 });
      expect(lovePoint.addLog).toHaveBeenCalledTimes(1);
      const arg = lovePoint.addLog.mock.calls[0][0];
      expect(arg.userId).toBe('u-chef');
      expect(arg.changeType).toBe(LovePointChangeType.COOK_REWARD);
      expect(arg.sourceOrderId).toBe('o1');
    });

    it('updates order to completed with totalLovePoints and completedAt', async () => {
      await service.create('u-customer', 'o1', { stars: 5 });
      const args = prisma.order.update.mock.calls[0][0];
      expect(args.where).toEqual({ id: 'o1' });
      expect(args.data.status).toBe(OrderStatus.COMPLETED);
      expect(args.data.totalLovePoints).toBeGreaterThan(0);
      expect(args.data.completedAt).toBeInstanceOf(Date);
    });

    it('generates a timeline entry', async () => {
      const result = await service.create('u-customer', 'o1', {
        stars: 5,
        comment: '今天的火候完美！',
      });
      expect(timeline.createFromOrder).toHaveBeenCalledTimes(1);
      const arg = timeline.createFromOrder.mock.calls[0][0];
      expect(arg.familyId).toBe('fam1');
      expect(arg.orderId).toBe('o1');
      expect(arg.customerComment).toBe('今天的火候完美！');
      expect(result.timelineEntryId).toBe('tl1');
    });

    it('bumps recipe aggregates for each item', async () => {
      await service.create('u-customer', 'o1', { stars: 4 });
      expect(prisma.recipe.update).toHaveBeenCalledTimes(2);
      const firstUpd = prisma.recipe.update.mock.calls[0][0];
      expect(firstUpd.data.orderCount).toBe(1);
      expect(firstUpd.data.avgRating).toBe(4);
    });
  });
});
