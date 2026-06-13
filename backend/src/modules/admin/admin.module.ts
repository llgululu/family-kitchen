import { Module } from '@nestjs/common';
import { AdminMetricsController } from './admin-metrics.controller';
import { AdminMetricsService } from './admin-metrics.service';
import { AdminFamilyController } from './admin-family.controller';
import { AdminFamilyService } from './admin-family.service';
import { AdminUserController } from './admin-user.controller';
import { AdminUserService } from './admin-user.service';
import { AdminOrderController } from './admin-order.controller';
import { AdminOrderService } from './admin-order.service';
import { AdminBadgeController } from './admin-badge.controller';
import { AdminBadgeService } from './admin-badge.service';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminChefLevelController } from './admin-chef-level.controller';
import { AdminChefLevelService } from './admin-chef-level.service';
import { AdminGuard } from './admin.guard';

@Module({
  controllers: [
    AdminMetricsController,
    AdminFamilyController,
    AdminUserController,
    AdminOrderController,
    AdminBadgeController,
    AdminAnalyticsController,
    AdminChefLevelController,
  ],
  providers: [
    AdminGuard,
    AdminMetricsService,
    AdminFamilyService,
    AdminUserService,
    AdminOrderService,
    AdminBadgeService,
    AdminAnalyticsService,
    AdminChefLevelService,
  ],
})
export class AdminModule {}
