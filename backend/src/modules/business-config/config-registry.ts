import {
  LOVE_POINT_FORMULA,
  RUSH_LIMITS,
  ORDER_TIMING,
  RECIPE_LIMITS,
  FAMILY_LIMITS,
  RATING_LIMITS,
  PAGINATION,
  WX_MINIPROGRAM,
} from '@family-kitchen/shared';

export type GroupKey =
  | 'love_point_formula'
  | 'rush_limits'
  | 'order_timing'
  | 'recipe_limits'
  | 'family_limits'
  | 'rating_limits'
  | 'pagination'
  | 'wx_template_ids'
  | 'ai_config';

export const ALL_GROUP_KEYS: GroupKey[] = [
  'love_point_formula',
  'rush_limits',
  'order_timing',
  'recipe_limits',
  'family_limits',
  'rating_limits',
  'pagination',
  'wx_template_ids',
  'ai_config',
];

/** AI 配置默认值 */
export const AI_CONFIG_DEFAULTS = {
  PROVIDER: 'deepseek',
  DEEPSEEK_MODEL: 'deepseek-chat',
  OPENAI_MODEL: 'gpt-4o-mini',
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  CLAUDE_MODEL: 'claude-sonnet-4-6-20250514',
  TEMPERATURE: 0.7,
  MAX_TOKENS: 2048,
  FEATURE_RECIPE_GENERATION_ENABLED: true,
  FEATURE_SMART_RECOMMEND_ENABLED: true,
  FEATURE_COOKING_ASSISTANT_ENABLED: true,
  FEATURE_NUTRITION_ANALYSIS_ENABLED: true,
  FEATURE_WEEKLY_PLAN_ENABLED: true,
  RATE_LIMIT_RECIPE_GENERATION_PER_DAY: 50,
  RATE_LIMIT_SMART_RECOMMEND_PER_DAY: 50,
  RATE_LIMIT_COOKING_ASSISTANT_PER_DAY: 100,
  RATE_LIMIT_NUTRITION_ANALYSIS_PER_DAY: 50,
  RATE_LIMIT_WEEKLY_PLAN_PER_DAY: 20,
} as const;

const FALLBACKS: Record<GroupKey, Record<string, unknown>> = {
  love_point_formula: { ...LOVE_POINT_FORMULA },
  rush_limits: { ...RUSH_LIMITS },
  order_timing: { ...ORDER_TIMING },
  recipe_limits: { ...RECIPE_LIMITS },
  family_limits: { ...FAMILY_LIMITS },
  rating_limits: { ...RATING_LIMITS },
  pagination: { ...PAGINATION },
  wx_template_ids: { ...WX_MINIPROGRAM.TEMPLATE_KEYS },
  ai_config: { ...AI_CONFIG_DEFAULTS },
};

export class ConfigRegistry {
  private static instance: ConfigRegistry | null = null;
  private data = new Map<GroupKey, Record<string, unknown>>();

  static getInstance(): ConfigRegistry {
    if (!ConfigRegistry.instance) {
      ConfigRegistry.instance = new ConfigRegistry();
    }
    return ConfigRegistry.instance;
  }

  static resetForTesting(): void {
    ConfigRegistry.instance = null;
  }

  set(groupKey: GroupKey, value: Record<string, unknown>): void {
    if (!(groupKey in FALLBACKS)) {
      throw new Error(`unknown group ${groupKey}`);
    }
    this.data.set(groupKey, { ...value });
  }

  get(groupKey: GroupKey): Record<string, unknown> {
    if (!(groupKey in FALLBACKS)) {
      throw new Error(`unknown group ${groupKey}`);
    }
    return this.data.get(groupKey) ?? FALLBACKS[groupKey];
  }

  getNumber(groupKey: GroupKey, fieldKey: string): number {
    const upper = fieldKey.toUpperCase();
    const v = this.get(groupKey)[upper];
    if (typeof v !== 'number') {
      throw new Error(`${groupKey}.${fieldKey} is not number (got ${typeof v})`);
    }
    return v;
  }

  getString(groupKey: GroupKey, fieldKey: string): string {
    const upper = fieldKey.toUpperCase();
    const v = this.get(groupKey)[upper];
    if (typeof v !== 'string') {
      throw new Error(`${groupKey}.${fieldKey} is not string (got ${typeof v})`);
    }
    return v;
  }
}
