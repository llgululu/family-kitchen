import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class AcceptOrderDto {
  @ApiPropertyOptional({
    description: '接单时同时调整期望上菜时间（ISO 8601），不填则沿用食客的时间',
  })
  @IsOptional()
  @IsDateString()
  expectedServeAt?: string;
}
