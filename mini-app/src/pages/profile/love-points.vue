<template>
  <view class="page">
    <view v-if="!hasFamily" class="empty">
      <wd-icon name="home" size="96rpx" color="#D5CEC8" />
      <text class="empty-text">请先创建或加入小厨房</text>
      <wd-button size="small" type="error" @click="goSetup"> 创建 / 加入小厨房 </wd-button>
    </view>
    <template v-else>
      <view class="balance-card">
        <view class="balance-label">
          <wd-icon name="heart" size="28rpx" color="rgba(255,255,255,0.9)" />
          爱心币余额
        </view>
        <text class="balance-value">{{ balance?.balance ?? 0 }}</text>
        <view class="month-row">
          <text class="month-item">
            <wd-icon name="arrow-up" size="22rpx" color="rgba(255,255,255,0.9)" />
            本月赚 +{{ balance?.monthEarned ?? 0 }}
          </text>
          <text class="month-item">
            <wd-icon name="arrow-down" size="22rpx" color="rgba(255,255,255,0.9)" />
            本月花 -{{ balance?.monthSpent ?? 0 }}
          </text>
        </view>
        <view class="checkin-btn" :class="{ disabled: checkedIn }" @click="handleCheckIn">
          <wd-icon
            name="check"
            size="24rpx"
            :color="checkedIn ? 'rgba(255,255,255,0.5)' : '#fff'"
          />
          <text>{{ checkedIn ? '已签到' : '每日签到 +2' }}</text>
        </view>
      </view>

      <wd-tabs v-model="scope" @change="setScope">
        <wd-tab name="me" title="我的流水" />
        <wd-tab name="family" title="家庭账本" />
      </wd-tabs>

      <view v-if="!logs.length && !loading" class="empty">
        <wd-icon name="wallet" size="64rpx" color="#8E8580" />
        <text class="muted">还没有流水</text>
      </view>
      <view v-else class="list">
        <view v-for="l in logs" :key="l.id" class="log">
          <view class="log-head">
            <view class="log-type">
              <wd-icon
                :name="l.changeAmount > 0 ? 'add' : 'decrease'"
                size="24rpx"
                :color="l.changeAmount > 0 ? '#6B9E78' : '#C75B5B'"
              />
              <text class="log-type-text">{{ typeLabel(l.changeType) }}</text>
            </view>
            <text class="log-amount" :class="{ pos: l.changeAmount > 0, neg: l.changeAmount < 0 }">
              {{ l.changeAmount >= 0 ? '+' : '' }}{{ l.changeAmount }}
            </text>
          </view>
          <view class="log-meta">
            <text class="muted">{{ l.description || '-' }}</text>
            <text class="muted">{{ formatDateTime(l.createdAt) }}</text>
          </view>
          <view v-if="canReverse(l)" class="log-actions">
            <text class="reverse-btn" @click="reverseTip(l)">
              <wd-icon name="rollback" size="22rpx" color="#E07A5F" />
              撤回
            </text>
          </view>
        </view>
        <view v-if="hasMore" class="load-more" @click="loadMore">加载更多</view>
        <view v-else-if="logs.length" class="load-more muted">没有更多了</view>
      </view>
    </template>
  </view>
</template>

<script>
import { lovePointApi } from '@/api/love-point.js';
import { useFamilyStore } from '@/stores/family.js';
import { LOVE_POINT_TYPE_LABEL, formatDateTime } from '@/utils/labels.js';

