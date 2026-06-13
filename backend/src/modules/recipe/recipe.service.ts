import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Recipe } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { requireFamilyId } from '../../common/family-context';
import { paginate, type PaginatedResponseDto } from '../../common/pagination.dto';
import { AchievementService } from '../achievement/achievement.service';
import type { EvaluateContext } from '../achievement/evaluator-registry';
import type { CreateRecipeDto } from './dto/create-recipe.dto';
import type { UpdateRecipeDto } from './dto/update-recipe.dto';
import type { RecipeQueryDto } from './dto/recipe-query.dto';
import type { RecipeDto } from './dto/recipe.dto';

@Injectable()
export class RecipeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly achievement: AchievementService,
  ) {}

  async create(userId: string, dto: CreateRecipeDto): Promise<RecipeDto> {
    const familyId = await requireFamilyId(this.prisma, userId);
    const recipe = await this.prisma.recipe.create({
      data: {
        familyId,
        createdByUserId: userId,
        name: dto.name,
        imageUrls: dto.imageUrls ?? [],
        difficulty: dto.difficulty ?? 3,
        mealTags: dto.mealTags ?? [],
        flavorTags: dto.flavorTags ?? [],
        notes: dto.notes,
      },
    });

    // 触发 recipe_created 成就评估
    void this.triggerRecipeCreated(userId, familyId, recipe);

    return this.toDto(recipe, false);
  }

  /** 随机推荐一道菜谱 */
  async findRandom(userId: string): Promise<RecipeDto> {
    const familyId = await requireFamilyId(this.prisma, userId);
    const where: Prisma.RecipeWhereInput = {
      familyId,
      isDeleted: false,
    };
    const count = await this.prisma.recipe.count({ where });
    if (count === 0) {
      throw new NotFoundException({
        code: 'NO_RECIPES',
        message: '还没有菜谱，先去添加吧',
      });
    }
    const skip = Math.max(0, Math.floor(Math.random() * count));
    const recipes = await this.prisma.recipe.findMany({
      where,
      skip,
      take: 1,
    });
    const recipe = recipes[0];
    const favSet = await this.getFavoriteSet(userId, [recipe.id]);
    return this.toDto(recipe, favSet.has(recipe.id));
  }

  async findAll(userId: string, query: RecipeQueryDto): Promise<PaginatedResponseDto<RecipeDto>> {
    const familyId = await requireFamilyId(this.prisma, userId);

    const where: Prisma.RecipeWhereInput = {
      familyId,
      isDeleted: false,
    };
    if (query.search) {
      where.name = { contains: query.search };
    }
    if (query.mealTags?.length) {
      where.AND = (where.AND ?? []) as Prisma.RecipeWhereInput[];
      (where.AND as Prisma.RecipeWhereInput[]).push({
        OR: query.mealTags.map((tag) => ({
          mealTags: { array_contains: tag },
        })),
      });
    }
    if (query.flavorTags?.length) {
      where.AND = (where.AND ?? []) as Prisma.RecipeWhereInput[];
      (where.AND as Prisma.RecipeWhereInput[]).push({
        OR: query.flavorTags.map((tag) => ({
          flavorTags: { array_contains: tag },
        })),
      });
    }
    if (query.onlyFavorites) {
      where.favorites = { some: { userId } };
    }

    const orderBy: Prisma.RecipeOrderByWithRelationInput = (() => {
      switch (query.sort) {
        case 'order_count_desc':
          return { orderCount: 'desc' as const };
        case 'rating_desc':
          return { avgRating: 'desc' as const };
        case 'updated_desc':
        default:
          return { updatedAt: 'desc' as const };
      }
    })();

    const [items, total] = await this.prisma.$transaction([
      this.prisma.recipe.findMany({
        where,
        orderBy,
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.recipe.count({ where }),
    ]);

    // 批量查"我对这一页菜谱中哪些已收藏"，避免 N+1
    const favSet = await this.getFavoriteSet(
      userId,
      items.map((r) => r.id),
    );

    return paginate(
      items.map((r) => this.toDto(r, favSet.has(r.id))),
      total,
      query.page,
      query.pageSize,
    );
  }

  async findOne(userId: string, id: string): Promise<RecipeDto> {
    const recipe = await this.requireOwnedRecipe(userId, id);
    const favSet = await this.getFavoriteSet(userId, [recipe.id]);
    return this.toDto(recipe, favSet.has(recipe.id));
  }

  async update(userId: string, id: string, dto: UpdateRecipeDto): Promise<RecipeDto> {
    await this.requireOwnedRecipe(userId, id);
    const updated = await this.prisma.recipe.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.imageUrls !== undefined ? { imageUrls: dto.imageUrls } : {}),
        ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
        ...(dto.mealTags !== undefined ? { mealTags: dto.mealTags } : {}),
        ...(dto.flavorTags !== undefined ? { flavorTags: dto.flavorTags } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    const favSet = await this.getFavoriteSet(userId, [updated.id]);
    return this.toDto(updated, favSet.has(updated.id));
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    await this.requireOwnedRecipe(userId, id);
    await this.prisma.recipe.update({
      where: { id },
      data: { isDeleted: true },
    });
    return { id, deleted: true };
  }

  async favorite(userId: string, recipeId: string): Promise<{ favorited: true }> {
    await this.requireOwnedRecipe(userId, recipeId);
    try {
      await this.prisma.recipeFavorite.create({
        data: { userId, recipeId },
      });

      // 触发 recipe_favorited 成就评估
      void this.triggerRecipeFavorited(userId, recipeId);
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') {
        throw new ConflictException({
          code: 'ALREADY_FAVORITED',
          message: '已经收藏过这道菜',
        });
      }
      throw err;
    }
    return { favorited: true };
  }

  async unfavorite(userId: string, recipeId: string): Promise<{ favorited: false }> {
    await this.requireOwnedRecipe(userId, recipeId);
    await this.prisma.recipeFavorite.deleteMany({
      where: { userId, recipeId },
    });
    return { favorited: false };
  }

  // ---- internal ----

  private async getFavoriteSet(userId: string, recipeIds: string[]): Promise<Set<string>> {
    if (recipeIds.length === 0) return new Set();
    const rows = await this.prisma.recipeFavorite.findMany({
      where: { userId, recipeId: { in: recipeIds } },
      select: { recipeId: true },
    });
    return new Set(rows.map((r) => r.recipeId));
  }

  private async requireOwnedRecipe(userId: string, recipeId: string): Promise<Recipe> {
    const familyId = await requireFamilyId(this.prisma, userId);
    const recipe = await this.prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe || recipe.isDeleted) {
      throw new NotFoundException({
        code: 'RECIPE_NOT_FOUND',
        message: '菜谱不存在或已删除',
      });
    }
    if (recipe.familyId !== familyId) {
      throw new ForbiddenException({
        code: 'RECIPE_NOT_IN_YOUR_FAMILY',
        message: '不能操作其他小厨房的菜谱',
      });
    }
    return recipe;
  }

  private toDto(recipe: Recipe, isFavorited: boolean): RecipeDto {
    return {
      id: recipe.id,
      familyId: recipe.familyId,
      name: recipe.name,
      imageUrls: Array.isArray(recipe.imageUrls) ? (recipe.imageUrls as string[]) : [],
      difficulty: recipe.difficulty,
      mealTags: Array.isArray(recipe.mealTags) ? (recipe.mealTags as string[]) : [],
      flavorTags: Array.isArray(recipe.flavorTags) ? (recipe.flavorTags as string[]) : [],
      notes: recipe.notes,
      createdByUserId: recipe.createdByUserId,
      orderCount: recipe.orderCount,
      avgRating: recipe.avgRating,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      isFavorited,
    };
  }

  private async triggerRecipeCreated(
    userId: string,
    familyId: string,
    recipe: Recipe,
  ): Promise<void> {
    try {
      const ctx: EvaluateContext = {
        prisma: this.prisma,
        userId,
        familyId,
        triggerType: 'recipe_created',
        recipe: {
          id: recipe.id,
          familyId: recipe.familyId,
          createdByUserId: recipe.createdByUserId,
        },
      };
      await this.achievement.evaluate('recipe_created', ctx);
    } catch {
      // 成就评估失败不应影响主流程
    }
  }

  private async triggerRecipeFavorited(userId: string, recipeId: string): Promise<void> {
    try {
      const recipe = await this.prisma.recipe.findUnique({ where: { id: recipeId } });
      if (!recipe) return;
      const familyId = recipe.familyId;
      const ctx: EvaluateContext = {
        prisma: this.prisma,
        userId,
        familyId,
        triggerType: 'recipe_favorited',
        recipe: {
          id: recipe.id,
          familyId: recipe.familyId,
          createdByUserId: recipe.createdByUserId,
        },
      };
      await this.achievement.evaluate('recipe_favorited', ctx);
    } catch {
      // 成就评估失败不应影响主流程
    }
  }
}
