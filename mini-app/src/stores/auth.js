import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth.js';
import * as ws from '@/api/ws.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(uni.getStorageSync('token') || '');
  const user = ref(uni.getStorageSync('user') || null);

  const isLoggedIn = computed(() => !!token.value);

  function persist() {
    if (token.value) uni.setStorageSync('token', token.value);
    else uni.removeStorageSync('token');
    if (user.value) uni.setStorageSync('user', user.value);
    else uni.removeStorageSync('user');
  }

  async function wxLogin(gender) {
    const loginRes = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject });
    });
    if (!loginRes.code) throw new Error('wx.login 未返回 code');
    const res = await authApi.wxLogin(loginRes.code, gender);
    token.value = res.token;
    user.value = res.user;
    persist();
    ws.connect();
    return res;
  }

  async function passwordLogin(phone, password, gender) {
    const res = await authApi.passwordLogin(phone, password, gender);
    token.value = res.token;
    user.value = res.user;
    persist();
    ws.connect();
    return res;
  }

  function setUser(u) {
    user.value = u;
    persist();
  }

  function logout() {
    ws.close();
    token.value = '';
    user.value = null;
    persist();
  }

  return { token, user, isLoggedIn, wxLogin, passwordLogin, setUser, logout };
});
