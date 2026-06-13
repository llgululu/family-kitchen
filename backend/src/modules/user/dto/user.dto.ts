import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nickname!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true, enum: ['male', 'female'] })
  gender!: string | null;

  @ApiProperty({ nullable: true })
  signature!: string | null;

  @ApiProperty({ nullable: true })
  currentFamilyId!: string | null;

  @ApiProperty({ nullable: true, description: '已绑定的手机号（H5 登录账号）' })
  phone!: string | null;

  @ApiProperty({ description: '是否已设置登录密码（H5 可凭手机号+密码登录）' })
  hasPassword!: boolean;

  @ApiProperty()
  createdAt!: Date;
}
