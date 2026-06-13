<script>
import { useBusinessConfigStore } from '@/stores/business-config';
import { useFamilyStore } from '@/stores/family.js';
import { useChatUnreadStore } from '@/stores/chat-unread.js';
import * as ws from '@/api/ws.js';
import { getActiveChatOrderId } from '@/utils/chat-active.js';

export default {
  onLaunch() {
    // 拉取运行时业务配置
    useBusinessConfigStore().load();
    // 不强制登录：进入即可浏览首屏；具体功能按需触发登录
    // 已登录则预热家庭信息，避免 Tab 内首次 onShow 闪烁
    const token = uni.getStorageSync('token');
    if (token) {
      ws.connect();
      useFamilyStore()
        .refresh()
        .catch(() => {});
    }

    // 全局监听家庭成员退出：弹 toast 并刷新家庭数据
    ws.on('family:member_left', (data) => {
      const name = data?.member?.nickname || '对方';
      uni.showToast({ title: `${name} 已退出小厨房`, icon: 'none', duration: 3000 });
      useFamilyStore()
        .refresh()
        .catch(() => {});
    });

    // 全局监听订单消息：用户不在聊天页时弹 toast 提示
    ws.on('order:message', (data) => {
      if (data.orderId === getActiveChatOrderId()) return; // 已在聊天页，忽略
      useChatUnreadStore().increment(data.orderId);
      const text =
        data.message?.type === 'text'
          ? data.message.content?.text || '新消息'
          : data.message?.type === 'emoji'
            ? '[表情]'
            : data.message?.type === 'rush'
              ? '[催菜]'
              : data.message?.type === 'tip'
                ? '[打赏]'
                : '新消息';
      uni.showToast({
        title: '订单消息: ' + text,
        icon: 'none',
        duration: 3000,
      });
    });

    // 微信隐私保护指引：基础库 ≥ 2.32.3，敏感接口（wx.login / chooseImage 等）前需用户同意
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && typeof wx.onNeedPrivacyAuthorization === 'function') {
      wx.onNeedPrivacyAuthorization((resolve) => {
        uni.showModal({
          title: '隐私保护提示',
          content: '为提供登录、上传图片等功能，需要您同意《隐私保护指引》',
          confirmText: '同意',
          cancelText: '拒绝',
          success: (r) => {
            if (r.confirm) resolve({ event: 'agree', buttonId: '' });
            else resolve({ event: 'disagree' });
          },
          fail: () => resolve({ event: 'disagree' }),
        });
      });
    }
    // #endif
  },
  onShow() {},
  onHide() {},
};
</script>

<style lang="scss">
page {
  /* ── Sunset Coral 自定义变量 ── */
  --fk-primary: #{$fk-primary};
  --fk-primary-dark: #{$fk-primary-dark};
  --fk-primary-light: #{$fk-primary-light};
  --fk-primary-lighter: #{$fk-primary-lighter};
  --fk-text: #{$fk-text};
  --fk-text-secondary: #{$fk-text-secondary};
  --fk-text-muted: #{$fk-text-muted};
  --fk-text-placeholder: #{$fk-text-placeholder};
  --fk-text-disabled: #{$fk-text-disabled};
  --fk-bg-page: #{$fk-bg-page};
  --fk-bg-white: #{$fk-bg-white};
  --fk-bg-hover: #{$fk-bg-hover};
  --fk-border: #{$fk-border};
  --fk-border-light: #{$fk-border-light};
  --fk-success: #{$fk-success};
  --fk-warning: #{$fk-warning};
  --fk-error: #{$fk-error};
  --fk-info: #{$fk-info};
  --fk-avatar-bg: #{$fk-avatar-bg};
  --fk-star-off: #{$fk-star-off};

  /* ── WOT Design Uni 全局主题覆写 ── */
  --wot-color-theme: #{$fk-primary};
  --wot-color-danger: #{$fk-primary};
  --wot-color-success: #{$fk-success};
  --wot-color-warning: #{$fk-warning};
  --wot-color-info: #{$fk-text-muted};
  --wot-color-title: #{$fk-text};
  --wot-color-content: #{$fk-text};
  --wot-color-secondary: #{$fk-text-secondary};
  --wot-color-aid: #{$fk-text-muted};
  --wot-color-tip: #{$fk-text-placeholder};
  --wot-color-border: #{$fk-border};
  --wot-color-border-light: #{$fk-border-light};
  --wot-color-bg: #{$fk-bg-page};
  --wot-color-gray-1: #{$fk-bg-page};
  --wot-color-gray-2: #{$fk-bg-hover};
  --wot-color-gray-3: #{$fk-border};
  --wot-color-gray-4: #{$fk-text-disabled};
  --wot-color-gray-5: #{$fk-text-placeholder};
  --wot-color-gray-6: #{$fk-text-muted};
  --wot-color-gray-7: #{$fk-text-secondary};
  --wot-color-gray-8: #{$fk-text};

  background-color: $fk-bg-page;
  font-size: 28rpx;
  color: $fk-text;
}
.muted {
  color: $fk-text-muted;
}
.primary-color {
  color: $fk-primary;
}
</style>

<style lang="scss">
/* H5 端隐藏原生 tabbar，使用自定义 tabbar 组件 */
/* #ifdef H5 */
.uni-tabbar,
.uni-tabbar ~ .uni-placeholder {
  display: none !important;
}
/* #endif */
</style>
