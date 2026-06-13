import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessConfigService } from '../../business-config/business-config.service';
import { AiProviderFactory, type AiProviderConfig } from '../providers/ai-provider.factory';
import { AiUsageService } from './ai-usage.service';
import { buildRecipeGenPrompt } from '../prompts';
import type { GenerateRecipeDto } from '../dto/ai.dto';
import type { AiFeatureType } from '../providers/types';

@Injectable()
export class RecipeGenService {
  private readonly logger = new Logger(RecipeGenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bizConfig: BusinessConfigService,
    private readonly providerFactory: AiProviderFactory,
    private readonly usageService: AiUsageService,
  ) {}

  async generate(userId: string, familyId: string, dto: GenerateRecipeDto) {
    const feature: AiFeatureType = 'recipe_generation';
    await this.usageService.checkRateLimit(userId, feature);

    // 查询家庭已有菜谱名称（去重参考）
    const existing = await this.prisma.recipe.findMany({
      where: { familyId, isDeleted: false },
      select: { name: true },
    });
    const existingRecipeNames = existing.map((r) => r.name);

    const { system, user } = buildRecipeGenPrompt({
      ingredients: dto.ingredients,
      mealTag: dto.mealTag,
      flavorTag: dto.flavorTag,
      difficulty: dto.difficulty,
      notes: dto.notes,
      existingRecipeNames,
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

    // 尝试解析 JSON
    try {
      const recipe = JSON.parse(result.content);
      return { recipe, tokens: result.usage };
    } catch {
      this.logger.warn('Failed to parse AI recipe JSON, returning raw content');
      return { recipe: { rawContent: result.content }, tokens: result.usage };
    }
  }

  /** 将生成的菜谱保存到家庭菜谱 */
  async saveToFamily(userId: string, familyId: string, data: {
    name: string;
    ingredients: string[];
    steps: string[];
    difficulty: number;
    cookingTimeMinutes?: number;
    tips?: string[];
    mealTags?: string[];
    flavorTags?: string[];
  }) {
    return this.prisma.recipe.create({
      data: {
        familyId,
        name: data.name,
        createdByUserId: userId,
        difficulty: data.difficulty,
        mealTags: data.mealTags ?? [],
        flavorTags: data.flavorTags ?? [],
        notes: data.tips ? data.tips.join('\n') : null,
        imageUrls: [],
        orderCount: 0,
      },
    });
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
