/**
 * 跨端共享枚举。
 * 这是单一事实来源（single source of truth），三端引用此处，禁止重新定义。
 */

/** 订单状态机。详见 docs/03-information-architecture.md §5.1 */
export const OrderStatus = {
  DRAFT: 'draft',
  PENDING: 'pending', // 待接单
  ACCEPTED: 'accepted', // 已接单
  PREPPING: 'prepping', // 备菜中
  COOKING: 'cooking', // 烹饪中
  SERVED: 'served', // 已上菜
  RATED: 'rated', // 已评价
  COMPLETED: 'completed', // 已完成
  REJECTED: 'rejected', // 已拒绝
  CANCELLED: 'cancelled', // 已取消
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** 非终态订单状态集合 —— 用于"一家庭一活跃单"约束 */
export const ACTIVE_ORDER_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.ACCEPTED,
  OrderStatus.PREPPING,
  OrderStatus.COOKING,
  OrderStatus.SERVED,
] as const;

/** 订单内消息类型 */
export const OrderMessageType = {
  TEXT: 'text',
  EMOJI: 'emoji',
  IMAGE: 'image',
  RUSH: 'rush', // 催菜，独立类型便于限频
  TIP: 'tip', // 打赏
  SYSTEM: 'system', // 系统消息
} as const;
export type OrderMessageType = (typeof OrderMessageType)[keyof typeof OrderMessageType];

/** 爱心币流水变动类型 */
export const LovePointChangeType = {
  COOK_REWARD: 'cook_reward', // 做菜奖励
  RATING_BONUS: 'rating_bonus', // 评分加成
  TIP_SEND: 'tip_send', // 打赏出
  TIP_RECEIVE: 'tip_receive', // 打赏入
  CHECK_IN: 'check_in', // 签到
  REFUND: 'refund', // 撤回
} as const;
export type LovePointChangeType = (typeof LovePointChangeType)[keyof typeof LovePointChangeType];

/** 家庭空间状态 */
export const FamilyStatus = {
  ACTIVE: 'active',
  DISSOLVING: 'dissolving', // 单方退出，30 天可恢复
  DISSOLVED: 'dissolved',
} as const;
export type FamilyStatus = (typeof FamilyStatus)[keyof typeof FamilyStatus];

/** 家庭成员角色 */
export const FamilyMemberRole = {
  CREATOR: 'creator',
  MEMBER: 'member',
} as const;
export type FamilyMemberRole = (typeof FamilyMemberRole)[keyof typeof FamilyMemberRole];

/** 关系类型 */
export const RelationType = {
  COUPLE: 'couple',
  FAMILY: 'family',
} as const;
export type RelationType = (typeof RelationType)[keyof typeof RelationType];

/** 时间线条目来源 */
export const TimelineSourceType = {
  ORDER: 'order', // 订单自动生成
  MANUAL: 'manual', // 手动补记
} as const;
export type TimelineSourceType = (typeof TimelineSourceType)[keyof typeof TimelineSourceType];

/** 成就所有者类型 */
export const AchievementOwnerType = {
  USER: 'user',
  FAMILY: 'family',
} as const;
export type AchievementOwnerType = (typeof AchievementOwnerType)[keyof typeof AchievementOwnerType];

/** 用户性别 */
export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

/** 餐段标签（菜谱） */
export const MealTag = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  MIDNIGHT: 'midnight',
} as const;
export type MealTag = (typeof MealTag)[keyof typeof MealTag];

/** 口味标签（菜谱） */
export const FlavorTag = {
  SWEET: 'sweet',
  SALTY: 'salty',
  SPICY: 'spicy',
  MILD: 'mild',
} as const;
export type FlavorTag = (typeof FlavorTag)[keyof typeof FlavorTag];

/** 订单消息类型 - AI 助手 */
export const OrderMessageTypeAI = {
  AI_ASSISTANT: 'ai_assistant',
} as const;

/** AI 功能类型 */
export const AiFeature = {
  RECIPE_GENERATION: 'recipe_generation',
  SMART_RECOMMEND: 'smart_recommend',
  COOKING_ASSISTANT: 'cooking_assistant',
  NUTRITION_ANALYSIS: 'nutrition_analysis',
  WEEKLY_PLAN: 'weekly_plan',
} as const;
export type AiFeature = (typeof AiFeature)[keyof typeof AiFeature];

/** AI 对话类型 */
export const AiConversationType = {
  COOKING_ASSISTANT: 'cooking_assistant',
  RECIPE_GEN: 'recipe_gen',
  NUTRITION: 'nutrition',
} as const;
export type AiConversationType = (typeof AiConversationType)[keyof typeof AiConversationType];
