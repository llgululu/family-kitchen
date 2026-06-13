import { ApiProperty } from '@nestjs/swagger';

export class RecipeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  familyId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String] })
  imageUrls!: string[];

  @ApiProperty({ minimum: 1, maximum: 5 })
  difficulty!: number;

  @ApiProperty({ type: [String] })
  mealTags!: string[];

  @ApiProperty({ type: [String] })
  flavorTags!: string[];

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty({ description: '被点过的次数（冗余字段）' })
  orderCount!: number;

  @ApiProperty({ description: '平均评分，未被点过则为 null', nullable: true })
  avgRating!: number | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ description: '当前用户是否收藏' })
  isFavorited!: boolean;
}
