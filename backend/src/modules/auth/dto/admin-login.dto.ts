import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ description: '管理员账号' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ description: '管理员密码（明文）' })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class AdminLoginResponseDto {
  @ApiProperty()
  token!: string;

  @ApiProperty()
  username!: string;
}
