<template>
  <view class="page">
    <view class="form">
      <view class="field">
        <view class="label-row">
          <wd-icon name="edit" size="28rpx" color="#6B6560" />
          <text class="label">写点什么 *</text>
        </view>
        <wd-textarea
          v-model="form.content"
          placeholder="哪里好用、哪里有 bug、想要什么新功能……"
          :maxlength="2000"
          show-word-limit
        />
      </view>
      <view class="field">
        <view class="label-row">
          <wd-icon name="user" size="28rpx" color="#6B6560" />
          <text class="label">联系方式（选填）</text>
        </view>
        <wd-input v-model="form.contact" placeholder="微信号 / 邮箱" :maxlength="200" clearable />
      </view>
    </view>

    <wd-button
      type="error"
      round
      block
      :loading="saving"
      :disabled="!canSubmit"
      @click="handleSubmit"
    >
      <wd-icon name="check" size="28rpx" color="#fff" custom-style="margin-right:8rpx" />
      提交
    </wd-button>
  </view>
</template>

<script>
import { feedbackApi } from '@/api/feedback.js';

export default {
  data() {
    return {
      form: { content: '', contact: '' },
      saving: false,
    };
  },
  computed: {
    canSubmit() {
      return this.form.content.trim().length >= 5;
    },
  },
  methods: {
    async handleSubmit() {
      if (!this.canSubmit) return;
      this.saving = true;
      try {
        await feedbackApi.create({
          content: this.form.content.trim(),
          contact: this.form.contact || undefined,
          platform: 'mp-weixin',
        });
        uni.showToast({ title: '已提交，谢谢', icon: 'success' });
        setTimeout(() => uni.navigateBack(), 800);
      } catch {
        // ignore
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
.form {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.field {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.label-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-bottom: 12rpx;
}
.label {
  color: #6b6560;
  font-size: 26rpx;
}
</style>
