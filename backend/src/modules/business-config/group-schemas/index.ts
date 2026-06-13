import type { GroupKey } from '../config-registry';
import { LovePointFormulaSchema } from './love-point-formula.schema';
import { RushLimitsSchema } from './rush-limits.schema';
import { OrderTimingSchema } from './order-timing.schema';
import { RecipeLimitsSchema } from './recipe-limits.schema';
import { FamilyLimitsSchema } from './family-limits.schema';
import { RatingLimitsSchema } from './rating-limits.schema';
import { PaginationSchema } from './pagination.schema';
import { WxTemplateIdsSchema } from './wx-template-ids.schema';
import { AiConfigSchema } from './ai-config.schema';

export type SchemaClass = { new (): object };

export const GROUP_SCHEMAS: Record<GroupKey, SchemaClass> = {
  love_point_formula: LovePointFormulaSchema,
  rush_limits: RushLimitsSchema,
  order_timing: OrderTimingSchema,
  recipe_limits: RecipeLimitsSchema,
  family_limits: FamilyLimitsSchema,
  rating_limits: RatingLimitsSchema,
  pagination: PaginationSchema,
  wx_template_ids: WxTemplateIdsSchema,
  ai_config: AiConfigSchema,
};

export {
  LovePointFormulaSchema,
  RushLimitsSchema,
  OrderTimingSchema,
  RecipeLimitsSchema,
  FamilyLimitsSchema,
  RatingLimitsSchema,
  PaginationSchema,
  WxTemplateIdsSchema,
  AiConfigSchema,
};
