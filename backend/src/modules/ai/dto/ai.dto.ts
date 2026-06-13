import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** 菜谱生成 DTO */
export class GenerateRecipeDto {
  @ApiProperty({ description: '食材列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ingredients!: string[];

  @ApiPropertyOptional({ description: '餐段标签' })
  @IsOptional()
  @IsString()
  mealTag?: string;

  @ApiPropertyOptional({ description: '口味标签' })
  @IsOptional()
  @IsString()
  flavorTag?: string;

  @ApiPropertyOptional({ description: '难度 1-5' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ description: '补充说明' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/** 智能推荐 DTO */
export class SmartRecommendDto {
  @ApiPropertyOptional({ description: '餐段标签' })
  @IsOptional()
  @IsString()
  mealTag?: string;

  @ApiPropertyOptional({ description: '用餐人数' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  servings?: number;

  @ApiPropertyOptional({ description: '偏好描述' })
  @IsOptional()
  @IsString()
  preference?: string;
}

/** 厨艺助手对话 DTO */
export class CookingAssistantDto {
  @ApiProperty({ description: '订单 ID' })
  @IsString()
  orderId!: string;

  @ApiProperty({ description: '用户消息' })
  @IsString()
  message!: string;

  @ApiPropertyOptional({ description: '对话 ID（续聊时传）' })
  @IsOptional()
  @IsString()
  conversationId?: string;
}

/** 营养分析 DTO */
export class NutritionAnalyzeDto {
  @ApiProperty({ description: '菜谱 ID 列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  recipeIds!: string[];
}

/** 一周菜单规划 DTO */
export class WeeklyPlanDto {
  @ApiPropertyOptional({ description: '偏好描述' })
  @IsOptional()
  @IsString()
  preference?: string;

  @ApiPropertyOptional({ description: '用餐人数' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  servings?: number;
}
