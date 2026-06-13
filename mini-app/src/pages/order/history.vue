<template>
  <view class="page">
    <!-- Filter chips -->
    <view class="filter-section">
      <scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
        <view
          v-for="r in roles"
          :key="r.value"
          class="chip"
          :class="{ active: role === r.value }"
          @click="setRole(r.value)"
        >
          {{ r.label }}
        </view>
      </scroll-view>
    </view>

    <!-- Empty state -->
    <view v-if="!items.length && !loading" class="empty">
      <view class="empty-icon">
        <wd-icon name="list" size="64rpx" color="#D5CEC8" />
      </view>
      <text class="empty-text">还没有订单</text>
    </view>

    <!-- Order list -->
    <view v-else class="list">
      <view
        v-for="(o, idx) in items"
        :key="o.id"
        class="card fade-up"
        :style="{ animationDelay: idx < 8 ? `${idx * 0.04}s` : '0s' }"
        @click="goDetail(o.id)"
      >
        <!-- Card top: status + time -->
        <view class="card-top">
          <view class="status-badge" :style="{ background: statusColor(o.status) }">
            <text>{{ statusLabel(o.status) }}</text>
          </view>
          <view class="card-time">
            <wd-icon name="clock" size="20rpx" color="#B5AEA8" />
            <text>{{ formatDateTime(o.createdAt) }}</text>
          </view>
        </view>

        <!-- Dishes -->
        <view class="dishes">
          <text v-for="item in o.items" :key="item.id" class="dish">
            {{ item.recipeSnapshot?.name || '?' }}
          </text>
        </view>

        <!-- Card bottom: who + love points -->
        <view class="card-foot">
          <view class="role-hint">
            <wd-icon
              :name="o.myRole === 'customer' ? 'chat' : 'user'"
              size="20rpx"
              color="#8E8580"
            />
            <text>{{
              o.myRole === 'customer'
                ? `点了 ${o.chefNickname || 'TA'}`
                : `做了 ${o.customerNickname || 'TA'} 点的`
            }}</text>
          </view>
          <view v-if="o.totalLovePoints" class="lp">
            <wd-icon name="heart" size="22rpx" color="#E07A5F" />
            <text>+{{ o.totalLovePoints }}</text>
          </view>
          <view class="arrow-hint">
            <wd-icon name="arrow-right" size="24rpx" color="#D5CEC8" />
          </view>
        </view>
      </view>

      <!-- Load more -->
      <view v-if="hasMore" class="load-more" @click="loadMore">
        <text>加载更多</text>
      </view>
      <view v-else-if="items.length" class="load-end">
        <view class="load-end-line" />
        <text>没有更多了</text>
        <view class="load-end-line" />
      </view>
    </view>
  </view>
</template>

<script>
import { orderApi } from '@/api/order.js';
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, formatDateTime } from '@/utils/labels.js';

export default {
  data() {
    return {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      loading: false,
      role: 'any',
      roles: [
        { value: 'any', label: '全部' },
        { value: 'customer', label: '我点的' },
        { value: 'chef', label: '我做的' },
      ],
    };
  },
  computed: {
    hasMore() {
      return this.items.length < this.total;
    },
  },
  onShow() {
    this.page = 1;
    this.load();
  },
  async onReachBottom() {
    if (this.hasMore && !this.loading) {
      await this.loadMore();
    }
  },
  methods: {
    formatDateTime,
    statusLabel(s) {
      return ORDER_STATUS_LABEL[s] || s;
    },
    statusColor(s) {
      return ORDER_STATUS_COLOR[s] || '#8E8580';
    },
    setRole(r) {
      this.role = r;
      this.page = 1;
      this.load();
    },
    async load() {
      this.loading = true;
      try {
        const res = await orderApi.list({
          page: this.page,
          pageSize: this.pageSize,
          role: this.role,
        });
        this.items = this.page === 1 ? res.items : [...this.items, ...res.items];
        this.total = res.total;
      } finally {
        this.loading = false;
      }
    },
    async loadMore() {
      this.page += 1;
      await this.load();
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/order/detail?id=${id}` });
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $fk-bg-page;
  padding-bottom: env(safe-area-inset-bottom);
}

/* ── Filter chips ───────────────────────────────────────── */
.filter-section {
  padding: 20rpx 28rpx 0;
}

.filter-scroll {
  white-space: nowrap;
}

.chip {
  display: inline-block;
  padding: 14rpx 32rpx;
  margin-right: 16rpx;
  background: #fff;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: $fk-text-secondary;
  font-weight: 500;
  box-shadow: 0 2rpx 6rpx rgba(142, 133, 128, 0.06);
}

.chip.active {
  background: $fk-primary;
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(224, 122, 95, 0.25);
}

/* ── Empty state ────────────────────────────────────────── */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 200rpx 0;
}

.empty-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: $fk-avatar-bg;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: 28rpx;
  color: $fk-text-muted;
}

/* ── Order list ─────────────────────────────────────────── */
.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 16rpx 28rpx 32rpx;
}

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.05),
    0 6rpx 24rpx rgba(142, 133, 128, 0.03);
}

/* Card top */
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.status-badge {
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}

.card-time {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  color: $fk-text-placeholder;
}

/* Dishes */
.dishes {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.dish {
  background: $fk-primary-lighter;
  color: $fk-primary;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 500;
}

/* Card foot */
.card-foot {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid $fk-border-light;
}

.role-hint {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 24rpx;
  color: $fk-text-muted;
}

.lp {
  display: flex;
  align-items: center;
  gap: 4rpx;
  color: $fk-primary;
  font-weight: 600;
  font-size: 26rpx;
}

.arrow-hint {
  margin-left: auto;
}

/* ── Load more ──────────────────────────────────────────── */
.load-more {
  text-align: center;
  padding: 28rpx 0;
  font-size: 26rpx;
  color: $fk-primary;
  font-weight: 500;
}

.load-end {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 0;
  font-size: 24rpx;
  color: $fk-text-placeholder;
}

.load-end-line {
  flex: 1;
  height: 1rpx;
  background: $fk-border-light;
}

/* ── Animations ─────────────────────────────────────────── */
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(16rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-up {
  animation: fadeUp 0.35s ease-out both;
}
</style>
