import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class OrderTimingSchema {
  @ApiProperty({ minimum: 300, maximum: 604800 })
  @IsInt()
  @Min(300)
  @Max(604800)
  INVITE_CODE_TTL_SECONDS!: number;

  @ApiProperty({ minimum: 3600, maximum: 604800 })
  @IsInt()
  @Min(3600)
  @Max(604800)
  AUTO_RATE_AFTER_SERVED_SECONDS!: number;

  @ApiProperty({ minimum: 50, maximum: 2000 })
  @IsInt()
  @Min(50)
  @Max(2000)
  MESSAGE_MAX_LENGTH!: number;

  @ApiProperty({ minimum: 0, maximum: 180 })
  @IsInt()
  @Min(0)
  @Max(180)
  REMIND_CHEF_BEFORE_MINUTES!: number;
}
