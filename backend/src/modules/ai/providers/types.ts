/** AI 聊天消息 */
export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** AI 补全结果 */
export interface AiCompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** AI 流式输出块 */
export interface AiStreamChunk {
  delta: string;
  done: boolean;
}

/** AI Provider 名称 */
export type AiProviderName = 'deepseek' | 'openai' | 'claude';

/** AI 功能类型 */
export type AiFeatureType =
  | 'recipe_generation'
  | 'smart_recommend'
  | 'cooking_assistant'
  | 'nutrition_analysis'
  | 'weekly_plan';
