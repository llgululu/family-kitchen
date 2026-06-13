import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import {
  FAMILY_LIMITS,
  LOVE_POINT_FORMULA,
  ORDER_TIMING,
  OrderMessageType,
  OrderStatus,
  PAGINATION,
  RATING_LIMITS,
  RECIPE_LIMITS,
  RUSH_LIMITS,
} from '@family-kitchen/shared';
import { MessageService } from './message.service';
import { LovePointService } from '../love-point/love-point.service';
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

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'o1',
    familyId: 'fam1',
    customerUserId: 'u-customer',
    chefUserId: 'u-chef',
    status: OrderStatus.COOKING,
    ...overrides,
  };
}

describe('MessageService', () => {
  let service: MessageService;
  let prisma: {
    user: { findUnique: jest.Mock };
    order: { findUnique: jest.Mock };
    orderMessage: {
      create: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let lovePoint: { getMyBalance: jest.Mock; addLog: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ currentFamilyId: 'fam1' }) },
      order: { findUnique: jest.fn() },
      orderMessage: {
        create: jest.fn().mockResolvedValue({
          id: 'm1',
          senderUserId: 'u-customer',
          type: OrderMessageType.TEXT,
          content: {},
          createdAt: new Date(),
        }),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (cb: unknown) => {
        if (typeof cb === 'function') return (cb as (tx: unknown) => Promise<unknown>)(prisma);
        return Promise.all(cb as Promise<unknown>[]);
      }),
    };
    lovePoint = {
      getMyBalance: jest.fn(),
      addLog: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: PrismaService, useValue: prisma },
        { provide: LovePointService, useValue: lovePoint },
        {
          provide: NotificationService,
          useValue: { sendOrderRushed: jest.fn(), sendOrderAccepted: jest.fn() },
        },
        { provide: BusinessConfigService, useValue: bizConfigMock },
      ],
    }).compile();
    service = moduleRef.get<MessageService>(MessageService);
  });

  describe('send text/emoji/image', () => {
    it('rejects text without text field', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder());
      await expect(
        service.send('u-customer', 'o1', { type: OrderMessageType.TEXT } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects on terminal order', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder({ status: OrderStatus.COMPLETED }));
      await expect(
        service.send('u-customer', 'o1', {
          type: OrderMessageType.TEXT,
          text: '催菜',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts emoji message and stores emojiKey', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder());
      await service.send('u-customer', 'o1', {
        type: OrderMessageType.EMOJI,
        emojiKey: 'kiss',
      } as never);
      const created = prisma.orderMessage.create.mock.calls[0][0].data;
      expect(created.type).toBe(OrderMessageType.EMOJI);
      expect(created.content).toEqual({ emojiKey: 'kiss' });
    });
  });

  describe('rush rate limit', () => {
    it('rejects when chef tries to rush', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder());
      await expect(
        service.send('u-chef', 'o1', { type: OrderMessageType.RUSH } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when order is not COOKING', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder({ status: OrderStatus.ACCEPTED }));
      await expect(
        service.send('u-customer', 'o1', { type: OrderMessageType.RUSH } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects after 3 rushes', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder());
      prisma.orderMessage.count.mockResolvedValue(3);
      await expect(
        service.send('u-customer', 'o1', { type: OrderMessageType.RUSH } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects when last rush within cooldown', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder());
      prisma.orderMessage.count.mockResolvedValue(1);
      prisma.orderMessage.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 60_000), // 1 分钟前
      });
      await expect(
        service.send('u-customer', 'o1', { type: OrderMessageType.RUSH } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('allows rush after cooldown elapsed', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder());
      prisma.orderMessage.count.mockResolvedValue(1);
      prisma.orderMessage.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 10 * 60_000), // 10 分钟前
      });
      await expect(
        service.send('u-customer', 'o1', { type: OrderMessageType.RUSH } as never),
      ).resolves.toBeDefined();
    });
  });

  describe('tip settlement', () => {
    it('rejects when chef tries to tip', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder());
      lovePoint.getMyBalance.mockResolvedValue({ balance: 100 });
      await expect(
        service.send('u-chef', 'o1', {
          type: OrderMessageType.TIP,
          tip: { amount: 10 },
        } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects when balance insufficient', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder());
      lovePoint.getMyBalance.mockResolvedValue({ balance: 3 });
      await expect(
        service.send('u-customer', 'o1', {
          type: OrderMessageType.TIP,
          tip: { amount: 10 },
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('settles tip by inserting two love-point logs (out + in)', async () => {
      prisma.order.findUnique.mockResolvedValue(baseOrder());
      lovePoint.getMyBalance.mockResolvedValue({ balance: 50 });
      await service.send('u-customer', 'o1', {
        type: OrderMessageType.TIP,
        tip: { amount: 10, title: '今日大厨' },
      } as never);
      expect(lovePoint.addLog).toHaveBeenCalledTimes(2);
      const [outFlow, inFlow] = lovePoint.addLog.mock.calls.map((c) => c[0]);
      expect(outFlow.userId).toBe('u-customer');
      expect(outFlow.changeAmount).toBe(-10);
      expect(inFlow.userId).toBe('u-chef');
      expect(inFlow.changeAmount).toBe(10);
    });
  });
});
