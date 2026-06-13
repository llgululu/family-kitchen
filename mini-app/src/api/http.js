/**
 * uni.request 封装
 * - 自动注入 Authorization: Bearer
 * - 401 清凭证并 toast，不强制跳转（由调用方决定是否引导登录）
 * - 业务错误统一 toast
 */

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

function getToken() {
  return uni.getStorageSync('token') || '';
}

function showError(message) {
  if (!message) return;
  uni.showToast({ title: String(message).slice(0, 30), icon: 'none' });
}

export function request({ url, method = 'GET', data, header = {}, silent = false }) {
  const token = getToken();
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${baseUrl}${url}`,
      method,
      data,
      header: {
        ...(data !== undefined && data !== null ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...header,
      },
      timeout: 15000,
      success: async (res) => {
        if (res.statusCode === 401) {
          // 清本地凭证，但不再强制 reLaunch；由调用方/页面决定是否引导登录
          uni.removeStorageSync('token');
          uni.removeStorageSync('user');
          // 同步内存态（auth store），保证 isLoggedIn 立即变 false
          try {
            const { useAuthStore } = await import('@/stores/auth.js');
            useAuthStore().logout();
          } catch {
            // store 模块加载失败时降级，本地 storage 已清，下一次 getToken() 会拿到空串
          }
          if (!silent) showError('登录已失效，请重新登录');
          reject(res.data || { statusCode: 401 });
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = res.data?.message || '请求失败';
          if (!silent) showError(msg);
          reject(res.data);
        }
      },
      fail: (err) => {
        if (!silent) showError('网络错误');
        reject(err);
      },
    });
  });
}

export const http = {
  get: (url, data, opts = {}) => request({ url, method: 'GET', data, ...opts }),
  post: (url, data, opts = {}) => request({ url, method: 'POST', data, ...opts }),
  patch: (url, data, opts = {}) => request({ url, method: 'PATCH', data, ...opts }),
  delete: (url, data, opts = {}) => request({ url, method: 'DELETE', data, ...opts }),
};

export const apiBaseUrl = baseUrl;
