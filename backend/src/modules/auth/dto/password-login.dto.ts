import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Gender } from '@family-kitchen/shared';

export class PasswordLoginDto {
  @ApiProperty({ description: '手机号（账号）', example: '13800138000' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone!: string;

  @ApiProperty({ description: '登录密码', minLength: 6, maxLength: 64 })
  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(64)
  password!: string;

  @ApiPropertyOptional({ description: '性别（仅首次注册时使用）', enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: string;
}
