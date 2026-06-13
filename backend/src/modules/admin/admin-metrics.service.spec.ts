import { Test } from '@nestjs/testing';
import { OrderStatus } from '@family-kitchen/shared';
import { AdminMetricsService } from './admin-metrics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdminMetricsService', () => {
  let service: AdminMetricsService;
  let prisma: {
    user: { count: jest.Mock };
    family: { count: jest.Mock; findMany: jest.Mock };
    order: { count: jest.Mock; findMany: jest.Mock };
    orderMessage: { findMany: jest.Mock };
    rating: { findMany: jest.Mock };
    lovePointLog: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      user: { count: jest.fn() },
      family: { count: jest.fn(), findMany: jest.fn() },
      order: { count: jest.fn(), findMany: jest.fn() },
      orderMessage: { findMany: jest.fn() },
      rating: { findMany: jest.fn() },
      lovePointLog: { findMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [AdminMetricsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get<AdminMetricsService>(AdminMetricsService);
  });

  it('aggregates all metrics in one snapshot', async () => {
    prisma.user.count.mockResolvedValue(120);
    prisma.family.count.mockResolvedValue(40);
    prisma.order.count.mockResolvedValue(85); // weekly completed
    prisma.order.findMany.mockResolvedValue([
      // active families: fam1, fam2
      { familyId: 'fam1', customerUserId: 'u1', chefUserId: 'u2', createdAt: new Date() },
      { familyId: 'fam2', customerUserId: 'u3', chefUserId: 'u4', createdAt: new Date() },
    ]);
    prisma.orderMessage.findMany.mockResolvedValue([]);
    prisma.rating.findMany.mockResolvedValue([]);
    prisma.family.findMany.mockResolvedValue([
      // fam1: 双成员都活跃 → double active
      {
        id: 'fam1',
        members: [{ userId: 'u1' }, { userId: 'u2' }],
        orders: [{ customerUserId: 'u1', chefUserId: 'u2' }],
      },
      // fam2: 只有 u3 活跃，u4 没出现 → 不算 double（但 u4 出现在 createdAt 那个里）
      {
        id: 'fam2',
        members: [{ userId: 'u3' }, { userId: 'u4' }],
        orders: [{ customerUserId: 'u3', chefUserId: 'u4' }],
      },
    ]);
    prisma.lovePointLog.findMany.mockResolvedValue([
      { changeAmount: 10 },
      { changeAmount: -3 },
      { changeAmount: 7 },
    ]);

    const result = await service.snapshot();

    expect(result.totalUsers).toBe(120);
    expect(result.totalFamilies).toBe(40);
    expect(result.weeklyOrders).toBe(85);
    expect(result.activeFamiliesLast7d).toBe(2);
    expect(result.todayDau).toBeGreaterThanOrEqual(4); // u1-u4 都活跃
    expect(result.doubleActiveRate).toBe(1); // 2/2 双成员都活跃
    expect(result.monthlyLovePointVolume).toBe(20); // |10|+|-3|+|7|
    expect(result.snapshotAt).toBeInstanceOf(Date);
  });

  it('doubleActiveRate returns 0 when no families have 2 members', async () => {
    prisma.user.count.mockResolvedValue(2);
    prisma.family.count.mockResolvedValue(1);
    prisma.order.count.mockResolvedValue(0);
    prisma.order.findMany.mockResolvedValue([
      { familyId: 'fam1', customerUserId: 'u1', chefUserId: 'u1', createdAt: new Date() },
    ]);
    prisma.orderMessage.findMany.mockResolvedValue([]);
    prisma.rating.findMany.mockResolvedValue([]);
    prisma.family.findMany.mockResolvedValue([
      {
        id: 'fam1',
        members: [{ userId: 'u1' }], // 单成员家庭，不进分母
        orders: [{ customerUserId: 'u1', chefUserId: 'u1' }],
      },
    ]);
    prisma.lovePointLog.findMany.mockResolvedValue([]);

    const result = await service.snapshot();
    expect(result.doubleActiveRate).toBe(0);
  });

  it('uses OrderStatus.COMPLETED for weekly orders query', async () => {
    prisma.user.count.mockResolvedValue(0);
    prisma.family.count.mockResolvedValue(0);
    prisma.order.count.mockResolvedValue(0);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.orderMessage.findMany.mockResolvedValue([]);
    prisma.rating.findMany.mockResolvedValue([]);
    prisma.family.findMany.mockResolvedValue([]);
    prisma.lovePointLog.findMany.mockResolvedValue([]);

    await service.snapshot();
    expect(prisma.order.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: OrderStatus.COMPLETED }),
      }),
    );
  });
});
