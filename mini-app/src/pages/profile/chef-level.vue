<template>
  <view class="page">
    <!-- Current level card -->
    <view v-if="info" class="current-card">
      <view class="current-emoji">{{ info.emoji }}</view>
      <view class="current-info">
        <text class="current-title">{{ info.title }}</text>
        <view class="current-stats">
          <view class="stat">
            <text class="stat-value">{{ info.totalOrders }}</text>
            <text class="stat-label">完成订单</text>
          </view>
          <view class="stat-divider" />
          <view class="stat">
            <text class="stat-value">{{ info.avgRating }}</text>
            <text class="stat-label">平均评分</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Next level progress -->
    <view v-if="info?.nextLevel" class="next-card">
      <view class="next-head">
        <text class="next-label">距离下一等级</text>
        <text class="next-title">{{ info.nextLevel.title }}</text>
      </view>
      <view class="progress-row">
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: orderProgress + '%' }" />
        </view>
        <text class="progress-text">{{ info.totalOrders }}/{{ info.nextLevel.minOrders }} 单</text>
      </view>
      <view class="progress-row">
        <view class="progress-track">
          <view
            class="progress-fill progress-fill--amber"
            :style="{ width: ratingProgress + '%' }"
          />
        </view>
        <text class="progress-text">{{ info.avgRating }}/{{ info.nextLevel.minAvgRating }} 分</text>
      </view>
    </view>

    <!-- All levels -->
    <view class="levels-card">
      <text class="section-title">等级说明</text>
      <view
        v-for="(lv, idx) in levels"
        :key="lv.key"
        class="level-row"
        :class="{ active: lv.key === info?.level }"
      >
        <view class="level-index">{{ idx + 1 }}</view>
        <text class="level-emoji">{{ lv.emoji }}</text>
        <view class="level-body">
          <text class="level-title">{{ lv.title }}</text>
          <text class="level-req">
            <text v-if="lv.minOrders === 0">初始等级</text>
            <text v-else>{{ lv.minOrders }} 单 + 平均 {{ lv.minAvgRating }} 分</text>
          </text>
        </view>
        <view v-if="lv.key === info?.level" class="level-current">
          <wd-icon name="check" size="28rpx" color="#6B9E78" />
        </view>
      </view>
    </view>

    <!-- Tips -->
    <view class="tips-card">
      <text class="section-title">如何升级</text>
      <view class="tip">
        <wd-icon name="goods" size="28rpx" color="#E07A5F" />
        <text>接单并完成订单，积累订单数</text>
      </view>
      <view class="tip">
        <wd-icon name="star" size="28rpx" color="#D4A55A" />
        <text>做出好菜获得高分评价，提升平均分</text>
      </view>
      <view class="tip">
        <wd-icon name="heart" size="28rpx" color="#6B9E78" />
        <text>两个条件同时满足即可自动升级</text>
      </view>
    </view>
  </view>
</template>

<script>
import { userApi } from '@/api/user.js';

export default {
  data() {
    return {
      info: null,
      levels: [],
    };
  },
  computed: {
    orderProgress() {
      if (!this.info?.nextLevel) return 0;
      const target = this.info.nextLevel.minOrders;
      if (target === 0) return 100;
      return Math.min(100, Math.round((this.info.totalOrders / target) * 100));
    },
    ratingProgress() {
      if (!this.info?.nextLevel) return 0;
      const target = this.info.nextLevel.minAvgRating;
      if (target === 0) return 100;
      return Math.min(100, Math.round((this.info.avgRating / target) * 100));
    },
  },
  onShow() {
    this.load();
  },
  methods: {
    async load() {
      try {
        const res = await userApi.getChefLevel();
        this.info = res;
        this.levels = res.levels || [];
      } catch {
        // ignore
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $fk-bg-page;
  padding: 24rpx 28rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* ── Current level ────────────────────────────────────── */
.current-card {
  background: linear-gradient(135deg, #e07a5f 0%, #ee9a86 50%, #f0a08c 100%);
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 28rpx;
}

.current-emoji {
  font-size: 88rpx;
  line-height: 1;
}

.current-info {
  flex: 1;
}

.current-title {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 20rpx;
}

.current-stats {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 4rpx;
}

.stat-divider {
  width: 1rpx;
  height: 48rpx;
  background: rgba(255, 255, 255, 0.25);
}

/* ── Next level progress ──────────────────────────────── */
.next-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.05),
    0 4rpx 16rpx rgba(142, 133, 128, 0.03);
}

.next-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.next-label {
  font-size: 26rpx;
  color: $fk-text-muted;
}

.next-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $fk-primary;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 12rpx;
}

.progress-track {
  flex: 1;
  height: 12rpx;
  border-radius: 6rpx;
  background: $fk-bg-page;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 6rpx;
  background: $fk-primary;
  transition: width 0.3s;
}

.progress-fill--amber {
  background: #d4a55a;
}

.progress-text {
  font-size: 22rpx;
  color: $fk-text-muted;
  white-space: nowrap;
  min-width: 120rpx;
  text-align: right;
}

/* ── All levels ───────────────────────────────────────── */
.levels-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.05),
    0 4rpx 16rpx rgba(142, 133, 128, 0.03);
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $fk-text;
  margin-bottom: 20rpx;
}

.level-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 12rpx;
  border-bottom: 1rpx solid $fk-border-light;
}

.level-row:last-child {
  border-bottom: none;
}

.level-row.active {
  background: rgba(224, 122, 95, 0.06);
  border-radius: 16rpx;
  margin: 0 -12rpx;
  padding: 20rpx 24rpx;
  border-bottom-color: transparent;
}

.level-index {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: $fk-bg-page;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 600;
  color: $fk-text-muted;
  flex-shrink: 0;
}

.level-row.active .level-index {
  background: rgba(224, 122, 95, 0.15);
  color: $fk-primary;
}

.level-emoji {
  font-size: 40rpx;
  line-height: 1;
}

.level-body {
  flex: 1;
  min-width: 0;
}

.level-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $fk-text;
}

.level-req {
  display: block;
  font-size: 24rpx;
  color: $fk-text-muted;
  margin-top: 4rpx;
}

.level-current {
  flex-shrink: 0;
}

/* ── Tips ─────────────────────────────────────────────── */
.tips-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.05),
    0 4rpx 16rpx rgba(142, 133, 128, 0.03);
}

.tip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: $fk-text-secondary;
}
</style>
