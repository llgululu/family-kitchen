import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class LovePointFormulaSchema {
  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  BASE!: number;

  @ApiProperty({ minimum: 0, maximum: 20 })
  @IsInt()
  @Min(0)
  @Max(20)
  DIFFICULTY_MULTIPLIER!: number;

  @ApiProperty({ minimum: 0, maximum: 20 })
  @IsInt()
  @Min(0)
  @Max(20)
  RATING_BONUS_MULTIPLIER!: number;

  @ApiProperty({ minimum: 0, maximum: 50 })
  @IsInt()
  @Min(0)
  @Max(50)
  FIVE_STAR_EXTRA_BONUS!: number;
}
