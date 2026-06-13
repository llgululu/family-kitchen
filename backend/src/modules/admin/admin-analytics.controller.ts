import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './admin.guard';
import { AdminAnalyticsService } from './admin-analytics.service';

@ApiTags('Admin · Analytics')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get()
  @ApiOperation({ summary: '数据分析：多维度图表数据' })
  getAnalytics() {
    return this.analyticsService.getAnalytics();
  }
}
