import { Injectable, Logger } from '@nestjs/common';
import type { IAiProvider } from './ai-provider.interface';
import type { AiProviderName } from './types';
import { DeepSeekProvider } from './deepseek.provider';
import { OpenAiProvider } from './openai.provider';
import { ClaudeProvider } from './claude.provider';

export interface AiProviderConfig {
  provider: AiProviderName;
  deepseekApiKey: string;
  deepseekModel: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
  claudeApiKey: string;
  claudeModel: string;
}

@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);
  private cache: { key: string; provider: IAiProvider } | null = null;

  create(config: AiProviderConfig): IAiProvider {
    const key = `${config.provider}:${config.deepseekApiKey}:${config.openaiApiKey}:${config.claudeApiKey}`;
    if (this.cache && this.cache.key === key) {
      return this.cache.provider;
    }

    let provider: IAiProvider;
    switch (config.provider) {
      case 'deepseek':
        provider = new DeepSeekProvider(config.deepseekApiKey, config.deepseekModel);
        break;
      case 'openai':
        provider = new OpenAiProvider(config.openaiApiKey, config.openaiModel, config.openaiBaseUrl);
        break;
      case 'claude':
        provider = new ClaudeProvider(config.claudeApiKey, config.claudeModel);
        break;
      default:
        throw new Error(`Unknown AI provider: ${String(config.provider)}`);
    }

    this.logger.log(`AI provider created: ${config.provider}`);
    this.cache = { key, provider };
    return provider;
  }
}
