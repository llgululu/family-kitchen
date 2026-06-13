import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

const TID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

export class WxTemplateIdsSchema {
  @ApiProperty({ pattern: TID_REGEX.source })
  @IsString()
  @MaxLength(128)
  @Matches(TID_REGEX)
  ORDER_ACCEPTED!: string;

  @ApiProperty({ pattern: TID_REGEX.source })
  @IsString()
  @MaxLength(128)
  @Matches(TID_REGEX)
  ORDER_SERVED!: string;

  @ApiProperty({ pattern: TID_REGEX.source })
  @IsString()
  @MaxLength(128)
  @Matches(TID_REGEX)
  ORDER_RUSHED!: string;

  @ApiProperty({ pattern: TID_REGEX.source })
  @IsString()
  @MaxLength(128)
  @Matches(TID_REGEX)
  ACHIEVEMENT_UNLOCKED!: string;
}
