import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Validate,
} from 'class-validator';
import {
  ArrayMaxSizeFromConfig,
  MaxFromConfig,
  MaxLengthFromConfig,
  MinFromConfig,
} from '../../../common/dynamic-validators';

export class CreateRatingDto {
  @ApiProperty({ description: '评分（范围来自动态配置 rating_limits）' })
  @IsInt()
  @Validate(MinFromConfig, ['rating_limits', 'min'])
  @Validate(MaxFromConfig, ['rating_limits', 'max'])
  stars!: number;

  @ApiPropertyOptional({
    description: '评价文字（长度上限来自动态配置 rating_limits.COMMENT_MAX_LENGTH）',
  })
  @IsOptional()
  @IsString()
  @Validate(MaxLengthFromConfig, ['rating_limits', 'comment_max_length'])
  comment?: string;

  @ApiPropertyOptional({
    description: '评价图片（数量上限来自动态配置 rating_limits.MAX_IMAGES）',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @Validate(ArrayMaxSizeFromConfig, ['rating_limits', 'max_images'])
  @IsUrl({}, { each: true })
  imageUrls?: string[];
}

export class RatingDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  raterUserId!: string;

  @ApiProperty()
  stars!: number;

  @ApiProperty({ nullable: true })
  comment!: string | null;

  @ApiProperty({ type: [String] })
  imageUrls!: string[];

  @ApiProperty()
  createdAt!: Date;
}

export class RatingSettlementResultDto {
  @ApiProperty({ type: RatingDto })
  rating!: RatingDto;

  @ApiProperty({ description: '本订单产生的总爱心币（给厨师）' })
  lovePointsAwarded!: number;

  @ApiProperty({ description: '订单当前状态（应为 completed）' })
  orderStatus!: string;

  @ApiProperty({ description: '生成的时间线条目 ID' })
  timelineEntryId!: string;
}
