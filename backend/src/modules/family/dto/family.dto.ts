import { ApiProperty } from '@nestjs/swagger';

export class FamilyMemberDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  nickname!: string;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ enum: ['creator', 'member'] })
  role!: string;

  @ApiProperty()
  joinedAt!: Date;
}

export class FamilyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['couple', 'family'] })
  relationType!: string;

  @ApiProperty({ nullable: true })
  anniversaryDate!: Date | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  creatorUserId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: [FamilyMemberDto] })
  members!: FamilyMemberDto[];

  @ApiProperty({ description: '当前用户在此家庭的角色', nullable: true })
  myRole!: string | null;
}

export class InviteCodeDto {
  @ApiProperty({ description: '邀请码' })
  inviteCode!: string;

  @ApiProperty({ description: '过期时间' })
  expiresAt!: Date;
}
