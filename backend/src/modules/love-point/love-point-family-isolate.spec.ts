import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { LovePointService } from './love-point.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AchievementService } from '../achievement/achievement.service';
import { LovePointChangeType } from '@family-kitchen/shared';
import { invalidateFamilyIdCache } from '../../common/family-context';

/**
 * 爱心币按家庭隔离测试：
 * 1. 用户从家庭甲退出（余额 500）→ 加入家庭乙 → 查余额为 0
 * 2. 用户在家庭乙赚了 100 → 查余额为 100（不是 600）
 * 3. 签到隔离：家庭甲已签到 → 加入家庭乙 → 家庭乙仍可签到
 * 4. 退出家庭后调用余额接口 → 403
 */
describe('LovePoint family isolation', () => {
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

  /** Helper: build a mock PrismaService with currentFamilyId. */
  function makePrisma(currentFamilyId: string | null) {
    return {
      user: {
        findUnique: jest.fn().mockResolvedValue(currentFamilyId ? { currentFamilyId } : null),
      },
      lovePointLog: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };
  }

  async function makeService(familyId: string | null) {
    invalidateFamilyIdCache('u1');
    prisma = makePrisma(familyId);
    const moduleRef = await Test.createTestingModule({
      providers: [
        LovePointService,
        { provide: PrismaService, useValue: prisma },
        { provide: AchievementService, useValue: { evaluate: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get<LovePointService>(LovePointService);
  }

  it('user leaves family A (balance 500) → joins family B → balance is 0', async () => {
    await makeService('famB');

    // In family B there are no logs for this user yet
    prisma.lovePointLog.findFirst.mockResolvedValue(null);
    prisma.lovePointLog.findMany.mockResolvedValue([]);

    const result = await service.getMyBalance('u1');

    // The findFirst query must include familyId: 'famB', not 'famA'
    expect(prisma.lovePointLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', familyId: 'famB' },
      }),
    );
    expect(result.balance).toBe(0);
  });

  it('user earns 100 in family B → balance is 100, not 600', async () => {
    await makeService('famB');

    // First addLog call: no prior logs in famB → balanceAfter = 100
    prisma.lovePointLog.findFirst.mockResolvedValue(null);
    prisma.lovePointLog.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'logB1', ...args.data }),
    );

    const log = await service.addLog({
      userId: 'u1',
      familyId: 'famB',
      changeAmount: 100,
      changeType: 'cook_reward',
    });

    // findFirst must filter by famB, not famA
    expect(prisma.lovePointLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', familyId: 'famB' },
      }),
    );
    // balanceAfter = 0 + 100 = 100, NOT 500 + 100 = 600
    expect(log.balanceAfter).toBe(100);
  });

  it('check-in is isolated per family: checked in famA → can still check in famB', async () => {
    await makeService('famB');

    // No check-in log in famB today
    prisma.lovePointLog.findFirst.mockResolvedValue(null);
    prisma.lovePointLog.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'logB-checkin', ...args.data }),
    );

    const result = await service.checkIn('u1');

    // The check-in duplicate query must include familyId: 'famB'
    expect(prisma.lovePointLog.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'u1',
          familyId: 'famB',
          changeType: LovePointChangeType.CHECK_IN,
        }),
      }),
    );
    expect(result.earned).toBe(2);
  });

  it('throws 403 when user has no family', async () => {
    await makeService(null);
    await expect(service.getMyBalance('u1')).rejects.toThrow(ForbiddenException);
  });
});
