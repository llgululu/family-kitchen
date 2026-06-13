import { Test } from '@nestjs/testing';
import { TimelineService } from './timeline.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TimelineService.monthlySummary', () => {
  let service: TimelineService;
  let prisma: {
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    order: { findMany: jest.Mock };
    familyMember: { findMany: jest.Mock };
    achievement: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ currentFamilyId: 'fam1' }),
        findMany: jest.fn(),
      },
      order: { findMany: jest.fn() },
      familyMember: { findMany: jest.fn().mockResolvedValue([]) },
      achievement: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [TimelineService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get<TimelineService>(TimelineService);
  });

  it('returns zero counts when no orders this month', async () => {
    prisma.order.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);

    const result = await service.monthlySummary('u1', '2026-01');
    expect(result.month).toBe('2026-01');
    expect(result.totalOrders).toBe(0);
    expect(result.avgRating).toBeNull();
    expect(result.totalLovePoints).toBe(0);
    expect(result.topRecipes).toEqual([]);
    expect(result.contributors).toEqual([]);
  });

  it('aggregates top recipes by frequency', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        customerUserId: 'u1',
        chefUserId: 'u2',
        totalLovePoints: 10,
        rating: { stars: 5 },
        items: [{ recipeId: 'r1', recipeSnapshot: { name: '番茄炒蛋' } }],
      },
      {
        customerUserId: 'u1',
        chefUserId: 'u2',
        totalLovePoints: 8,
        rating: { stars: 4 },
        items: [
          { recipeId: 'r1', recipeSnapshot: { name: '番茄炒蛋' } },
          { recipeId: 'r2', recipeSnapshot: { name: '麻婆豆腐' } },
        ],
      },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', nickname: 'A' },
      { id: 'u2', nickname: 'B' },
    ]);

    const result = await service.monthlySummary('u1', '2026-05');
    expect(result.totalOrders).toBe(2);
    expect(result.avgRating).toBe(4.5);
    expect(result.totalLovePoints).toBe(18);
    expect(result.topRecipes[0]).toEqual({
      recipeName: '番茄炒蛋',
      recipeId: 'r1',
      count: 2,
    });
    expect(result.topRecipes[1]).toEqual({
      recipeName: '麻婆豆腐',
      recipeId: 'r2',
      count: 1,
    });
    expect(result.contributors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'u2', cookedCount: 2 }),
        expect.objectContaining({ userId: 'u1', orderedCount: 2 }),
      ]),
    );
  });
});
