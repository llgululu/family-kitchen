import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class FamilyLimitsSchema {
  @ApiProperty({ minimum: 2, maximum: 10 })
  @IsInt()
  @Min(2)
  @Max(10)
  MAX_MEMBERS!: number;

  @ApiProperty({ minimum: 1, maximum: 365 })
  @IsInt()
  @Min(1)
  @Max(365)
  RECOVERY_DAYS!: number;
}
