import { http } from './http';

export interface AdminLoginResponse {
  token: string;
  username: string;
}

export const authApi = {
  adminLogin(username: string, password: string): Promise<AdminLoginResponse> {
    return http.post('/auth/admin/login', { username, password });
  },

  me(): Promise<{ userId: string; isAdmin: boolean }> {
    return http.get('/auth/me');
  },
};
