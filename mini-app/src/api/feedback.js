import { http } from './http.js';

export const feedbackApi = {
  create(data) {
    return http.post('/feedback', data);
  },
};
