import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from './admin.guard';
import { AdminMetricsService } from './admin-metrics.service';
import { AdminMetricsDto } from './dto/admin-metrics.dto';

@ApiTags('Admin · Metrics')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/metrics')
export class AdminMetricsController {
  constructor(private readonly metricsService: AdminMetricsService) {}

  @Get()
  @ApiOperation({ summary: '数据看板：核心指标快照' })
  snapshot(): Promise<AdminMetricsDto> {
    return this.metricsService.snapshot();
  }
}
