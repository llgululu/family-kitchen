import { http } from './http.js';

export const lovePointApi = {
  balance() {
    return http.get('/love-points/balance');
  },
  logs(params = {}) {
    const query = { ...params };
    if (Array.isArray(query.changeTypes)) query.changeTypes = query.changeTypes.join(',');
    return http.get('/love-points/logs', query);
  },
  reverse(logId) {
    return http.post(`/love-points/logs/${logId}/reverse`);
  },
  checkIn() {
    return http.post('/love-points/check-in');
  },
};
