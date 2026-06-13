import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessConfigService } from '../../business-config/business-config.service';
import { AiProviderFactory, type AiProviderConfig } from '../providers/ai-provider.factory';
import { AiUsageService } from './ai-usage.service';
import { buildRecommendPrompt } from '../prompts';
import type { SmartRecommendDto } from '../dto/ai.dto';
import type { AiFeatureType } from '../providers/types';

@Injectable()
export class RecommendService {
  private readonly logger = new Logger(RecommendService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bizConfig: BusinessConfigService,
    private readonly providerFactory: AiProviderFactory,
    private readonly usageService: AiUsageService,
  ) {}

  async recommend(userId: string, familyId: string, dto: SmartRecommendDto) {
    const feature: AiFeatureType = 'smart_recommend';
    await this.usageService.checkRateLimit(userId, feature);

    // 查询家庭菜谱
    const existingRecipesRaw = await this.prisma.recipe.findMany({
      where: { familyId, isDeleted: false },
      select: { id: true, name: true, avgRating: true, difficulty: true, mealTags: true, flavorTags: true },
    });
    const existingRecipes = existingRecipesRaw.map((r) => ({
      ...r,
      mealTags: (r.mealTags as string[]) ?? [],
      flavorTags: (r.flavorTags as string[]) ?? [],
    }));

    // 近14天订单的菜名
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const recentOrders = await this.prisma.order.findMany({
      where: { familyId, createdAt: { gte: since } },
      select: { items: { select: { recipeSnapshot: true } } },
    });
    const recentOrderNames = recentOrders
      .flatMap((o) => o.items.map((i) => (i.recipeSnapshot as Record<string, string>)?.name))
      .filter(Boolean) as string[];

    // 时间判断
    const hour = new Date().getHours();
    const timeOfDay = hour < 10 ? '早上' : hour < 14 ? '中午' : hour < 17 ? '下午' : '晚上';
    const isWeekend = [0, 6].includes(new Date().getDay());

    const { system, user } = buildRecommendPrompt({
      mealTag: dto.mealTag,
      servings: dto.servings,
      preference: dto.preference,
      existingRecipes,
      recentOrderNames,
      timeOfDay,
      isWeekend,
    });

    const config = this.getProviderConfig();
    const provider = this.providerFactory.create(config);

    const start = Date.now();
    const result = await provider.complete([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    const latencyMs = Date.now() - start;

    void this.usageService.logUsage({
      userId,
      familyId,
      provider: config.provider,
      model: this.getModelForProvider(config),
      feature,
      ...result.usage,
      latencyMs,
    });

    try {
      const recommendations = JSON.parse(result.content);
      return { recommendations, tokens: result.usage };
    } catch {
      this.logger.warn('Failed to parse AI recommend JSON');
      return { recommendations: [], tokens: result.usage };
    }
  }

  private getProviderConfig(): AiProviderConfig {
    const cfg = this.bizConfig.getAiConfig();
    return {
      provider: (cfg.PROVIDER as AiProviderConfig['provider']) ?? 'deepseek',
      deepseekApiKey: this.bizConfig.getEnv('DEEPSEEK_API_KEY', ''),
      deepseekModel: String(cfg.DEEPSEEK_MODEL ?? 'deepseek-chat'),
      openaiApiKey: this.bizConfig.getEnv('OPENAI_API_KEY', ''),
      openaiModel: String(cfg.OPENAI_MODEL ?? 'gpt-4o-mini'),
      openaiBaseUrl: String(cfg.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'),
      claudeApiKey: this.bizConfig.getEnv('CLAUDE_API_KEY', ''),
      claudeModel: String(cfg.CLAUDE_MODEL ?? 'claude-sonnet-4-6-20250514'),
    };
  }

  private getModelForProvider(config: AiProviderConfig): string {
    switch (config.provider) {
      case 'deepseek': return config.deepseekModel;
      case 'openai': return config.openaiModel;
      case 'claude': return config.claudeModel;
    }
  }
}
