<template>
  <view class="login">
    <!-- 返回按钮 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="back-btn" @click="goBack">
        <wd-icon name="arrow-left" size="40rpx" color="#fff" />
      </view>
    </view>

    <view class="logo-area">
      <wd-icon name="home" size="120rpx" color="rgba(255,255,255,0.95)" />
    </view>
    <view class="title">情侣厨房</view>
    <view class="subtitle">
      <wd-icon name="heart" size="28rpx" color="rgba(255,255,255,0.9)" />
      <text>让爱意从一顿饭开始</text>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <wd-button
      type="error"
      round
      block
      :loading="loading"
      :disabled="loading"
      @click="handleWxLogin"
      custom-style="margin-top:80rpx"
    >
      <wd-icon name="chat" size="32rpx" color="#fff" custom-style="margin-right:8rpx" />
      微信一键登录
    </wd-button>
    <!-- #endif -->

    <!-- #ifdef H5 -->
    <view class="h5-form">
      <wd-input
        v-model="phone"
        type="number"
        :maxlength="11"
        placeholder="请输入手机号"
        no-border
        custom-class="h5-input"
      />
      <wd-input
        v-model="password"
        show-password
        :maxlength="64"
        placeholder="请输入密码（至少 6 位）"
        no-border
        custom-class="h5-input"
      />
    </view>
    <wd-button
      type="error"
      round
      block
      :loading="loading"
      :disabled="loading"
      @click="handlePasswordLogin"
      custom-style="margin-top:40rpx"
    >
      登录 / 注册
    </wd-button>
    <view class="h5-tip">未注册的手机号将自动创建账号</view>
    <!-- #endif -->

    <view class="agreement-row">
      <wd-checkbox
        v-model="agreed"
        shape="square"
        checked-color="#2E2926"
        custom-style="margin-right: 8rpx"
      >
        <text class="agreement-text">
          已阅读并同意
          <text class="link" @click.stop="openAgreement('user')">《用户协议》</text>
          和
          <text class="link" @click.stop="openAgreement('privacy')">《隐私政策》</text>
        </text>
      </wd-checkbox>
    </view>
  </view>
</template>

<script>
import { useAuthStore } from '@/stores/auth.js';
import { useBusinessConfigStore } from '@/stores/business-config.js';
import { useFamilyStore } from '@/stores/family.js';
import { userApi } from '@/api/user.js';

export default {
  data() {
    return { loading: false, agreed: false, phone: '', password: '', statusBarHeight: 0 };
  },
  onLoad(query) {
    this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
    if (!query.skipOnboarding) {
      uni.redirectTo({ url: '/pages/onboarding/index' });
    }
  },
  methods: {
    goBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        uni.navigateBack();
      } else {
        uni.switchTab({ url: '/pages/tabbar/home/home' });
      }
    },
    openAgreement(which) {
      const path = which === 'user' ? 'agreement-user' : 'agreement-privacy';
      uni.navigateTo({ url: `/pages/auth/${path}` });
    },
    /** 校验协议；通过返回 true */
    async precheck() {
      if (this.agreed) return true;
      const confirm = await new Promise((resolve) => {
        uni.showModal({
          title: '用户协议',
          content: '请先阅读并同意《用户协议》和《隐私政策》',
          confirmText: '同意',
          confirmColor: '#E07A5F',
          success: (r) => resolve(r.confirm),
          fail: () => resolve(false),
        });
      });
      if (confirm) this.agreed = true;
      return confirm;
    },
    /** 登录成功后的统一处理：默认头像、预热家庭、提示、跳转 */
    async afterLogin(auth, res) {
      // 新用户没有头像 → 设置男性默认头像
      if (!res.user.avatarUrl) {
        const cfg = useBusinessConfigStore();
        const avatarUrl = cfg.avatarFallback('male');
        const updated = await userApi.updateMe({ avatarUrl });
        auth.setUser(updated);
      }
      useFamilyStore()
        .refresh()
        .catch(() => {});
      uni.showToast({
        title: res.isNewUser ? '欢迎加入！' : '欢迎回来',
        icon: 'success',
      });
      const pages = getCurrentPages();
      if (pages.length > 1) {
        uni.navigateBack();
      } else {
        uni.switchTab({ url: '/pages/tabbar/home/home' });
      }
    },
    async handleWxLogin() {
      if (!(await this.precheck())) return;
      this.loading = true;
      try {
        const auth = useAuthStore();
        const res = await auth.wxLogin('male');
        await this.afterLogin(auth, res);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('wx login failed', err);
      } finally {
        this.loading = false;
      }
    },
    async handlePasswordLogin() {
      if (!(await this.precheck())) return;
      if (!/^1[3-9]\d{9}$/.test(this.phone)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
        return;
      }
      if (!this.password || this.password.length < 6) {
        uni.showToast({ title: '密码至少 6 位', icon: 'none' });
        return;
      }
      this.loading = true;
      try {
        const auth = useAuthStore();
        const res = await auth.passwordLogin(this.phone, this.password, 'male');
        await this.afterLogin(auth, res);
      } catch (err) {
        // 错误已由 http 层 toast；此处仅记录
        // eslint-disable-next-line no-console
        console.error('password login failed', err);
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.login {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #e07a5f 0%, #f0a08c 50%, #fddccc 100%);
  padding: 0 60rpx;
}

.nav-bar {
  width: 100%;
  display: flex;
  align-items: center;
  padding-bottom: 16rpx;
}

.back-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -12rpx;
}

.logo-area {
  margin-bottom: 16rpx;
}
.title {
  font-size: 64rpx;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16rpx;
}
.subtitle {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
}

/* ── H5 手机号 + 密码表单 ──────────────────────────────── */
.h5-form {
  width: 100%;
  margin-top: 56rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.h5-form :deep(.h5-input) {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
}
.h5-tip {
  margin-top: 20rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
}

.agreement-row {
  margin-top: 32rpx;
  display: flex;
  justify-content: center;
  width: 100%;
}
.agreement-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
}
.agreement-text .link {
  color: #fff;
  text-decoration: underline;
}
</style>

<style lang="scss">
page {
  height: 100vh;
  overflow: hidden;
}
</style>
