// mini-app/src/composables/use-family-guard.js
import { useFamilyStore } from '@/stores/family.js';
import { ensureLogin } from './use-auth-guard.js';

/**
 * 按需家庭拦截。先确保登录，再确保已加入家庭。
 * - 都满足：resolve(true)
 * - 否则：弹确认框；用户确认后跳对应页，返回 false
 *
 * 用法：if (!(await ensureFamily())) return;
 */
export async function ensureFamily() {
  if (!(await ensureLogin())) return false;

  const family = useFamilyStore();
  if (!family.family) {
    try {
      await family.refresh();
    } catch {
      // refresh 内部已 catch，family 仍为 null
    }
  }
  if (family.hasFamily) return true;

  const confirmed = await new Promise((resolve) => {
    uni.showModal({
      title: '还没有小厨房',
      content: '先创建或加入一个小厨房',
      confirmText: '去创建/加入',
      cancelText: '再看看',
      success: (r) => resolve(r.confirm),
      fail: () => resolve(false),
    });
  });
  if (!confirmed) return false;
  uni.navigateTo({ url: '/pages/family/setup' });
  return false;
}
