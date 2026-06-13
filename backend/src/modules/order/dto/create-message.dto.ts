import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateNested,
} from 'class-validator';
import { OrderMessageType } from '@family-kitchen/shared';
import { MaxLengthFromConfig } from '../../../common/dynamic-validators';

const SENDABLE_TYPES = [
  OrderMessageType.TEXT,
  OrderMessageType.EMOJI,
  OrderMessageType.IMAGE,
  OrderMessageType.RUSH,
  OrderMessageType.TIP,
] as const;

export class TipPayloadDto {
  @ApiProperty({ description: '打赏数量（爱心币）', minimum: 1, maximum: 999 })
  @IsInt()
  @Min(1)
  @Max(999)
  amount!: number;

  @ApiPropertyOptional({ description: '附带的趣味称号', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  title?: string;
}

export class CreateMessageDto {
  @ApiProperty({
    description: '消息类型',
    enum: SENDABLE_TYPES,
  })
  @IsEnum(SENDABLE_TYPES)
  type!: (typeof SENDABLE_TYPES)[number];

  @ApiPropertyOptional({
    description: '文本内容（type=text 必填；长度上限来自动态配置 order_timing.MESSAGE_MAX_LENGTH）',
  })
  @IsOptional()
  @IsString()
  @Validate(MaxLengthFromConfig, ['order_timing', 'message_max_length'])
  text?: string;

  @ApiPropertyOptional({ description: '表情 key（type=emoji 必填）', maxLength: 30 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  emojiKey?: string;

  @ApiPropertyOptional({ description: '图片 URL（type=image 必填）', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ type: TipPayloadDto, description: '打赏内容（type=tip 必填）' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TipPayloadDto)
  tip?: TipPayloadDto;
}

export class MessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true, description: '发送人；系统消息为 null' })
  senderUserId!: string | null;

  @ApiProperty({ enum: Object.values(OrderMessageType) })
  type!: string;

  @ApiProperty({ description: '内容（结构按 type 不同）', type: Object })
  content!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true, description: '对方已读时间' })
  readAt!: Date | null;
}
