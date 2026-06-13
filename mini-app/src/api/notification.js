import { http } from './http.js';

export const notificationApi = {
  unreadCount() {
    return http.get('/notifications/unread-count');
  },
  list(params = {}) {
    const query = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query[k] = v;
    }
    return http.get('/notifications', query);
  },
  markRead(id) {
    return http.post(`/notifications/${id}/read`);
  },
  markAllRead() {
    return http.post('/notifications/read-all');
  },
};
