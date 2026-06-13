/**
 * 跨端共享常量。
 *
 * **运行时配置**：下面 8 个 group 已迁移到 admin 后台可编辑（DB 持久化）。
 * 这里的值仅作为：
 *   1. backend BusinessConfigService 首次启动 seed 默认值
 *   2. backend DTO 类型来源（TypeScript 类型推导）
 *   3. mini-app 离线兜底（cold start /config/public 失败时使用）
 *
 * 改这里的数字 **不会** 影响生产运行时——要改业务参数，请到 admin "业务配置" 页面。
 */

/** 爱心币计算公式：基础 + 难度×系数 + (评分-3)×系数 */
export const LOVE_POINT_FORMULA = {
  BASE: 5,
  DIFFICULTY_MULTIPLIER: 2,
  RATING_BONUS_MULTIPLIER: 2, // (stars - 3) × 该系数，stars ≤ 3 时不扣
  FIVE_STAR_EXTRA_BONUS: 5,
} as const;

/** 催菜限频规则 */
export const RUSH_LIMITS = {
  MAX_PER_ORDER: 3,
  COOLDOWN_SECONDS: 5 * 60,
} as const;

/** 订单时序规则 */
export const ORDER_TIMING = {
  /** 邀请码 / 待绑定家庭空间的有效期（秒） */
  INVITE_CODE_TTL_SECONDS: 24 * 60 * 60,
  /** 上菜后多久未评价自动默认 5 星完成（秒） */
  AUTO_RATE_AFTER_SERVED_SECONDS: 24 * 60 * 60,
  /** 订单消息文字长度上限 */
  MESSAGE_MAX_LENGTH: 200,
  /** 期望时间提前多少分钟提醒厨师 */
  REMIND_CHEF_BEFORE_MINUTES: 15,
} as const;

/** 菜谱字段约束 */
export const RECIPE_LIMITS = {
  NAME_MAX_LENGTH: 30,
  NOTES_MAX_LENGTH: 500,
  MAX_IMAGES: 5,
  DIFFICULTY_MIN: 1,
  DIFFICULTY_MAX: 5,
} as const;

/** 家庭空间约束 */
export const FAMILY_LIMITS = {
  /** MVP 阶段单家庭最大成员数 */
  MAX_MEMBERS: 2,
  /** dissolving 状态下可恢复的天数 */
  RECOVERY_DAYS: 30,
} as const;

/** 评分约束 */
export const RATING_LIMITS = {
  MIN: 1,
  MAX: 5,
  COMMENT_MAX_LENGTH: 500,
  MAX_IMAGES: 3,
} as const;

/** 厨师等级定义（按等级递增） */
export const CHEF_LEVELS = [
  { key: 'apprentice', title: '学徒', emoji: '\uD83E\uDDD1', minOrders: 0, minAvgRating: 0 },
  {
    key: 'cook',
    title: '厨师',
    emoji: '\uD83D\uDC68\u200D\uD83C\uDF73',
    minOrders: 5,
    minAvgRating: 3.5,
  },
  {
    key: 'chef',
    title: '大厨',
    emoji: '\uD83D\uDC68\u200D\uD83C\uDF73',
    minOrders: 20,
    minAvgRating: 4.0,
  },
  {
    key: 'head_chef',
    title: '主厨',
    emoji: '\uD83E\uDDD1\u200D\uD83C\uDF73',
    minOrders: 50,
    minAvgRating: 4.5,
  },
  { key: 'god_chef', title: '主厨之神', emoji: '\uD83E\uDD47', minOrders: 100, minAvgRating: 4.8 },
] as const;

/** 分页默认参数 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/** 微信小程序服务端校验 */
export const WX_MINIPROGRAM = {
  /** 一次性订阅消息模板 ID 占位（实际值在 backend 环境变量配置） */
  TEMPLATE_KEYS: {
    ORDER_ACCEPTED: 'tmpl_order_accepted',
    ORDER_SERVED: 'tmpl_order_served',
    ORDER_RUSHED: 'tmpl_order_rushed',
    ACHIEVEMENT_UNLOCKED: 'tmpl_achievement',
    ANNIVERSARY_REMINDER: 'tmpl_anniversary',
  },
} as const;
