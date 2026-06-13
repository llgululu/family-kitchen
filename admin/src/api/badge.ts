import { http, type PaginatedResponse } from './http';

export interface BadgeDefinition {
  id: string;
  key: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  ownerType: string;
  triggerType: string;
  evaluatorType: string;
  evaluatorConfig: Record<string, unknown>;
  hidden: boolean;
  progressTarget: number | null;
  sortOrder: number;
  isActive: boolean;
  unlockCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BadgeStats {
  badgeKey: string;
  totalUnlocked: number;
  byOwnerType: Array<{ ownerType: string; count: number }>;
}

export interface BadgeQueryParams {
  page?: number;
  pageSize?: number;
  category?: string;
  isActive?: boolean;
  search?: string;
}

export interface CreateBadgeParams {
  key: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  ownerType: string;
  triggerType: string;
  evaluatorType: string;
  evaluatorConfig: Record<string, unknown>;
  hidden?: boolean;
  progressTarget?: number | null;
  sortOrder?: number;
}

export interface UpdateBadgeParams {
  title?: string;
  description?: string;
  emoji?: string;
  category?: string;
  ownerType?: string;
  triggerType?: string;
  evaluatorType?: string;
  evaluatorConfig?: Record<string, unknown>;
  hidden?: boolean;
  progressTarget?: number | null;
  sortOrder?: number;
}

export const badgeApi = {
  list(params: BadgeQueryParams = {}): Promise<PaginatedResponse<BadgeDefinition>> {
    return http.get('/admin/badges', {
      params: {
        ...params,
        isActive: params.isActive !== undefined ? String(params.isActive) : undefined,
      },
    });
  },

  get(key: string): Promise<BadgeDefinition> {
    return http.get(`/admin/badges/${key}`);
  },

  create(data: CreateBadgeParams): Promise<BadgeDefinition> {
    return http.post('/admin/badges', data);
  },

  update(key: string, data: UpdateBadgeParams): Promise<BadgeDefinition> {
    return http.patch(`/admin/badges/${key}`, data);
  },

  toggle(key: string): Promise<BadgeDefinition> {
    return http.patch(`/admin/badges/${key}/toggle`);
  },

  remove(key: string): Promise<BadgeDefinition> {
    return http.delete(`/admin/badges/${key}`);
  },

  stats(key: string): Promise<BadgeStats> {
    return http.get(`/admin/badges/${key}/stats`);
  },

  seed(): Promise<{ success: boolean; message: string }> {
    return http.get('/admin/badges/seed');
  },
};

export const BADGE_CATEGORIES = [
  { value: 'chef', label: '厨师之路' },
  { value: 'customer', label: '吃货之路' },
  { value: 'recipe', label: '菜谱收藏' },
  { value: 'love', label: '爱心温暖' },
  { value: 'interaction', label: '甜蜜互动' },
  { value: 'family', label: '家庭时光' },
  { value: 'hidden', label: '隐藏彩蛋' },
];

export const TRIGGER_TYPES = [
  { value: 'order_rated', label: '订单评分完成' },
  { value: 'order_served', label: '订单上菜' },
  { value: 'order_created', label: '订单创建' },
  { value: 'recipe_created', label: '菜谱创建' },
  { value: 'recipe_favorited', label: '菜谱收藏' },
  { value: 'message_sent', label: '消息发送' },
  { value: 'tip_settled', label: '打赏结算' },
  { value: 'love_point_earned', label: '爱心值获得' },
  { value: 'family_joined', label: '加入家庭' },
  { value: 'daily_check', label: '每日检查' },
];

export const EVALUATOR_TYPES = [
  { value: 'count', label: '计数达标' },
  { value: 'streak', label: '连续记录' },
  { value: 'sum', label: '累计求和' },
  { value: 'time_check', label: '时间检查' },
  { value: 'special_date', label: '特殊日期' },
  { value: 'family_age', label: '家庭年龄' },
  { value: 'recipe_stat', label: '菜谱统计' },
  { value: 'first_time', label: '首次触发' },
  { value: 'message_distinct', label: '去重计数' },
  { value: 'no_action', label: '无行为检查' },
  { value: 'both_members', label: '双方达标' },
];

export const OWNER_TYPES = [
  { value: 'user', label: '用户' },
  { value: 'family', label: '家庭' },
];