export default {
  data() {
    return {
      scope: 'me',
      balance: null,
      logs: [],
      page: 1,
      pageSize: 20,
      total: 0,
      loading: false,
      checkedIn: false,
    };
  },
  computed: {
    hasFamily() {
      return !!useFamilyStore().family;
    },
    hasMore() {
      return this.logs.length < this.total;
    },
  },
  onShow() {
    if (!this.hasFamily) return;
    this.loadBalance();
    this.page = 1;
    this.loadLogs();
    this.checkTodayCheckIn();
  },
  async onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.page += 1;
      await this.loadLogs();
    }
  },
  methods: {
    formatDateTime,
    goSetup() {
      uni.navigateTo({ url: '/pages/family/setup' });
    },
    typeLabel(t) {
      return LOVE_POINT_TYPE_LABEL[t] || t;
    },
    canReverse(log) {
      if (log.changeType !== 'tip_send') return false;
      if (log.isReversed) return false;
      if (this.scope !== 'me') return false;
      const elapsed = Date.now() - new Date(log.createdAt).getTime();
      return elapsed < 24 * 60 * 60 * 1000;
    },
    setScope({ name }) {
      this.scope = name;
      this.page = 1;
      this.loadLogs();
    },
    async loadBalance() {
      try {
        this.balance = await lovePointApi.balance();
      } catch {
        // ignore
      }
    },
    checkTodayCheckIn() {
      // Check if there's a check_in log in today's logs
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      this.checkedIn = this.logs.some(
        (l) => l.changeType === 'check_in' && new Date(l.createdAt) >= todayStart,
      );
    },
    async handleCheckIn() {
      if (this.checkedIn) return;
      try {
        const res = await lovePointApi.checkIn();
        this.checkedIn = true;
        uni.showToast({ title: `签到成功 +${res.earned}`, icon: 'success' });
        await this.loadBalance();
        this.page = 1;
        await this.loadLogs();
      } catch {
        this.checkedIn = true;
      }
    },
    async loadLogs() {
      this.loading = true;
      try {
        const res = await lovePointApi.logs({
          page: this.page,
          pageSize: this.pageSize,
          scope: this.scope,
        });
        this.logs = this.page === 1 ? res.items : [...this.logs, ...res.items];
        this.total = res.total;
      } finally {
        this.loading = false;
      }
    },
    async loadMore() {
      this.page += 1;
      await this.loadLogs();
    },
    async reverseTip(log) {
      const res = await new Promise((resolve) => {
        uni.showModal({
          title: '撤回打赏',
          content: '撤回后 TA 也会收到通知',
          success: (r) => resolve(r.confirm),
        });
      });
      if (!res) return;
      try {
        await lovePointApi.reverse(log.id);
        uni.showToast({ title: '已撤回', icon: 'success' });
        this.page = 1;
        await Promise.all([this.loadBalance(), this.loadLogs()]);
      } catch {
        // ignore
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}
.balance-card {
  background: linear-gradient(135deg, #e07a5f 0%, #d4a55a 100%);
  color: #fff;
  border-radius: 16rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 24rpx;
  text-align: center;
}
.balance-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  font-size: 26rpx;
  opacity: 0.9;
}
.balance-value {
  display: block;
  font-size: 80rpx;
  font-weight: 700;
  margin: 12rpx 0;
}
.month-row {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  font-size: 24rpx;
  opacity: 0.95;
}
.month-item {
  display: flex;
  align-items: center;
  gap: 4rpx;
}
.checkin-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 20rpx;
  padding: 14rpx 32rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.25);
  border: 2rpx solid rgba(255, 255, 255, 0.4);
  color: #fff;
  font-size: 26rpx;
  font-weight: 500;
  &.disabled {
    opacity: 0.5;
  }
}
.muted {
  color: #8e8580;
  font-size: 24rpx;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  text-align: center;
  padding: 200rpx 0;
}
.empty-text {
  margin: 24rpx 0 32rpx;
  color: #8e8580;
  font-size: 28rpx;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.log {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}
.log-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.log-type {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.log-type-text {
  font-weight: 500;
}
.log-amount {
  font-weight: 600;
}
.log-amount.pos {
  color: #6b9e78;
}
.log-amount.neg {
  color: #c75b5b;
}
.log-meta {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
}
.log-actions {
  margin-top: 8rpx;
  text-align: right;
}
.reverse-btn {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  color: #e07a5f;
  font-size: 24rpx;
}
.load-more {
  text-align: center;
  padding: 24rpx;
  color: #8e8580;
}
</style>
