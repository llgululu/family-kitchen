import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecipeService } from './recipe.service';
import { PrismaService } from '../../prisma/prisma.service';

function makeRecipe(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: 'r1',
    familyId: 'fam1',
    name: '番茄炒蛋',
    imageUrls: [],
    difficulty: 2,
    mealTags: ['dinner'],
    flavorTags: ['salty'],
    notes: null,
    createdByUserId: 'u1',
    isDeleted: false,
    orderCount: 0,
    avgRating: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('RecipeService', () => {
  let service: RecipeService;
  let prisma: {
    user: { findUnique: jest.Mock };
    recipe: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      recipe: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [RecipeService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get<RecipeService>(RecipeService);
  });

  describe('create', () => {
    it('rejects when user has no family', async () => {
      prisma.user.findUnique.mockResolvedValue({ currentFamilyId: null });
      await expect(service.create('u1', { name: '番茄炒蛋' })).rejects.toThrow(ForbiddenException);
    });

    it('creates with family scoping and defaults', async () => {
      prisma.user.findUnique.mockResolvedValue({ currentFamilyId: 'fam1' });
      prisma.recipe.create.mockResolvedValue(makeRecipe());

      const result = await service.create('u1', { name: '番茄炒蛋' });

      expect(prisma.recipe.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: 'fam1',
          createdByUserId: 'u1',
          name: '番茄炒蛋',
          difficulty: 3, // default
          mealTags: [],
          flavorTags: [],
          imageUrls: [],
        }),
      });
      expect(result.familyId).toBe('fam1');
    });
  });

  describe('findOne', () => {
    it('throws when recipe in another family', async () => {
      prisma.user.findUnique.mockResolvedValue({ currentFamilyId: 'fam1' });
      prisma.recipe.findUnique.mockResolvedValue(makeRecipe({ familyId: 'other-fam' }));
      await expect(service.findOne('u1', 'r1')).rejects.toThrow(ForbiddenException);
    });

    it('throws when recipe soft-deleted', async () => {
      prisma.user.findUnique.mockResolvedValue({ currentFamilyId: 'fam1' });
      prisma.recipe.findUnique.mockResolvedValue(makeRecipe({ isDeleted: true }));
      await expect(service.findOne('u1', 'r1')).rejects.toThrow(NotFoundException);
    });

    it('returns DTO when found and owned', async () => {
      prisma.user.findUnique.mockResolvedValue({ currentFamilyId: 'fam1' });
      prisma.recipe.findUnique.mockResolvedValue(makeRecipe());
      const result = await service.findOne('u1', 'r1');
      expect(result.id).toBe('r1');
      expect(result.name).toBe('番茄炒蛋');
    });
  });

  describe('findAll', () => {
    it('filters by family and excludes soft-deleted', async () => {
      prisma.user.findUnique.mockResolvedValue({ currentFamilyId: 'fam1' });
      prisma.recipe.findMany.mockResolvedValue([makeRecipe()]);
      prisma.recipe.count.mockResolvedValue(1);

      const result = await service.findAll('u1', {
        page: 1,
        pageSize: 20,
        skip: 0,
        take: 20,
        sort: 'updated_desc',
      } as never);

      expect(prisma.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ familyId: 'fam1', isDeleted: false }),
          orderBy: { updatedAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('remove', () => {
    it('soft-deletes (isDeleted=true) instead of hard delete', async () => {
      prisma.user.findUnique.mockResolvedValue({ currentFamilyId: 'fam1' });
      prisma.recipe.findUnique.mockResolvedValue(makeRecipe());
      prisma.recipe.update.mockResolvedValue(makeRecipe({ isDeleted: true }));

      const result = await service.remove('u1', 'r1');

      expect(prisma.recipe.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { isDeleted: true },
      });
      expect(result).toEqual({ id: 'r1', deleted: true });
    });
  });
});
