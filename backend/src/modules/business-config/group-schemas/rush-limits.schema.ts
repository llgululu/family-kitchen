import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class RushLimitsSchema {
  @ApiProperty({ minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  MAX_PER_ORDER!: number;

  @ApiProperty({ minimum: 30, maximum: 3600 })
  @IsInt()
  @Min(30)
  @Max(3600)
  COOLDOWN_SECONDS!: number;
}
