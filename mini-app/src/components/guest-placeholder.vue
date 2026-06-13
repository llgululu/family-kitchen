<template>
  <view class="guest">
    <wd-icon :name="icon" size="96rpx" color="#E07A5F" />
    <text class="title">{{ title }}</text>
    <text class="desc">{{ desc }}</text>
    <wd-button type="error" round block @click="handleAction">{{ actionText }}</wd-button>
  </view>
</template>

<script>
export default {
  name: 'GuestPlaceholder',
  props: {
    icon: { type: String, default: 'home' },
    title: { type: String, default: '欢迎来到情侣厨房' },
    desc: { type: String, default: '登录后开启你和 TA 的小厨房' },
    // #ifdef MP-WEIXIN
    actionText: { type: String, default: '微信登录' },
    // #endif
    // #ifndef MP-WEIXIN
    actionText: { type: String, default: '登录' },
    // #endif
  },
  methods: {
    handleAction() {
      uni.navigateTo({ url: '/pages/auth/login' });
    },
  },
};
</script>

<style lang="scss" scoped>
.guest {
  margin-top: 200rpx;
  padding: 0 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2e2926;
  margin-top: 24rpx;
  margin-bottom: 16rpx;
}
.desc {
  font-size: 26rpx;
  color: #8e8580;
  margin-bottom: 48rpx;
  text-align: center;
}
</style>
