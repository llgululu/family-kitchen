import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { RecipeService } from './recipe.service';
import { PrismaService } from '../../prisma/prisma.service';

function makeRecipe() {
  return {
    id: 'r1',
    familyId: 'fam1',
    name: '番茄炒蛋',
    imageUrls: [],
    difficulty: 2,
    mealTags: [],
    flavorTags: [],
    notes: null,
    createdByUserId: 'u1',
    isDeleted: false,
    orderCount: 0,
    avgRating: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('RecipeService favorite/unfavorite', () => {
  let service: RecipeService;
  let prisma: {
    user: { findUnique: jest.Mock };
    recipe: { findUnique: jest.Mock };
    recipeFavorite: {
      create: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ currentFamilyId: 'fam1' }) },
      recipe: { findUnique: jest.fn().mockResolvedValue(makeRecipe()) },
      recipeFavorite: {
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [RecipeService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get<RecipeService>(RecipeService);
  });

  describe('favorite', () => {
    it('creates a RecipeFavorite row', async () => {
      const result = await service.favorite('u1', 'r1');
      expect(prisma.recipeFavorite.create).toHaveBeenCalledWith({
        data: { userId: 'u1', recipeId: 'r1' },
      });
      expect(result).toEqual({ favorited: true });
    });

    it('throws 409 on duplicate favorite (Prisma P2002)', async () => {
      prisma.recipeFavorite.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.favorite('u1', 'r1')).rejects.toThrow(ConflictException);
    });
  });

  describe('unfavorite', () => {
    it('idempotent: returns false even if not favorited', async () => {
      prisma.recipeFavorite.deleteMany.mockResolvedValue({ count: 0 });
      const result = await service.unfavorite('u1', 'r1');
      expect(result).toEqual({ favorited: false });
    });
  });
});
