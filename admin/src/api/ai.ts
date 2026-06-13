import { http, type PaginatedResponse } from './http';

export interface AiConfig {
  PROVIDER: string;
  DEEPSEEK_MODEL: string;
  OPENAI_MODEL: string;
  OPENAI_BASE_URL: string;
  CLAUDE_MODEL: string;
  TEMPERATURE: number;
  MAX_TOKENS: number;
  FEATURE_RECIPE_GENERATION_ENABLED: boolean;
  FEATURE_SMART_RECOMMEND_ENABLED: boolean;
  FEATURE_COOKING_ASSISTANT_ENABLED: boolean;
  FEATURE_NUTRITION_ANALYSIS_ENABLED: boolean;
  FEATURE_WEEKLY_PLAN_ENABLED: boolean;
  RATE_LIMIT_RECIPE_GENERATION_PER_DAY: number;
  RATE_LIMIT_SMART_RECOMMEND_PER_DAY: number;
  RATE_LIMIT_COOKING_ASSISTANT_PER_DAY: number;
  RATE_LIMIT_NUTRITION_ANALYSIS_PER_DAY: number;
  RATE_LIMIT_WEEKLY_PLAN_PER_DAY: number;
}

export interface AiUsageStats {
  totalCalls: number;
  totalTokens: number;
  avgLatencyMs: number;
  byFeature: Record<string, { calls: number; tokens: number }>;
}

export interface AiUsageLog {
  id: string;
  userId: string;
  familyId: string;
  provider: string;
  model: string;
  feature: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  createdAt: string;
}

export const aiApi = {
  getConfig(): Promise<AiConfig> {
    return http.get('/admin/ai/config');
  },

  updateConfig(data: Partial<AiConfig>, operatorId: string): Promise<AiConfig> {
    return http.post('/admin/ai/config', data, { params: { operatorId } });
  },

  testConnection(provider: string): Promise<{ ok: boolean; model: string }> {
    return http.post('/admin/ai/test-connection', { provider });
  },

  getUsageStats(days?: number): Promise<AiUsageStats> {
    return http.get('/admin/ai/usage/stats', { params: { days } });
  },

  getUsageLogs(params?: {
    page?: number;
    pageSize?: number;
    feature?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<AiUsageLog>> {
    return http.get('/admin/ai/usage/logs', { params });
  },
};
