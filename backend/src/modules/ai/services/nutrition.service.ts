import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessConfigService } from '../../business-config/business-config.service';
import { AiProviderFactory, type AiProviderConfig } from '../providers/ai-provider.factory';
import { AiUsageService } from './ai-usage.service';
import { buildNutritionPrompt, buildWeeklyPlanPrompt } from '../prompts';
import type { NutritionAnalyzeDto, WeeklyPlanDto } from '../dto/ai.dto';
import type { AiFeatureType } from '../providers/types';

@Injectable()
export class NutritionService {
  private readonly logger = new Logger(NutritionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bizConfig: BusinessConfigService,
    private readonly providerFactory: AiProviderFactory,
    private readonly usageService: AiUsageService,
  ) {}

  async analyze(userId: string, familyId: string, dto: NutritionAnalyzeDto) {
    const feature: AiFeatureType = 'nutrition_analysis';
    await this.usageService.checkRateLimit(userId, feature);

    const recipesRaw = await this.prisma.recipe.findMany({
      where: { id: { in: dto.recipeIds }, familyId, isDeleted: false },
      select: { name: true, imageUrls: true, difficulty: true, notes: true },
    });

    if (recipesRaw.length === 0) {
      return { analysis: null, tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } };
    }

    const recipes = recipesRaw.map((r) => ({
      name: r.name,
      ingredients: r.notes ? r.notes.split('\n').filter(Boolean) : [r.name],
      difficulty: r.difficulty,
    }));

    const { system, user } = buildNutritionPrompt({ recipes });

    const result = await this.callAi(feature, userId, familyId, system, user);

    try {
      const analysis = JSON.parse(result.content);
      return { analysis, tokens: result.usage };
    } catch {
      this.logger.warn('Failed to parse nutrition analysis JSON');
      return { analysis: { rawContent: result.content }, tokens: result.usage };
    }
  }

  async weeklyPlan(userId: string, familyId: string, dto: WeeklyPlanDto) {
    const feature: AiFeatureType = 'weekly_plan';
    await this.usageService.checkRateLimit(userId, feature);

    const existingRecipesRaw = await this.prisma.recipe.findMany({
      where: { familyId, isDeleted: false },
      select: { id: true, name: true, difficulty: true, mealTags: true },
    });
    const existingRecipes = existingRecipesRaw.map((r) => ({
      ...r,
      mealTags: (r.mealTags as string[]) ?? [],
    }));

    const { system, user } = buildWeeklyPlanPrompt({
      preference: dto.preference,
      servings: dto.servings,
      existingRecipes,
    });

    const result = await this.callAi(feature, userId, familyId, system, user);

    try {
      const plan = JSON.parse(result.content);
      return { plan, tokens: result.usage };
    } catch {
      this.logger.warn('Failed to parse weekly plan JSON');
      return { plan: { rawContent: result.content }, tokens: result.usage };
    }
  }

  private async callAi(
    feature: AiFeatureType,
    userId: string,
    familyId: string,
    system: string,
    user: string,
  ) {
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

    return result;
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
