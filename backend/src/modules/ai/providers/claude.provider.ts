import { Injectable, Logger } from '@nestjs/common';
import type { IAiProvider } from './ai-provider.interface';
import type { AiChatMessage, AiCompletionResult } from './types';

@Injectable()
export class ClaudeProvider implements IAiProvider {
  private readonly logger = new Logger(ClaudeProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(
    messages: AiChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<AiCompletionResult> {
    const start = Date.now();

    // Claude API: system prompt is top-level, messages only user/assistant
    const systemMsg = messages.find((m) => m.role === 'system')?.content;
    const chatMsgs = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens ?? 2048,
        system: systemMsg ?? undefined,
        messages: chatMsgs,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Claude API error ${res.status}: ${body}`);
      throw new Error(`Claude API error: ${res.status}`);
    }

    const data = await res.json();
    this.logger.debug(`Claude complete in ${Date.now() - start}ms, model=${this.model}`);

    const content = data.content?.map((b: { text: string }) => b.text).join('') ?? '';

    return {
      content,
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
    };
  }

  async *streamComplete(
    messages: AiChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): AsyncGenerator<string, void, unknown> {
    const systemMsg = messages.find((m) => m.role === 'system')?.content;
    const chatMsgs = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens ?? 2048,
        system: systemMsg ?? undefined,
        messages: chatMsgs,
        stream: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Claude stream error ${res.status}: ${body}`);
      throw new Error(`Claude stream error: ${res.status}`);
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
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          if (json.type === 'content_block_delta') {
            const delta = json.delta?.text;
            if (delta) yield delta;
          }
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
    } catch {
      return { ok: false, model: this.model };
    }
  }
}
