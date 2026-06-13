import { Test } from '@nestjs/testing';
import { LovePointService } from './love-point.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AchievementService } from '../achievement/achievement.service';

describe('LovePointService', () => {
  let service: LovePointService;
  let prisma: {
    user: { findUnique: jest.Mock };
    lovePointLog: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ currentFamilyId: 'fam1' }) },
      lovePointLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        LovePointService,
        { provide: PrismaService, useValue: prisma },
        { provide: AchievementService, useValue: { evaluate: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get<LovePointService>(LovePointService);
  });

  describe('getMyBalance', () => {
    it('returns 0 when no logs yet', async () => {
      prisma.lovePointLog.findFirst.mockResolvedValue(null);
      prisma.lovePointLog.findMany.mockResolvedValue([]);
      const result = await service.getMyBalance('u1');
      expect(result.balance).toBe(0);
      expect(result.monthEarned).toBe(0);
      expect(result.monthSpent).toBe(0);
      // familyId is included in both queries
      expect(prisma.lovePointLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ familyId: 'fam1' }) }),
      );
      expect(prisma.lovePointLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ familyId: 'fam1' }) }),
      );
    });

    it('returns balanceAfter of latest log; aggregates month earned/spent', async () => {
      prisma.lovePointLog.findFirst.mockResolvedValue({ balanceAfter: 42 });
      prisma.lovePointLog.findMany.mockResolvedValue([
        { changeAmount: 10 },
        { changeAmount: -3 },
        { changeAmount: 5 },
      ]);
      const result = await service.getMyBalance('u1');
      expect(result.balance).toBe(42);
      expect(result.monthEarned).toBe(15);
      expect(result.monthSpent).toBe(3);
    });
  });

  describe('addLog', () => {
    it('computes balanceAfter as previous + changeAmount', async () => {
      prisma.lovePointLog.findFirst.mockResolvedValue({ balanceAfter: 100 });
      prisma.lovePointLog.create.mockImplementation((args) =>
        Promise.resolve({ id: 'log1', ...args.data }),
      );
      const result = await service.addLog({
        userId: 'u1',
        familyId: 'fam1',
        changeAmount: 7,
        changeType: 'cook_reward',
      });
      // findFirst filters by familyId
      expect(prisma.lovePointLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', familyId: 'fam1' } }),
      );
      expect(prisma.lovePointLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          changeAmount: 7,
          balanceAfter: 107,
        }),
      });
      expect(result.balanceAfter).toBe(107);
    });

    it('uses 0 baseline when user has no prior log', async () => {
      prisma.lovePointLog.findFirst.mockResolvedValue(null);
      prisma.lovePointLog.create.mockImplementation((args) =>
        Promise.resolve({ id: 'log1', ...args.data }),
      );
      await service.addLog({
        userId: 'u1',
        familyId: 'fam1',
        changeAmount: 12,
        changeType: 'cook_reward',
      });
      expect(prisma.lovePointLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ balanceAfter: 12 }),
      });
    });

    it('handles negative amounts (tip outflow)', async () => {
      prisma.lovePointLog.findFirst.mockResolvedValue({ balanceAfter: 30 });
      prisma.lovePointLog.create.mockImplementation((args) =>
        Promise.resolve({ id: 'log1', ...args.data }),
      );
      await service.addLog({
        userId: 'u1',
        familyId: 'fam1',
        changeAmount: -8,
        changeType: 'tip_send',
      });
      expect(prisma.lovePointLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ balanceAfter: 22 }),
      });
    });
  });

  describe('addLogs', () => {
    it('accumulates balanceAfter across multiple logs for same user', async () => {
      let stored = 50;
      prisma.lovePointLog.findFirst.mockImplementation(() =>
        Promise.resolve({ balanceAfter: stored }),
      );
      prisma.lovePointLog.create.mockImplementation((args) => {
        stored = args.data.balanceAfter;
        return Promise.resolve({ id: Math.random().toString(), ...args.data });
      });

      await service.addLogs([
        { userId: 'u1', familyId: 'f1', changeAmount: 5, changeType: 'a' },
        { userId: 'u1', familyId: 'f1', changeAmount: 3, changeType: 'b' },
      ]);

      expect(prisma.lovePointLog.create).toHaveBeenCalledTimes(2);
      const firstCall = prisma.lovePointLog.create.mock.calls[0][0].data;
      const secondCall = prisma.lovePointLog.create.mock.calls[1][0].data;
      expect(firstCall.balanceAfter).toBe(55);
      expect(secondCall.balanceAfter).toBe(58);
    });
  });
});
