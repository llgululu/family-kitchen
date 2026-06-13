import { http, type PaginatedResponse } from './http';

export type GroupKey =
  | 'love_point_formula'
  | 'rush_limits'
  | 'order_timing'
  | 'recipe_limits'
  | 'family_limits'
  | 'rating_limits'
  | 'pagination'
  | 'wx_template_ids';

export const ALL_GROUP_KEYS: GroupKey[] = [
  'love_point_formula',
  'rush_limits',
  'order_timing',
  'recipe_limits',
  'family_limits',
  'rating_limits',
  'pagination',
  'wx_template_ids',
];

export interface BusinessConfigGroup {
  groupKey: GroupKey;
  value: Record<string, unknown>;
  schemaVersion: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface ChangeLogOperator {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface ChangeLogItem {
  id: string;
  groupKey: GroupKey;
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  operatorId: string;
  operator: ChangeLogOperator | null;
  createdAt: string;
}

export const businessConfigApi = {
  listAll: () =>
    http.get<BusinessConfigGroup[], BusinessConfigGroup[]>('/admin/business-config'),

  get: (g: GroupKey) =>
    http.get<BusinessConfigGroup, BusinessConfigGroup>(`/admin/business-config/${g}`),

  update: (g: GroupKey, value: Record<string, unknown>) =>
    http.patch<{ groupKey: GroupKey; value: Record<string, unknown> }, { groupKey: GroupKey; value: Record<string, unknown> }>(
      `/admin/business-config/${g}`,
      value,
    ),

  listGroupChanges: (g: GroupKey, page = 1, pageSize = 20) =>
    http.get<PaginatedResponse<ChangeLogItem>, PaginatedResponse<ChangeLogItem>>(
      `/admin/business-config/${g}/changes`,
      { params: { page, pageSize } },
    ),

  listAllChanges: (page = 1, pageSize = 20) =>
    http.get<PaginatedResponse<ChangeLogItem>, PaginatedResponse<ChangeLogItem>>(
      '/admin/business-config/-/changes/all',
      { params: { page, pageSize } },
    ),
};
