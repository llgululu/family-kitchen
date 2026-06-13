import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  Validate,
} from 'class-validator';
import { FlavorTag, MealTag } from '@family-kitchen/shared';
import {
  ArrayMaxSizeFromConfig,
  MaxFromConfig,
  MaxLengthFromConfig,
  MinFromConfig,
} from '../../../common/dynamic-validators';

export class CreateRecipeDto {
  @ApiProperty({
    description: '菜名（长度上限来自动态配置 recipe_limits.NAME_MAX_LENGTH）',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  @Validate(MaxLengthFromConfig, ['recipe_limits', 'name_max_length'])
  name!: string;

  @ApiPropertyOptional({
    description: '图片 URL 列表（数量上限来自动态配置 recipe_limits.MAX_IMAGES）',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @Validate(ArrayMaxSizeFromConfig, ['recipe_limits', 'max_images'])
  @IsUrl({ require_tld: false, require_protocol: true }, { each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({
    description: '难度（范围来自动态配置 recipe_limits）',
    default: 3,
  })
  @IsOptional()
  @IsInt()
  @Validate(MinFromConfig, ['recipe_limits', 'difficulty_min'])
  @Validate(MaxFromConfig, ['recipe_limits', 'difficulty_max'])
  difficulty?: number;

  @ApiPropertyOptional({
    description: '餐段标签',
    enum: Object.values(MealTag),
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(MealTag, { each: true })
  mealTags?: string[];

  @ApiPropertyOptional({
    description: '口味标签',
    enum: Object.values(FlavorTag),
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(FlavorTag, { each: true })
  flavorTags?: string[];

  @ApiPropertyOptional({
    description: '备注 / 做法说明（长度上限来自动态配置 recipe_limits.NOTES_MAX_LENGTH）',
  })
  @IsOptional()
  @IsString()
  @Validate(MaxLengthFromConfig, ['recipe_limits', 'notes_max_length'])
  notes?: string;
}
