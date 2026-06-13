import {
  LOVE_POINT_FORMULA,
  RUSH_LIMITS,
  ORDER_TIMING,
  RECIPE_LIMITS,
  FAMILY_LIMITS,
  RATING_LIMITS,
  PAGINATION,
} from '@family-kitchen/shared';
import { ALL_GROUP_KEYS, AI_CONFIG_DEFAULTS, type GroupKey } from './config-registry';

export const GROUP_DEFAULTS: Record<
  Exclude<GroupKey, 'wx_template_ids'>,
  Record<string, unknown>
> = {
  love_point_formula: { ...LOVE_POINT_FORMULA },
  rush_limits: { ...RUSH_LIMITS },
  order_timing: { ...ORDER_TIMING },
  recipe_limits: { ...RECIPE_LIMITS },
  family_limits: { ...FAMILY_LIMITS },
  rating_limits: { ...RATING_LIMITS },
  pagination: { ...PAGINATION },
  ai_config: { ...AI_CONFIG_DEFAULTS },
};

export { ALL_GROUP_KEYS, type GroupKey };
