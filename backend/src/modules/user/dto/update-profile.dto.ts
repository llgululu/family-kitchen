import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Gender } from '@family-kitchen/shared';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '昵称', minLength: 1, maxLength: 30 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  nickname?: string;

  @ApiPropertyOptional({ description: '头像 URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '性别', enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: string;

  @ApiPropertyOptional({ description: '个性签名', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  signature?: string;
}
