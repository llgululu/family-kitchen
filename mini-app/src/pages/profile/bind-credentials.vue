<template>
  <view class="page">
    <view class="intro">
      <wd-icon name="computer" size="56rpx" color="#E07A5F" />
      <text class="intro-title">开通网页版登录</text>
      <text class="intro-desc">
        绑定手机号并设置密码后，即可在浏览器（H5 网页版）用「手机号 +
        密码」登录，与小程序共享同一份数据。
      </text>
    </view>

    <view class="form">
      <view class="field">
        <view class="label-row">
          <wd-icon name="phone" size="28rpx" color="#8E8580" />
          <text class="label">手机号</text>
        </view>
        <wd-input
          v-model="phone"
          type="number"
          :maxlength="11"
          placeholder="请输入手机号"
          clearable
        />
      </view>

      <view class="field">
        <view class="label-row">
          <wd-icon name="lock-on" size="28rpx" color="#8E8580" />
          <text class="label">登录密码</text>
        </view>
        <wd-input
          v-model="password"
          show-password
          :maxlength="64"
          placeholder="设置密码（至少 6 位）"
          clearable
        />
      </view>
    </view>

    <wd-button type="error" round block :loading="saving" @click="handleSave">
      {{ alreadyBound ? '更新登录信息' : '保存并开通' }}
    </wd-button>
    <view v-if="alreadyBound" class="bound-tip">当前已绑定手机号，可重新设置</view>
  </view>
</template>

<script>
import { useAuthStore } from '@/stores/auth.js';
import { userApi } from '@/api/user.js';

export default {
  data() {
    return { phone: '', password: '', saving: false, alreadyBound: false };
  },
  async onLoad() {
    const me = await userApi.me().catch(() => null);
    if (me) {
      this.phone = me.phone || '';
      this.alreadyBound = !!me.hasPassword;
    }
  },
  methods: {
    async handleSave() {
      if (!/^1[3-9]\d{9}$/.test(this.phone)) {
        uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
        return;
      }
      if (!this.password || this.password.length < 6) {
        uni.showToast({ title: '密码至少 6 位', icon: 'none' });
        return;
      }
      this.saving = true;
      try {
        const updated = await userApi.bindCredentials(this.phone, this.password);
        useAuthStore().setUser(updated);
        uni.showToast({ title: '已开通网页版登录', icon: 'success' });
        setTimeout(() => uni.navigateBack(), 700);
      } catch (err) {
        const code = err?.code;
        if (code === 'PHONE_BOUND_TO_FAMILY' || code === 'PHONE_REGISTERED_NO_FAMILY') {
          uni.showModal({
            title: '无法绑定',
            content: err?.message || '该手机号已被使用',
            showCancel: false,
            confirmText: '我知道了',
          });
        }
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}
.intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48rpx 32rpx 32rpx;
}
.intro-title {
  margin-top: 16rpx;
  font-size: 34rpx;
  font-weight: 600;
  color: $fk-text;
}
.intro-desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: $fk-text-muted;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 48rpx;
}
.field {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
}
.label-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}
.label {
  color: $fk-text;
  font-size: 28rpx;
  font-weight: 500;
}
.bound-tip {
  margin-top: 20rpx;
  text-align: center;
  font-size: 24rpx;
  color: $fk-text-muted;
}
</style>
