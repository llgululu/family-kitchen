import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Validate } from 'class-validator';
import { ConfigRegistry } from '../modules/business-config/config-registry';
import { MaxFromConfig } from './dynamic-validators';

/** 通用分页查询参数 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: '页码，从 1 开始', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: '每页条数（上限来自动态配置）' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Validate(MaxFromConfig, ['pagination', 'max_page_size'])
  pageSize: number = ConfigRegistry.getInstance().getNumber('pagination', 'default_page_size');

  get skip(): number {
    return (this.page - 1) * this.pageSize;
  }

  get take(): number {
    return this.pageSize;
  }
}

/** 通用分页响应 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: '数据列表', isArray: true })
  items!: T[];

  @ApiProperty({ description: '总条数' })
  total!: number;

  @ApiProperty({ description: '当前页' })
  page!: number;

  @ApiProperty({ description: '每页条数' })
  pageSize!: number;

  @ApiProperty({ description: '总页数' })
  totalPages!: number;
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponseDto<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
