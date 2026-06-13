import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../admin/admin.guard';
import { BusinessConfigService } from '../../business-config/business-config.service';
import { AiUsageService } from '../services/ai-usage.service';
import { AiProviderFactory, type AiProviderConfig } from '../providers/ai-provider.factory';
import type { GroupKey } from '../../business-config/config-registry';

@ApiTags('Admin · AI')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/ai')
export class AdminAiController {
  constructor(
    private readonly bizConfig: BusinessConfigService,
    private readonly usageService: AiUsageService,
    private readonly providerFactory: AiProviderFactory,
  ) {}

  @Get('config')
  @ApiOperation({ summary: '获取 AI 配置' })
  getConfig() {
    return this.bizConfig.getAiConfig();
  }

  @Post('config')
  @ApiOperation({ summary: '更新 AI 配置' })
  async updateConfig(
    @Body() body: Record<string, unknown>,
    @Query('operatorId') operatorId: string,
  ) {
    return this.bizConfig.update('ai_config' as GroupKey, body, operatorId);
  }

  @Post('test-connection')
  @ApiOperation({ summary: '测试 AI Provider 连接' })
  async testConnection(@Body() body: { provider: string }) {
    const cfg = this.bizConfig.getAiConfig();
    const config: AiProviderConfig = {
      provider: (body.provider ?? cfg.PROVIDER ?? 'deepseek') as AiProviderConfig['provider'],
      deepseekApiKey: this.bizConfig.getEnv('DEEPSEEK_API_KEY', ''),
      deepseekModel: String(cfg.DEEPSEEK_MODEL ?? 'deepseek-chat'),
      openaiApiKey: this.bizConfig.getEnv('OPENAI_API_KEY', ''),
      openaiModel: String(cfg.OPENAI_MODEL ?? 'gpt-4o-mini'),
      openaiBaseUrl: String(cfg.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'),
      claudeApiKey: this.bizConfig.getEnv('CLAUDE_API_KEY', ''),
      claudeModel: String(cfg.CLAUDE_MODEL ?? 'claude-sonnet-4-6-20250514'),
    };

    const provider = this.providerFactory.create(config);
    return provider.testConnection();
  }

  @Get('usage/stats')
  @ApiOperation({ summary: 'AI 用量聚合统计' })
  async getUsageStats(@Query('days') days?: string) {
    return this.usageService.getAggregatedStats(days ? Number(days) : 30);
  }

  @Get('usage/logs')
  @ApiOperation({ summary: 'AI 用量日志' })
  async getUsageLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('feature') feature?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.usageService.getUsageStats({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      feature,
      startDate,
      endDate,
    });
  }
}
