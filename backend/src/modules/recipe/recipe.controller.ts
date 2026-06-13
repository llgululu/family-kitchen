import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecipeService } from './recipe.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeQueryDto } from './dto/recipe-query.dto';
import { RecipeDto } from './dto/recipe.dto';
import { CurrentUser, type AuthUser } from '../../common/current-user.decorator';
import type { PaginatedResponseDto } from '../../common/pagination.dto';

@ApiTags('Recipe')
@ApiBearerAuth()
@Controller('recipes')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Post()
  @ApiOperation({ summary: '新建菜谱' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRecipeDto): Promise<RecipeDto> {
    return this.recipeService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '菜单列表（家庭维度，分页 + 搜索 + 标签筛选）' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: RecipeQueryDto,
  ): Promise<PaginatedResponseDto<RecipeDto>> {
    return this.recipeService.findAll(user.userId, query);
  }

  @Get('random')
  @ApiOperation({ summary: '随机推荐一道菜谱' })
  findRandom(@CurrentUser() user: AuthUser): Promise<RecipeDto> {
    return this.recipeService.findRandom(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '菜谱详情' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<RecipeDto> {
    return this.recipeService.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新菜谱（家庭成员均可）' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRecipeDto,
  ): Promise<RecipeDto> {
    return this.recipeService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除菜谱（软删除，历史订单仍可看快照）' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ id: string; deleted: true }> {
    return this.recipeService.remove(user.userId, id);
  }

  @Post(':id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '收藏菜谱（私房菜）' })
  favorite(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<{ favorited: true }> {
    return this.recipeService.favorite(user.userId, id);
  }

  @Delete(':id/favorite')
  @ApiOperation({ summary: '取消收藏' })
  unfavorite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ favorited: false }> {
    return this.recipeService.unfavorite(user.userId, id);
  }
}
