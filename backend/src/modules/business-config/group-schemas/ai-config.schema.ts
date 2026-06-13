import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AiConfigSchema {
  @ApiProperty({ description: '当前 AI Provider', enum: ['deepseek', 'openai', 'claude'] })
  @IsIn(['deepseek', 'openai', 'claude'])
  PROVIDER!: string;

  @ApiPropertyOptional({ description: 'DeepSeek 模型名' })
  @IsOptional()
  @IsString()
  DEEPSEEK_MODEL?: string;

  @ApiPropertyOptional({ description: 'OpenAI 模型名' })
  @IsOptional()
  @IsString()
  OPENAI_MODEL?: string;

  @ApiPropertyOptional({ description: 'OpenAI Base URL' })
  @IsOptional()
  @IsString()
  OPENAI_BASE_URL?: string;

  @ApiPropertyOptional({ description: 'Claude 模型名' })
  @IsOptional()
  @IsString()
  CLAUDE_MODEL?: string;

  @ApiPropertyOptional({ description: '温度参数', minimum: 0, maximum: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  TEMPERATURE?: number;

  @ApiPropertyOptional({ description: '最大 token 数', minimum: 100, maximum: 8192 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(8192)
  MAX_TOKENS?: number;

  @ApiPropertyOptional({ description: '菜谱生成功能开关' })
  @IsOptional()
  @IsBoolean()
  FEATURE_RECIPE_GENERATION_ENABLED?: boolean;

  @ApiPropertyOptional({ description: '智能推荐功能开关' })
  @IsOptional()
  @IsBoolean()
  FEATURE_SMART_RECOMMEND_ENABLED?: boolean;

  @ApiPropertyOptional({ description: '厨艺助手功能开关' })
  @IsOptional()
  @IsBoolean()
  FEATURE_COOKING_ASSISTANT_ENABLED?: boolean;

  @ApiPropertyOptional({ description: '营养分析功能开关' })
  @IsOptional()
  @IsBoolean()
  FEATURE_NUTRITION_ANALYSIS_ENABLED?: boolean;

  @ApiPropertyOptional({ description: '一周菜单功能开关' })
  @IsOptional()
  @IsBoolean()
  FEATURE_WEEKLY_PLAN_ENABLED?: boolean;

  @ApiPropertyOptional({ description: '菜谱生成每日上限', minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  RATE_LIMIT_RECIPE_GENERATION_PER_DAY?: number;

  @ApiPropertyOptional({ description: '智能推荐每日上限', minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  RATE_LIMIT_SMART_RECOMMEND_PER_DAY?: number;

  @ApiPropertyOptional({ description: '厨艺助手每日上限', minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  RATE_LIMIT_COOKING_ASSISTANT_PER_DAY?: number;

  @ApiPropertyOptional({ description: '营养分析每日上限', minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  RATE_LIMIT_NUTRITION_ANALYSIS_PER_DAY?: number;

  @ApiPropertyOptional({ description: '一周菜单每日上限', minimum: 1, maximum: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  RATE_LIMIT_WEEKLY_PLAN_PER_DAY?: number;
}
