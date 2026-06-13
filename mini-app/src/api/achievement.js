import { http } from './http.js';

export const achievementApi = {
  listMine() {
    return http.get('/achievements/me');
  },
  listFamily() {
    return http.get('/achievements/family');
  },
  getProgress() {
    return http.get('/achievements/progress');
  },
};
