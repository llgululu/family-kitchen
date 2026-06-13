<template>
  <view class="page">
    <swiper
      class="swiper"
      :current="current"
      :indicator-dots="false"
      :autoplay="false"
      @change="(e) => (current = e.detail.current)"
    >
      <swiper-item v-for="(page, idx) in pages" :key="idx">
        <view class="slide">
          <view class="slide-decor">
            <view class="decor-circle decor-circle--1" />
            <view class="decor-circle decor-circle--2" />
          </view>
          <view class="slide-content">
            <text class="slide-emoji">{{ page.emoji }}</text>
            <text class="slide-title">{{ page.title }}</text>
            <text class="slide-desc">{{ page.desc }}</text>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <!-- 自定义指示器 -->
    <view class="dots">
      <view
        v-for="(page, idx) in pages"
        :key="idx"
        class="dot"
        :class="{ active: idx === current }"
      />
    </view>

    <!-- 底部操作 -->
    <view class="footer">
      <text v-if="current < pages.length - 1" class="skip" @click="finish">跳过</text>
      <view v-else class="start-btn" @click="finish">
        <text>开始使用</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      current: 0,
      pages: [
        {
          emoji: '\uD83C\uDF5B',
          title: '点菜下单',
          desc: '选择菜谱，让 TA 为你做一顿爱心餐',
        },
        {
          emoji: '\uD83D\uDC68\u200D\uD83C\uDF73',
          title: '做菜记录',
          desc: '厨师接单、备菜、烹饪，每个环节都有温度',
        },
        {
          emoji: '\u2764\uFE0F',
          title: '甜蜜回忆',
          desc: '爱心币、成就徽章、时间线，记录你们的专属时光',
        },
      ],
    };
  },
  methods: {
    finish() {
      uni.redirectTo({ url: '/pages/auth/login?skipOnboarding=1' });
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  width: 100vw;
  height: 100vh;
  background: #fff;
  position: relative;
  overflow: hidden;
}

/* swiper 必须给明确高度，H5 不支持 flex 撑高 */
.swiper {
  width: 100%;
  height: calc(100vh - 280rpx);
}

/* H5 下 swiper-item 是 Web Component，需显式全高 */
:host,
swiper-item {
  height: 100% !important;
}

.slide {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.slide-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.decor-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(224, 122, 95, 0.06);
}
.decor-circle--1 {
  width: 400rpx;
  height: 400rpx;
  top: -120rpx;
  right: -80rpx;
}
.decor-circle--2 {
  width: 240rpx;
  height: 240rpx;
  bottom: 80rpx;
  left: -60rpx;
}

.slide-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 64rpx;
}

.slide-emoji {
  font-size: 160rpx;
  margin-bottom: 48rpx;
}

.slide-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #3a3632;
  margin-bottom: 20rpx;
}

.slide-desc {
  font-size: 28rpx;
  color: #8e8580;
  line-height: 1.6;
}

/* 指示器 */
.dots {
  display: flex;
  justify-content: center;
  gap: 12rpx;
  padding: 32rpx 0;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #d5cec8;
  transition: all 0.3s;
}
.dot.active {
  width: 40rpx;
  border-radius: 8rpx;
  background: #e07a5f;
}

/* 底部 */
.footer {
  padding: 32rpx 48rpx 80rpx;
  padding-bottom: calc(80rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
}

.skip {
  font-size: 30rpx;
  color: #8e8580;
  padding: 16rpx 40rpx;
}

.start-btn {
  padding: 24rpx 96rpx;
  border-radius: 999rpx;
  background: #e07a5f;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(224, 122, 95, 0.3);
}
</style>

<!-- 非 scoped：穿透 H5 的 Web Component，让 swiper-item 撑满高度 -->
<style lang="scss">
uni-swiper-item,
swiper-item {
  height: 100% !important;
}
</style>
