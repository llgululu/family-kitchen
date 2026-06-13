import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ORDER_TIMING } from '@family-kitchen/shared';

export class CreateOrderItemDto {
  @ApiProperty({ description: '菜谱 ID' })
  @IsString()
  @IsNotEmpty()
  recipeId!: string;

  @ApiPropertyOptional({ description: '单道菜的定制备注（如：少辣）', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customNotes?: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: '指定的厨师 user_id（必须是同家庭成员）' })
  @IsString()
  @IsNotEmpty()
  chefUserId!: string;

  @ApiProperty({
    type: [CreateOrderItemDto],
    description: '菜品列表，至少一道',
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: '订单整体备注', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNotes?: string;

  @ApiPropertyOptional({
    description: `期望上菜时间（ISO 8601），不填表示尽快`,
    example: '2026-05-13T19:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expectedServeAt?: string;

  @ApiPropertyOptional({
    description: `订单消息备用字段，保留`,
    maxLength: ORDER_TIMING.MESSAGE_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(ORDER_TIMING.MESSAGE_MAX_LENGTH)
  initialMessage?: string;
}
