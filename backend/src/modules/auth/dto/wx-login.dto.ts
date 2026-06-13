import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Gender } from '@family-kitchen/shared';

export class WxLoginDto {
  @ApiProperty({ description: 'wx.login() 返回的 code', example: '0c1XYZ...' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ description: '性别', enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: string;
}

export class WxUserInfo {
  @ApiProperty({ description: '用户主键' })
  id!: string;

  @ApiProperty({ description: '昵称' })
  nickname!: string;

  @ApiProperty({ description: '头像 URL', nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ description: '性别', nullable: true, enum: Gender })
  gender!: string | null;

  @ApiProperty({ description: '当前所属家庭 ID', nullable: true })
  currentFamilyId!: string | null;
}

export class WxLoginResponseDto {
  @ApiProperty({ description: 'JWT，前端放 Authorization: Bearer <token>' })
  token!: string;

  @ApiProperty({ type: WxUserInfo })
  user!: WxUserInfo;

  @ApiProperty({ description: '是否新用户' })
  isNewUser!: boolean;
}
