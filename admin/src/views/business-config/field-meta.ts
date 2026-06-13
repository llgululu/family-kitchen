import type { GroupKey } from '@/api/business-config';

export type FieldType = 'int' | 'string';

export interface FieldMeta {
  key: string;
  label: string;
  hint?: string;
  type: FieldType;
  min?: number;
  max?: number;
  pattern?: RegExp;
  readonly?: boolean;
  unit?: string;
}

export interface GroupMeta {
  groupKey: GroupKey;
  title: string;
  fields: FieldMeta[];
  crossNote?: string;
}

export interface TabMeta {
  key: string;
  label: string;
  groupKeys: GroupKey[];
}

export const CONFIG_TABS: TabMeta[] = [
  {
    key: 'core',
    label: '核心业务',
    groupKeys: ['love_point_formula', 'order_timing', 'rating_limits'],
  },
  {
    key: 'content',
    label: '内容约束',
    groupKeys: ['recipe_limits', 'family_limits', 'pagination'],
  },
  {
    key: 'interaction',
    label: '互动规则',
    groupKeys: ['rush_limits', 'wx_template_ids'],
  },
  {
    key: 'all',
    label: '全部',
    groupKeys: [],
  },
];

export const GROUP_METAS: GroupMeta[] = [
  {
    groupKey: 'love_point_formula',
    title: '爱心币公式',
    fields: [
      { key: 'BASE', label: '基础值（每道菜）', type: 'int', min: 0, max: 100 },
      {
        key: 'DIFFICULTY_MULTIPLIER',
        label: '难度系数',
        hint: '每星难度 × 该值',
        type: 'int',
        min: 0,
        max: 20,
      },
      {
        key: 'RATING_BONUS_MULTIPLIER',
        label: '评分加成系数',
        hint: '(评分-3) × 该值，评分≤3 不扣',
        type: 'int',
        min: 0,
        max: 20,
      },
      { key: 'FIVE_STAR_EXTRA_BONUS', label: '5 星额外', type: 'int', min: 0, max: 50 },
    ],
  },
  {
    groupKey: 'rush_limits',
    title: '催菜限频',
    fields: [
      { key: 'MAX_PER_ORDER', label: '每订单最多催', type: 'int', min: 1, max: 20 },
      { key: 'COOLDOWN_SECONDS', label: '催菜冷却', type: 'int', min: 30, max: 3600, unit: '秒' },
    ],
  },
  {
    groupKey: 'order_timing',
    title: '订单时序',
    fields: [
      {
        key: 'INVITE_CODE_TTL_SECONDS',
        label: '邀请码有效期',
        type: 'int',
        min: 300,
        max: 604800,
        unit: '秒',
      },
      {
        key: 'AUTO_RATE_AFTER_SERVED_SECONDS',
        label: '上菜后自动评价',
        type: 'int',
        min: 3600,
        max: 604800,
        unit: '秒',
      },
      {
        key: 'MESSAGE_MAX_LENGTH',
        label: '消息长度上限',
        type: 'int',
        min: 50,
        max: 2000,
        unit: '字',
      },
      {
        key: 'REMIND_CHEF_BEFORE_MINUTES',
        label: '期望时间提前提醒',
        type: 'int',
        min: 0,
        max: 180,
        unit: '分钟',
      },
    ],
  },
  {
    groupKey: 'recipe_limits',
    title: '菜谱字段约束',
    crossNote: 'DIFFICULTY_MAX 必须大于 DIFFICULTY_MIN',
    fields: [
      { key: 'NAME_MAX_LENGTH', label: '菜名长度上限', type: 'int', min: 5, max: 100 },
      { key: 'NOTES_MAX_LENGTH', label: '备注长度上限', type: 'int', min: 50, max: 5000 },
      { key: 'MAX_IMAGES', label: '图片上限', type: 'int', min: 1, max: 20 },
      { key: 'DIFFICULTY_MIN', label: '难度最小值', type: 'int', readonly: true },
      { key: 'DIFFICULTY_MAX', label: '难度最大值', type: 'int', min: 2, max: 10 },
    ],
  },
  {
    groupKey: 'family_limits',
    title: '家庭空间',
    fields: [
      { key: 'MAX_MEMBERS', label: '最大成员', type: 'int', min: 2, max: 10, hint: 'MVP 锁定双人' },
      { key: 'RECOVERY_DAYS', label: '解散恢复期', type: 'int', min: 1, max: 365, unit: '天' },
    ],
  },
  {
    groupKey: 'rating_limits',
    title: '评分约束',
    crossNote: 'MAX 必须大于 MIN',
    fields: [
      { key: 'MIN', label: '评分下限', type: 'int', readonly: true },
      { key: 'MAX', label: '评分上限', type: 'int', min: 3, max: 10 },
      { key: 'COMMENT_MAX_LENGTH', label: '评论长度上限', type: 'int', min: 50, max: 5000 },
      { key: 'MAX_IMAGES', label: '评价图片上限', type: 'int', min: 0, max: 10 },
    ],
  },
  {
    groupKey: 'pagination',
    title: '分页',
    crossNote: 'MAX_PAGE_SIZE 必须 ≥ DEFAULT_PAGE_SIZE',
    fields: [
      { key: 'DEFAULT_PAGE_SIZE', label: '默认每页', type: 'int', min: 5, max: 100 },
      { key: 'MAX_PAGE_SIZE', label: '每页上限', type: 'int', min: 10, max: 1000 },
    ],
  },
  {
    groupKey: 'wx_template_ids',
    title: '微信小程序模板 ID',
    fields: [
      {
        key: 'ORDER_ACCEPTED',
        label: '订单接单',
        type: 'string',
        pattern: /^[A-Za-z0-9_-]{1,128}$/,
      },
      { key: 'ORDER_SERVED', label: '订单上菜', type: 'string', pattern: /^[A-Za-z0-9_-]{1,128}$/ },
      { key: 'ORDER_RUSHED', label: '订单催菜', type: 'string', pattern: /^[A-Za-z0-9_-]{1,128}$/ },
      {
        key: 'ACHIEVEMENT_UNLOCKED',
        label: '徽章解锁',
        type: 'string',
        pattern: /^[A-Za-z0-9_-]{1,128}$/,
      },
    ],
  },
];
