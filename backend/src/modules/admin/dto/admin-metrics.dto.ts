import { ApiProperty } from '@nestjs/swagger';

export class AdminMetricsDto {
  @ApiProperty({ description: '注册用户总数' })
  totalUsers!: number;

  @ApiProperty({ description: '家庭空间总数（含 dissolving）' })
  totalFamilies!: number;

  @ApiProperty({ description: '近 7 日有过订单的活跃家庭数' })
  activeFamiliesLast7d!: number;

  @ApiProperty({ description: '今日 DAU（独立活跃用户数；活跃=有任意写操作）' })
  todayDau!: number;

  @ApiProperty({ description: '本周完成订单数' })
  weeklyOrders!: number;

  @ApiProperty({
    description: '双活率：近 7 天双方都至少有 1 次活动的家庭 / 全部活跃家庭',
  })
  doubleActiveRate!: number;

  @ApiProperty({ description: '本月总爱心币流转量（绝对值之和）' })
  monthlyLovePointVolume!: number;

  @ApiProperty({ description: '生成此快照的时间' })
  snapshotAt!: Date;
}
