import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class JoinFamilyDto {
  @ApiProperty({ description: '邀请码（8-12 位字母数字）' })
  @IsString()
  @IsNotEmpty()
  inviteCode!: string;
}
