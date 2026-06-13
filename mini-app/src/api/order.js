import { http } from './http.js';

export const orderApi = {
  create(data) {
    return http.post('/orders', data);
  },
  getActive() {
    return http.get('/orders/active');
  },
  list(params = {}) {
    const query = { ...params };
    if (Array.isArray(query.statuses)) query.statuses = query.statuses.join(',');
    return http.get('/orders', query);
  },
  get(id) {
    return http.get(`/orders/${id}`);
  },
  accept(id, data = {}) {
    return http.post(`/orders/${id}/accept`, data);
  },
  reject(id, reason) {
    return http.post(`/orders/${id}/reject`, { reason });
  },
  setPrepping(id) {
    return http.post(`/orders/${id}/prepping`);
  },
  setCooking(id) {
    return http.post(`/orders/${id}/cooking`);
  },
  serve(id, imageUrls) {
    return http.post(`/orders/${id}/serve`, { imageUrls });
  },
  cancel(id, reason) {
    return http.post(`/orders/${id}/cancel`, { reason });
  },
  rate(id, data) {
    return http.post(`/orders/${id}/rating`, data);
  },
};
