import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@family-kitchen/shared';
import { OrderService } from './order.service';
import { PrismaService } from '../../prisma/prisma.service';

function makeOrder(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: 'o1',
    familyId: 'fam1',
    customerUserId: 'u-customer',
    chefUserId: 'u-chef',
    status: OrderStatus.PENDING,
    expectedServeAt: null,
    customerNotes: null,
    rejectReason: null,
    servedImageUrls: [],
    totalLovePoints: 0,
    servedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: 'oi1',
        recipeId: 'r1',
        recipeSnapshot: { name: '番茄炒蛋', imageUrls: [], difficulty: 2 },
        customNotes: null,
        sortOrder: 0,
      },
    ],
    ...overrides,
  };
}

describe('OrderService', () => {
  let service: OrderService;
  let prisma: {
    user: { findUnique: jest.Mock };
    familyMember: { findFirst: jest.Mock };
    recipe: { findMany: jest.Mock };
    order: {
      create: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ currentFamilyId: 'fam1' }) },
      familyMember: { findFirst: jest.fn() },
      recipe: { findMany: jest.fn() },
      order: {
        create: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [OrderService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get<OrderService>(OrderService);
  });

  describe('create', () => {
    it('rejects when chef not in family', async () => {
      prisma.familyMember.findFirst.mockResolvedValue(null);
      await expect(
        service.create('u-customer', {
          chefUserId: 'u-other',
          items: [{ recipeId: 'r1' }],
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when family already has active order', async () => {
      prisma.familyMember.findFirst.mockResolvedValue({ id: 'm1' });
      prisma.order.count.mockResolvedValue(1);
      await expect(
        service.create('u-customer', {
          chefUserId: 'u-chef',
          items: [{ recipeId: 'r1' }],
        } as never),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects when any recipe not in family or deleted', async () => {
      prisma.familyMember.findFirst.mockResolvedValue({ id: 'm1' });
      prisma.order.count.mockResolvedValue(0);
      prisma.recipe.findMany.mockResolvedValue([]); // 0 matches but 1 requested
      await expect(
        service.create('u-customer', {
          chefUserId: 'u-chef',
          items: [{ recipeId: 'r1' }],
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('happy path creates pending order with snapshots', async () => {
      prisma.familyMember.findFirst.mockResolvedValue({ id: 'm1' });
      prisma.order.count.mockResolvedValue(0);
      prisma.recipe.findMany.mockResolvedValue([
        {
          id: 'r1',
          name: '番茄炒蛋',
          imageUrls: ['url1'],
          difficulty: 2,
          isDeleted: false,
        },
      ]);
      prisma.order.create.mockResolvedValue(makeOrder());

      const result = await service.create('u-customer', {
        chefUserId: 'u-chef',
        items: [{ recipeId: 'r1', customNotes: '少辣' }],
      } as never);

      expect(prisma.order.create).toHaveBeenCalled();
      const args = prisma.order.create.mock.calls[0][0];
      expect(args.data.status).toBe(OrderStatus.PENDING);
      expect(args.data.items.create[0].recipeSnapshot).toMatchObject({
        name: '番茄炒蛋',
        difficulty: 2,
      });
      expect(result.status).toBe(OrderStatus.PENDING);
    });
  });

  describe('findOne / requireOwnedOrder', () => {
    it('404 when not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.findOne('u-customer', 'o1')).rejects.toThrow(NotFoundException);
    });

    it('403 when in another family', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder({ familyId: 'other-fam' }));
      await expect(service.findOne('u-customer', 'o1')).rejects.toThrow(ForbiddenException);
    });

    it('403 when not participant', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());
      await expect(service.findOne('u-bystander', 'o1')).rejects.toThrow(ForbiddenException);
    });

    it('returns DTO with myRole=customer for customer viewer', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());
      const result = await service.findOne('u-customer', 'o1');
      expect(result.myRole).toBe('customer');
    });

    it('returns DTO with myRole=chef for chef viewer', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());
      const result = await service.findOne('u-chef', 'o1');
      expect(result.myRole).toBe('chef');
    });
  });

  describe('accept', () => {
    it('rejects customer trying to accept their own order', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());
      await expect(service.accept('u-customer', 'o1', {})).rejects.toThrow(ForbiddenException);
    });

    it('rejects when order not in pending status', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder({ status: OrderStatus.COOKING }));
      await expect(service.accept('u-chef', 'o1', {})).rejects.toThrow(BadRequestException);
    });

    it('happy path: pending → accepted', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());
      prisma.order.update.mockResolvedValue(makeOrder({ status: OrderStatus.ACCEPTED }));
      const result = await service.accept('u-chef', 'o1', {});
      expect(result.status).toBe(OrderStatus.ACCEPTED);
    });
  });

  describe('serve', () => {
    it('rejects when not cooking yet', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder({ status: OrderStatus.ACCEPTED }));
      await expect(service.serve('u-chef', 'o1', { imageUrls: ['url1'] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('happy path: cooking → served, persists images and timestamp', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder({ status: OrderStatus.COOKING }));
      prisma.order.update.mockResolvedValue(
        makeOrder({
          status: OrderStatus.SERVED,
          servedImageUrls: ['https://x.com/a.jpg'],
          servedAt: new Date(),
        }),
      );
      const result = await service.serve('u-chef', 'o1', {
        imageUrls: ['https://x.com/a.jpg'],
      });
      expect(result.status).toBe(OrderStatus.SERVED);
      expect(result.servedImageUrls).toContain('https://x.com/a.jpg');
      expect(result.servedAt).toBeTruthy();
    });
  });

  describe('cancel', () => {
    it('rejects cancelling a served order', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder({ status: OrderStatus.SERVED }));
      await expect(service.cancel('u-customer', 'o1', {})).rejects.toThrow(BadRequestException);
    });

    it('rejects cancelling a terminal order (rejected)', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder({ status: OrderStatus.REJECTED }));
      await expect(service.cancel('u-customer', 'o1', {})).rejects.toThrow(BadRequestException);
    });

    it('both customer and chef can cancel pending orders', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());
      prisma.order.update.mockResolvedValue(makeOrder({ status: OrderStatus.CANCELLED }));

      await expect(
        service.cancel('u-customer', 'o1', { reason: 'changed mind' }),
      ).resolves.toBeDefined();
      await expect(service.cancel('u-chef', 'o1', { reason: 'sick today' })).resolves.toBeDefined();
    });
  });
});
