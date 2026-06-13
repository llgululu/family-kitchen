import { Module } from '@nestjs/common';
import { OrderModule } from '../order/order.module';
import { AutoRateCron } from './auto-rate.cron';
import { FamilyCleanupCron } from './family-cleanup.cron';
import { OrderRemindCron } from './order-remind.cron';
import { AchievementDailyCron } from './achievement-daily.cron';

@Module({
  imports: [OrderModule], // 复用 RatingService
  providers: [AutoRateCron, FamilyCleanupCron, OrderRemindCron, AchievementDailyCron],
})
export class CronModule {}
