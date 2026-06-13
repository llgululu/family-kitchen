import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination.dto';

const toArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

export const FeedbackStatus = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  CLOSED: 'closed',
} as const;
export type FeedbackStatus = (typeof FeedbackStatus)[keyof typeof FeedbackStatus];

export class CreateFeedbackDto {
  @ApiProperty({ description: '反馈内容', minLength: 5, maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(2000)
  content!: string;

  @ApiPropertyOptional({ description: '联系方式（邮箱/微信号）', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact?: string;

  @ApiPropertyOptional({ description: 'App 版本', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;

  @ApiPropertyOptional({
    description: '平台',
    enum: ['mp-weixin', 'admin', 'h5', 'other'],
  })
  @IsOptional()
  @IsEnum(['mp-weixin', 'admin', 'h5', 'other'])
  platform?: string;
}

export class FeedbackDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  userId!: string | null;

  @ApiProperty()
  content!: string;

  @ApiProperty({ nullable: true })
  contact!: string | null;

  @ApiProperty({ enum: Object.values(FeedbackStatus) })
  status!: string;

  @ApiProperty({ nullable: true })
  appVersion!: string | null;

  @ApiProperty({ nullable: true })
  platform!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class FeedbackQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: '按状态筛选',
    enum: Object.values(FeedbackStatus),
    isArray: true,
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(FeedbackStatus, { each: true })
  statuses?: string[];
}

export class UpdateFeedbackStatusDto {
  @ApiProperty({ enum: Object.values(FeedbackStatus) })
  @IsEnum(FeedbackStatus)
  status!: FeedbackStatus;
}
