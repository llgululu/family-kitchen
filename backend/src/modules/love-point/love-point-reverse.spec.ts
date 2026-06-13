import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { LovePointChangeType } from '@family-kitchen/shared';
import { LovePointService } from './love-point.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AchievementService } from '../achievement/achievement.service';

describe('LovePointService.reverseLog', () => {
  let service: LovePointService;
  let prisma: {
    user: { findUnique: jest.Mock };
    lovePointLog: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    order: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      lovePointLog: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ balanceAfter: 100 }),
        create: jest
          .fn()
          .mockImplementation((args) =>
            Promise.resolve({ id: `log-${Math.random()}`, ...args.data }),
          ),
        update: jest.fn(),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order1',
          chefUserId: 'u-chef',
        }),
      },
      $transaction: jest.fn(async (cb: unknown) => {
        if (typeof cb === 'function') return (cb as (tx: unknown) => Promise<unknown>)(prisma);
        return Promise.all(cb as Promise<unknown>[]);
      }),
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

  it('rejects if log not owned by user', async () => {
    prisma.lovePointLog.findUnique.mockResolvedValue({
      id: 'log1',
      userId: 'other-user',
      changeType: LovePointChangeType.TIP_SEND,
      isReversed: false,
      reversibleUntil: new Date(Date.now() + 60_000),
      changeAmount: -10,
      sourceOrderId: 'order1',
    });
    await expect(service.reverseLog('me', 'log1')).rejects.toThrow(ForbiddenException);
  });

  it('rejects non tip_send types', async () => {
    prisma.lovePointLog.findUnique.mockResolvedValue({
      id: 'log1',
      userId: 'me',
      changeType: LovePointChangeType.COOK_REWARD,
      isReversed: false,
      reversibleUntil: new Date(Date.now() + 60_000),
      changeAmount: 10,
      sourceOrderId: 'order1',
    });
    await expect(service.reverseLog('me', 'log1')).rejects.toThrow(BadRequestException);
  });

  it('rejects already-reversed logs', async () => {
    prisma.lovePointLog.findUnique.mockResolvedValue({
      id: 'log1',
      userId: 'me',
      changeType: LovePointChangeType.TIP_SEND,
      isReversed: true,
      reversibleUntil: new Date(Date.now() + 60_000),
      changeAmount: -10,
      sourceOrderId: 'order1',
    });
    await expect(service.reverseLog('me', 'log1')).rejects.toThrow(ConflictException);
  });

  it('rejects when 24h window passed', async () => {
    prisma.lovePointLog.findUnique.mockResolvedValue({
      id: 'log1',
      userId: 'me',
      changeType: LovePointChangeType.TIP_SEND,
      isReversed: false,
      reversibleUntil: new Date(Date.now() - 1000),
      changeAmount: -10,
      sourceOrderId: 'order1',
    });
    await expect(service.reverseLog('me', 'log1')).rejects.toThrow(BadRequestException);
  });

  it('happy path: writes 2 refund logs (customer +, chef -) and marks original reversed', async () => {
    prisma.lovePointLog.findUnique.mockResolvedValue({
      id: 'log1',
      userId: 'me',
      familyId: 'fam1',
      changeType: LovePointChangeType.TIP_SEND,
      isReversed: false,
      reversibleUntil: new Date(Date.now() + 60_000),
      changeAmount: -10,
      sourceOrderId: 'order1',
      description: '打赏：今日大厨',
    });
    await service.reverseLog('me', 'log1');
    // 2 次 create（食客退回 + 厨师扣回）
    expect(prisma.lovePointLog.create).toHaveBeenCalledTimes(2);
    const [first, second] = prisma.lovePointLog.create.mock.calls.map((c) => c[0].data);
    expect(first.userId).toBe('me');
    expect(first.changeAmount).toBe(10);
    expect(second.userId).toBe('u-chef');
    expect(second.changeAmount).toBe(-10);
    // 2 次 update（refund→original 反向引用 + 原 log 置 reversed）
    expect(prisma.lovePointLog.update).toHaveBeenCalledTimes(2);
    const updateCalls = prisma.lovePointLog.update.mock.calls.map((c) => c[0]);
    expect(updateCalls.some((u) => u.data.isReversed === true)).toBe(true);
    expect(updateCalls.some((u) => u.data.reversedFromId === 'log1')).toBe(true);
  });
});
