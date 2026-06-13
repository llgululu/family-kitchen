import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FlavorTag, MealTag } from '@family-kitchen/shared';
import { PaginationQueryDto } from '../../../common/pagination.dto';

/** 把 ?mealTags=a,b 或 ?mealTags=a&mealTags=b 都规整成 string[] */
const toArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

export class RecipeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按菜名模糊搜索', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  search?: string;

  @ApiPropertyOptional({
    description: '餐段标签筛选，多个用逗号分隔或重复参数',
    enum: Object.values(MealTag),
    isArray: true,
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(MealTag, { each: true })
  mealTags?: string[];

  @ApiPropertyOptional({
    description: '口味标签筛选',
    enum: Object.values(FlavorTag),
    isArray: true,
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(FlavorTag, { each: true })
  flavorTags?: string[];

  @ApiPropertyOptional({
    description: '排序方式',
    enum: ['updated_desc', 'order_count_desc', 'rating_desc'],
    default: 'updated_desc',
  })
  @IsOptional()
  @IsEnum(['updated_desc', 'order_count_desc', 'rating_desc'])
  sort?: 'updated_desc' | 'order_count_desc' | 'rating_desc' = 'updated_desc';

  @ApiPropertyOptional({ description: '仅查我收藏的菜谱', default: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  onlyFavorites?: boolean;
}
