import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessConfigService } from '../../business-config/business-config.service';
import { AiProviderFactory, type AiProviderConfig } from '../providers/ai-provider.factory';
import { AiUsageService } from './ai-usage.service';
import { buildCookingAssistantPrompt } from '../prompts';
import { WsGateway } from '../../ws/ws.gateway';
import type { CookingAssistantDto } from '../dto/ai.dto';
import type { AiFeatureType, AiChatMessage } from '../providers/types';

@Injectable()
export class CookingAssistantService {
  private readonly logger = new Logger(CookingAssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bizConfig: BusinessConfigService,
    private readonly providerFactory: AiProviderFactory,
    private readonly usageService: AiUsageService,
    private readonly ws: WsGateway,
  ) {}

  async chat(userId: string, familyId: string, dto: CookingAssistantDto) {
    const feature: AiFeatureType = 'cooking_assistant';
    await this.usageService.checkRateLimit(userId, feature);

    // 查询订单
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: '订单不存在' });
    if (order.familyId !== familyId) {
      throw new ForbiddenException({ code: 'ORDER_NOT_IN_FAMILY', message: '非本家庭订单' });
    }
    if (order.customerUserId !== userId && order.chefUserId !== userId) {
      throw new ForbiddenException({ code: 'NOT_PARTICIPANT', message: '非订单参与者' });
    }

    // 获取菜谱信息
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId: dto.orderId },
      include: { recipe: true },
    });
    const firstRecipe = orderItems[0]?.recipe;
    const recipeSnapshot = orderItems[0]?.recipeSnapshot as Record<string, unknown> | null;
    const recipeName = firstRecipe?.name ?? (recipeSnapshot?.name as string) ?? '未知菜谱';
    const recipeSteps = firstRecipe
      ? (firstRecipe.notes?.split('\n').filter(Boolean) ?? [])
      : (recipeSnapshot?.steps as string[]) ?? [];
    const difficulty = firstRecipe?.difficulty ?? (recipeSnapshot?.difficulty as number) ?? 3;
    const cookingTimeMinutes = firstRecipe ? null : (recipeSnapshot?.cookingTimeMinutes as number) ?? null;

    // 获取/创建对话
    let conversationId = dto.conversationId;
    let previousMessages: Array<{ role: string; content: string }> = [];

    if (conversationId) {
      const conv = await this.prisma.aiConversation.findUnique({ where: { id: conversationId } });
      if (conv && conv.contextRefId === dto.orderId) {
        const msgs = await this.prisma.aiConversationMessage.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
          take: 20,
        });
        previousMessages = msgs.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }));
      } else {
        conversationId = undefined;
      }
    }

    if (!conversationId) {
      const conv = await this.prisma.aiConversation.create({
        data: {
          familyId,
          userId,
          type: 'cooking_assistant',
          contextRefId: dto.orderId,
        },
      });
      conversationId = conv.id;
    }

    // 保存用户消息
    await this.prisma.aiConversationMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: dto.message,
      },
    });

    const userRole = order.chefUserId === userId ? '厨师' : '食客';
    const { system, messages: chatHistory } = buildCookingAssistantPrompt({
      recipeName,
      recipeSteps,
      difficulty,
      cookingTimeMinutes,
      orderStatus: order.status,
      userRole,
      previousMessages,
    });

    const config = this.getProviderConfig();
    const provider = this.providerFactory.create(config);

    // 流式输出
    const allMessages: AiChatMessage[] = [
      { role: 'system', content: system },
      ...chatHistory,
      { role: 'user', content: dto.message },
    ];

    const start = Date.now();
    let fullContent = '';
    let promptTokens = 0;
    let completionTokens = 0;

    const recipientId = userId === order.chefUserId ? order.customerUserId : order.chefUserId;

    for await (const chunk of provider.streamComplete(allMessages)) {
      fullContent += chunk;
      // 通过 WS 发送给当前用户
      this.ws.sendToUser(userId, 'ai:stream', {
        orderId: dto.orderId,
        conversationId,
        delta: chunk,
        done: false,
      });
      // 同时发给对方（可见 AI 在辅助）
      this.ws.sendToUser(recipientId, 'ai:stream', {
        orderId: dto.orderId,
        conversationId,
        delta: chunk,
        done: false,
      });
    }

    completionTokens = Math.ceil(fullContent.length / 4); // 粗估

    // 发送完成信号
    this.ws.sendToUser(userId, 'ai:stream', {
      orderId: dto.orderId,
      conversationId,
      delta: '',
      done: true,
    });
    this.ws.sendToUser(recipientId, 'ai:stream', {
      orderId: dto.orderId,
      conversationId,
      delta: '',
      done: true,
    });

    const latencyMs = Date.now() - start;

    // 保存 AI 回复
    await this.prisma.aiConversationMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: fullContent,
        tokenCount: completionTokens,
      },
    });

    // 记录用量
    void this.usageService.logUsage({
      userId,
      familyId,
      provider: config.provider,
      model: this.getModelForProvider(config),
      feature,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs,
    });

    return { conversationId, content: fullContent };
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
