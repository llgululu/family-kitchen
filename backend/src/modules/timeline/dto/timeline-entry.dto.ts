import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination.dto';

export class TimelineEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['order', 'manual'] })
  sourceType!: string;

  @ApiProperty({ nullable: true })
  sourceOrderId!: string | null;

  @ApiProperty()
  occurredAt!: Date;

  @ApiProperty({ type: [String] })
  imageUrls!: string[];

  @ApiProperty({ nullable: true })
  customerUserId!: string | null;

  @ApiProperty({ nullable: true })
  customerNickname!: string | null;

  @ApiProperty({ nullable: true })
  chefUserId!: string | null;

  @ApiProperty({ nullable: true })
  chefNickname!: string | null;

  @ApiProperty({ nullable: true })
  customerComment!: string | null;

  @ApiProperty({ nullable: true })
  chefComment!: string | null;

  @ApiProperty({ description: '当前用户是否对自己隐藏了此条目（对方仍可见）' })
  hiddenForMe!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

export class TimelineQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '起始时间（含），YYYY-MM-DD 或 ISO 8601' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: '结束时间（含）' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateManualEntryDto {
  @ApiProperty({ description: '事件发生时间' })
  @IsDateString()
  occurredAt!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Type(() => String)
  imageUrls?: string[];

  @ApiPropertyOptional({ description: '我的留言', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class ReplyTimelineEntryDto {
  @ApiProperty({ description: '回复内容', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  comment!: string;
}
