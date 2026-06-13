import { http } from './http';

export interface ChefLevelDefinition {
  id: string;
  key: string;
  title: string;
  emoji: string;
  minOrders: number;
  minAvgRating: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChefLevelParams {
  key: string;
  title: string;
  emoji: string;
  minOrders?: number;
  minAvgRating?: number;
  sortOrder?: number;
}

export interface UpdateChefLevelParams {
  title?: string;
  emoji?: string;
  minOrders?: number;
  minAvgRating?: number;
  sortOrder?: number;
}

export const chefLevelApi = {
  list(): Promise<{ items: ChefLevelDefinition[]; total: number }> {
    return http.get('/admin/chef-levels');
  },

  get(key: string): Promise<ChefLevelDefinition> {
    return http.get(`/admin/chef-levels/${key}`);
  },

  create(data: CreateChefLevelParams): Promise<ChefLevelDefinition> {
    return http.post('/admin/chef-levels', data);
  },

  update(key: string, data: UpdateChefLevelParams): Promise<ChefLevelDefinition> {
    return http.patch(`/admin/chef-levels/${key}`, data);
  },

  toggle(key: string): Promise<ChefLevelDefinition> {
    return http.patch(`/admin/chef-levels/${key}/toggle`);
  },

  remove(key: string): Promise<ChefLevelDefinition> {
    return http.delete(`/admin/chef-levels/${key}`);
  },

  seed(): Promise<{ success: boolean; message: string }> {
    return http.get('/admin/chef-levels/seed');
  },
};
