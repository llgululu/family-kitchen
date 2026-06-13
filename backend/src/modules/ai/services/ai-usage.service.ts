import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessConfigService } from '../../business-config/business-config.service';
import type { AiFeatureType } from '../providers/types';

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bizConfig: BusinessConfigService,
  ) {}

  /** 检查功能开关 + 每日速率限制 */
  async checkRateLimit(userId: string, feature: AiFeatureType): Promise<void> {
    const aiConfig = this.bizConfig.getAiConfig();

    // 检查功能开关
    const featureKey = `FEATURE_${feature.toUpperCase()}_ENABLED` as keyof typeof aiConfig;
    if (aiConfig[featureKey] === false) {
      throw new BadRequestException({
        code: 'AI_FEATURE_DISABLED',
        message: `AI 功能 ${feature} 未启用`,
      });
    }

    // 检查速率限制
    const rateLimitKey = `RATE_LIMIT_${feature.toUpperCase()}_PER_DAY` as keyof typeof aiConfig;
    const limit = Number(aiConfig[rateLimitKey]) || 50;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const count = await this.prisma.aiUsageLog.count({
      where: {
        userId,
        feature,
        createdAt: { gte: todayStart },
      },
    });

    if (count >= limit) {
      throw new BadRequestException({
        code: 'AI_RATE_LIMIT_EXCEEDED',
        message: `今日 ${feature} 使用次数已达上限 (${limit})`,
      });
    }
  }

  /** 记录用量 */
  async logUsage(params: {
    userId: string;
    familyId: string;
    provider: string;
    model: string;
    feature: AiFeatureType;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs: number;
  }): Promise<void> {
    try {
      await this.prisma.aiUsageLog.create({
        data: {
          userId: params.userId,
          familyId: params.familyId,
          provider: params.provider,
          model: params.model,
          feature: params.feature,
          promptTokens: params.promptTokens,
          completionTokens: params.completionTokens,
          totalTokens: params.totalTokens,
          latencyMs: params.latencyMs,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to log AI usage: ${(e as Error).message}`);
    }
  }

  /** 管理后台统计查询 */
  async getUsageStats(params: {
    startDate?: string;
    endDate?: string;
    feature?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: unknown[]; total: number; page: number; pageSize: number }> {
    const where: Record<string, unknown> = {};
    if (params.feature) where.feature = params.feature;
    if (params.startDate || params.endDate) {
      const createdAt: Record<string, Date> = {};
      if (params.startDate) createdAt.gte = new Date(params.startDate);
      if (params.endDate) createdAt.lte = new Date(params.endDate);
      where.createdAt = createdAt;
    }

    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.aiUsageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.aiUsageLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /** 获取聚合统计 */
  async getAggregatedStats(days = 30): Promise<{
    totalCalls: number;
    totalTokens: number;
    avgLatencyMs: number;
    byFeature: Record<string, { calls: number; tokens: number }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.prisma.aiUsageLog.findMany({
      where: { createdAt: { gte: since } },
      select: { feature: true, totalTokens: true, latencyMs: true },
    });

    const byFeature: Record<string, { calls: number; tokens: number }> = {};
    let totalLatency = 0;

    for (const log of logs) {
      if (!byFeature[log.feature]) {
        byFeature[log.feature] = { calls: 0, tokens: 0 };
      }
      byFeature[log.feature].calls++;
      byFeature[log.feature].tokens += log.totalTokens;
      totalLatency += log.latencyMs;
    }

    return {
      totalCalls: logs.length,
      totalTokens: logs.reduce((s: number, l: { totalTokens: number }) => s + l.totalTokens, 0),
      avgLatencyMs: logs.length > 0 ? Math.round(totalLatency / logs.length) : 0,
      byFeature,
    };
  }
}
