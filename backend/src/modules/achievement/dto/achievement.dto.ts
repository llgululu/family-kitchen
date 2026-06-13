import { ApiProperty } from '@nestjs/swagger';

export class AchievementDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['user', 'family'] })
  ownerType!: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty({ description: '徽章 key（对应 BadgeDefinition）' })
  badgeKey!: string;

  @ApiProperty({ description: '展示标题', nullable: true })
  title!: string | null;

  @ApiProperty({ description: '展示描述', nullable: true })
  description!: string | null;

  @ApiProperty({ description: '徽章 Emoji', nullable: true })
  emoji!: string | null;

  @ApiProperty({ description: '徽章分类', nullable: true })
  category!: string | null;

  @ApiProperty({ description: '是否隐藏彩蛋' })
  hidden!: boolean;

  @ApiProperty({ nullable: true })
  sourceOrderId!: string | null;

  @ApiProperty({ description: '解锁时的快照数据', type: Object })
  metadata!: Record<string, unknown>;

  @ApiProperty()
  unlockedAt!: Date;
}
