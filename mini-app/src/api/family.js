import { http } from './http.js';

export const familyApi = {
  create(data) {
    return http.post('/families', data);
  },
  getMine() {
    return http.get('/families/me');
  },
  updateMine(data) {
    return http.patch('/families/me', data);
  },
  refreshInviteCode() {
    return http.post('/families/me/invite-code');
  },
  joinByCode(inviteCode) {
    return http.post('/families/join', { inviteCode });
  },
  leave() {
    return http.post('/families/me/leave');
  },
};
