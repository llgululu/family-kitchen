import { http } from './http.js';

export const timelineApi = {
  list(params = {}) {
    return http.get('/timeline', params);
  },
  monthlySummary(month) {
    return http.get('/timeline/monthly-summary', month ? { month } : {});
  },
  createManual(data) {
    return http.post('/timeline/manual', data);
  },
  reply(id, data) {
    return http.patch(`/timeline/${id}/reply`, data);
  },
  hide(id) {
    return http.patch(`/timeline/${id}/hide`);
  },
  unhide(id) {
    return http.patch(`/timeline/${id}/unhide`);
  },
  remove(id) {
    return http.delete(`/timeline/${id}`);
  },
};
