// mini-app/src/composables/use-auth-guard.js
import { useAuthStore } from '@/stores/auth.js';

/**
 * 按需登录拦截。
 * - 已登录：立即 resolve(true)
 * - 未登录：弹确认框；用户点"去登录"则跳登录页并返回 false（调用方应停止后续动作）
 *
 * 用法：
 *   if (!(await ensureLogin())) return;
 *   // ... 已登录后的逻辑
 */
export async function ensureLogin({ message = '该功能需要登录后使用' } = {}) {
  const auth = useAuthStore();
  if (auth.isLoggedIn) return true;

  const confirmed = await new Promise((resolve) => {
    uni.showModal({
      title: '需要登录',
      content: message,
      confirmText: '去登录',
      cancelText: '再看看',
      success: (r) => resolve(r.confirm),
      fail: () => resolve(false),
    });
  });
  if (!confirmed) return false;
  uni.navigateTo({ url: '/pages/auth/login' });
  return false;
}
