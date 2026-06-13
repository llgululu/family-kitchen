import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '@family-kitchen/shared';
import { PaginationQueryDto } from '../../../common/pagination.dto';

const toArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

export class OrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: '按状态筛选（多个用逗号分隔）',
    enum: Object.values(OrderStatus),
    isArray: true,
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(OrderStatus, { each: true })
  statuses?: string[];

  @ApiPropertyOptional({
    description: '我作为什么角色查',
    enum: ['customer', 'chef', 'any'],
    default: 'any',
  })
  @IsOptional()
  @IsEnum(['customer', 'chef', 'any'])
  role?: 'customer' | 'chef' | 'any' = 'any';
}
