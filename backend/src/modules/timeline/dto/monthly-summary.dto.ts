import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class MonthlySummaryQueryDto {
  @ApiPropertyOptional({
    description: 'YYYY-MM 格式，不传则取本月',
    example: '2026-05',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month 必须为 YYYY-MM 格式' })
  month?: string;
}

export class MonthlyTopRecipeDto {
  @ApiProperty()
  recipeName!: string;

  @ApiProperty({ nullable: true })
  recipeId!: string | null;

  @ApiProperty()
  count!: number;
}

export class MonthlyContributorDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  nickname!: string;

  @ApiProperty()
  cookedCount!: number;

  @ApiProperty()
  orderedCount!: number;
}

export class MonthlySummaryDto {
  @ApiProperty({ description: 'YYYY-MM' })
  month!: string;

  @ApiProperty({ description: '本月已完成订单数' })
  totalOrders!: number;

  @ApiProperty({ description: '本月平均评分（无订单则 null）', nullable: true })
  avgRating!: number | null;

  @ApiProperty({ description: '本月厨师做菜总爱心币' })
  totalLovePoints!: number;

  @ApiProperty({ description: 'Top 5 最常做的菜', type: [MonthlyTopRecipeDto] })
  topRecipes!: MonthlyTopRecipeDto[];

  @ApiProperty({ description: '成员贡献', type: [MonthlyContributorDto] })
  contributors!: MonthlyContributorDto[];

  @ApiProperty({ description: '当月解锁的徽章 keys', type: [String] })
  unlockedBadgeKeys!: string[];
}
