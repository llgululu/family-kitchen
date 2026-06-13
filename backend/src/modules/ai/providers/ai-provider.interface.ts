import type { AiChatMessage, AiCompletionResult } from './types';

/** AI Provider 统一接口 */
export interface IAiProvider {
  /** 非流式补全 */
  complete(
    messages: AiChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<AiCompletionResult>;

  /** 流式补全 — 返回 async generator */
  streamComplete(
    messages: AiChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): AsyncGenerator<string, void, unknown>;

  /** 测试连接是否正常 */
  testConnection(): Promise<{ ok: boolean; model: string }>;
}
