<template>
  <view class="page">
    <view class="hero">
      <wd-icon name="home" size="120rpx" color="#E07A5F" />
      <text class="title">情侣厨房</text>
      <text class="version">MVP v0.1.0</text>
    </view>

    <wd-cell-group bordered>
      <wd-cell title="用户协议" is-link @click="openPolicy">
        <template #icon>
          <wd-icon name="read" size="36rpx" color="#8E8580" custom-style="margin-right:12rpx" />
        </template>
      </wd-cell>
      <wd-cell title="隐私政策" is-link @click="openPrivacy">
        <template #icon>
          <wd-icon name="secured" size="36rpx" color="#8E8580" custom-style="margin-right:12rpx" />
        </template>
      </wd-cell>
    </wd-cell-group>

    <view class="footer">
      <view class="footer-text">
        <wd-icon name="heart" size="24rpx" color="#E07A5F" />
        <text class="muted">情侣厨房 · 让爱意从一顿饭开始</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    openPolicy() {
      uni.navigateTo({ url: '/pages/auth/agreement-user' });
    },
    openPrivacy() {
      uni.navigateTo({ url: '/pages/auth/agreement-privacy' });
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  padding: 60rpx 24rpx;
}
.hero {
  text-align: center;
  margin-bottom: 60rpx;
}
.title {
  display: block;
  font-size: 44rpx;
  font-weight: 600;
  margin-top: 16rpx;
}
.version {
  display: block;
  font-size: 26rpx;
  color: #8e8580;
  margin-top: 8rpx;
}
.muted {
  color: #8e8580;
}
.footer {
  margin-top: 60rpx;
  text-align: center;
}
.footer-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
}
</style>
