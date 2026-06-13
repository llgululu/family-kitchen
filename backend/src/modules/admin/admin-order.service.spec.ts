import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@family-kitchen/shared';
import { AdminOrderService } from './admin-order.service';
import { PrismaService } from '../../prisma/prisma.service';

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'o1',
    familyId: 'fam1',
    customerUserId: 'u-customer',
    chefUserId: 'u-chef',
    status: OrderStatus.PENDING,
    totalLovePoints: 0,
    createdAt: new Date(),
    completedAt: null,
    customerNotes: null,
    rejectReason: null,
    ...overrides,
  };
}

describe('AdminOrderService', () => {
  let service: AdminOrderService;
  let prisma: {
    order: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [AdminOrderService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get<AdminOrderService>(AdminOrderService);
  });

  describe('freeze', () => {
    it('404 when order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.freeze('o1', { reason: 'spam' })).rejects.toThrow(NotFoundException);
    });

    it('refuses to freeze terminal orders', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder({ status: OrderStatus.COMPLETED }));
      await expect(service.freeze('o1', { reason: 'x' })).rejects.toThrow(BadRequestException);
    });

    it.each([
      OrderStatus.PENDING,
      OrderStatus.ACCEPTED,
      OrderStatus.PREPPING,
      OrderStatus.COOKING,
      OrderStatus.SERVED,
    ])('freezes %s into cancelled with prefix-tagged reason', async (status) => {
      prisma.order.findUnique.mockResolvedValue(makeOrder({ status }));
      prisma.order.update.mockResolvedValue(
        makeOrder({
          status: OrderStatus.CANCELLED,
          rejectReason: '[管理员冻结] 异常订单',
        }),
      );
      const result = await service.freeze('o1', { reason: '异常订单' });
      expect(result.status).toBe(OrderStatus.CANCELLED);
      const args = prisma.order.update.mock.calls[0][0];
      expect(args.data.status).toBe(OrderStatus.CANCELLED);
      expect(args.data.rejectReason).toBe('[管理员冻结] 异常订单');
    });
  });
});
