import { http } from './http.js';

export const messageApi = {
  list(orderId, params = {}) {
    return http.get(`/orders/${orderId}/messages`, params);
  },
  send(orderId, data) {
    return http.post(`/orders/${orderId}/messages`, data);
  },
  sendText(orderId, text) {
    return http.post(`/orders/${orderId}/messages`, { type: 'text', text });
  },
  sendEmoji(orderId, emojiKey) {
    return http.post(`/orders/${orderId}/messages`, { type: 'emoji', emojiKey });
  },
  sendImage(orderId, imageUrl) {
    return http.post(`/orders/${orderId}/messages`, { type: 'image', imageUrl });
  },
  rush(orderId) {
    return http.post(`/orders/${orderId}/messages`, { type: 'rush' });
  },
  tip(orderId, amount, title) {
    return http.post(`/orders/${orderId}/messages`, {
      type: 'tip',
      tip: { amount, title },
    });
  },
  markRead(orderId) {
    return http.post(`/orders/${orderId}/messages/read`);
  },
};
