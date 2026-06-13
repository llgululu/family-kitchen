import { Injectable, Logger } from '@nestjs/common';
import type { IAiProvider } from './ai-provider.interface';
import type { AiChatMessage, AiCompletionResult } from './types';

@Injectable()
export class DeepSeekProvider implements IAiProvider {
  private readonly logger = new Logger(DeepSeekProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(
    messages: AiChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<AiCompletionResult> {
    const start = Date.now();
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`DeepSeek API error ${res.status}: ${body}`);
      throw new Error(`DeepSeek API error: ${res.status}`);
    }

    const data = await res.json();
    this.logger.debug(`DeepSeek complete in ${Date.now() - start}ms, model=${this.model}`);

    return {
      content: data.choices?.[0]?.message?.content ?? '',
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
    };
  }

  async *streamComplete(
    messages: AiChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): AsyncGenerator<string, void, unknown> {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`DeepSeek stream error ${res.status}: ${body}`);
      throw new Error(`DeepSeek stream error: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No readable stream');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  async testConnection(): Promise<{ ok: boolean; model: string }> {
    try {
      const res = await this.complete(
        [{ role: 'user', content: 'Hi' }],
        { maxTokens: 5 },
      );
      return { ok: res.content.length > 0, model: this.model };
    } catch (e) {
      return { ok: false, model: this.model };
    }
  }
}
