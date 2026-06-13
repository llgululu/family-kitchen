<template>
  <view class="page">
    <view v-if="!notifications.length && !loading" class="empty">
      <view class="empty-icon">
        <wd-icon name="notification" size="80rpx" color="#D5CEC8" />
      </view>
      <text class="empty-title">暂无通知</text>
      <text class="empty-desc">有新消息时会在这里提醒你</text>
    </view>

    <view v-else class="list">
      <view
        v-for="item in notifications"
        :key="item.id"
        class="item"
        :class="{ unread: !item.readAt }"
        @click="handleClick(item)"
      >
        <view class="item-icon" :class="iconTheme(item.type)">
          <wd-icon :name="iconName(item.type)" size="36rpx" :color="iconColor(item.type)" />
        </view>
        <view class="item-body">
          <view class="item-head">
            <text class="item-title">{{ item.title }}</text>
            <text class="item-time">{{ formatRelative(item.createdAt) }}</text>
          </view>
          <text class="item-desc">{{ item.body }}</text>
        </view>
        <view v-if="!item.readAt" class="item-badge" />
      </view>

      <view v-if="hasMore" class="load-more" @click="loadMore">加载更多</view>
      <view v-else-if="notifications.length" class="load-more muted">没有更多了</view>
    </view>

    <!-- 全部已读 -->
    <view v-if="hasUnread" class="footer">
      <view class="mark-all-btn" @click="markAllRead">
        <wd-icon name="check" size="28rpx" color="#E07A5F" />
        <text>全部标记已读</text>
      </view>
    </view>
  </view>
</template>

<script>
import { notificationApi } from '@/api/notification.js';
import { formatRelative } from '@/utils/labels.js';

const TYPE_META = {
  order_accepted: { icon: 'check', theme: 'sage', color: '#6B9E78' },
  order_served: { icon: 'goods', theme: 'rose', color: '#E07A5F' },
  order_rushed: { icon: 'clock', theme: 'amber', color: '#D4A55A' },
  achievement_unlocked: { icon: 'star', theme: 'amber', color: '#D4A55A' },
  anniversary: { icon: 'heart', theme: 'rose', color: '#E07A5F' },
};

export default {
  data() {
    return {
      notifications: [],
      page: 1,
      pageSize: 20,
      total: 0,
      loading: false,
    };
  },
  computed: {
    hasMore() {
      return this.notifications.length < this.total;
    },
    hasUnread() {
      return this.notifications.some((n) => !n.readAt);
    },
  },
  onShow() {
    this.page = 1;
    this.load();
  },
  async onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.page += 1;
      await this.load();
    }
  },
  methods: {
    formatRelative,
    iconName(type) {
      return (TYPE_META[type] || {}).icon || 'notification';
    },
    iconTheme(type) {
      return 'icon--' + ((TYPE_META[type] || {}).theme || 'slate');
    },
    iconColor(type) {
      return (TYPE_META[type] || {}).color || '#6B8FA8';
    },
    async load() {
      this.loading = true;
      try {
        const res = await notificationApi.list({
          page: this.page,
          pageSize: this.pageSize,
        });
        this.notifications = this.page === 1 ? res.items : [...this.notifications, ...res.items];
        this.total = res.total;
      } finally {
        this.loading = false;
      }
    },
    loadMore() {
      this.page += 1;
      this.load();
    },
    async handleClick(item) {
      if (!item.readAt) {
        try {
          await notificationApi.markRead(item.id);
          item.readAt = new Date().toISOString();
        } catch {
          // ignore
        }
      }
      const data = item.data || {};
      if (data.orderId) {
        uni.navigateTo({ url: `/pages/order/detail?id=${data.orderId}` });
      }
    },
    async markAllRead() {
      try {
        await notificationApi.markAllRead();
        this.notifications.forEach((n) => {
          if (!n.readAt) n.readAt = new Date().toISOString();
        });
        uni.showToast({ title: '已全部已读', icon: 'success' });
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
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

/* ── Empty state ──────────────────────────────────────── */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 280rpx;
}
.empty-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: rgba(213, 206, 200, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28rpx;
}
.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $fk-text;
  margin-bottom: 8rpx;
}
.empty-desc {
  font-size: 26rpx;
  color: $fk-text-muted;
}

/* ── List ─────────────────────────────────────────────── */
.list {
  padding: 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

/* ── Item ─────────────────────────────────────────────── */
.item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 24rpx 24rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.05),
    0 4rpx 16rpx rgba(142, 133, 128, 0.03);
  transition: background 0.2s;

  &:active {
    background: #faf8f6;
  }

  &.unread {
    background: #fffbf9;
  }
}

.item-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon--rose {
  background: rgba(224, 122, 95, 0.1);
}
.icon--sage {
  background: rgba(107, 158, 120, 0.1);
}
.icon--amber {
  background: rgba(212, 165, 90, 0.1);
}
.icon--slate {
  background: rgba(107, 143, 168, 0.1);
}

.item-body {
  flex: 1;
  min-width: 0;
}

.item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6rpx;
}

.item-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $fk-text;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 16rpx;
}

.item-time {
  font-size: 22rpx;
  color: #b5aea8;
  flex-shrink: 0;
}

.item-desc {
  font-size: 26rpx;
  color: $fk-text-muted;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-badge {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #e07a5f;
  flex-shrink: 0;
  margin-top: 8rpx;
}

/* ── Load more ────────────────────────────────────────── */
.load-more {
  text-align: center;
  padding: 28rpx 0;
  color: $fk-text-muted;
  font-size: 26rpx;
}
.muted {
  color: #b5aea8;
}

/* ── Footer ───────────────────────────────────────────── */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-top: 1rpx solid rgba(213, 206, 200, 0.3);
}

.mark-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 20rpx;
  border-radius: 20rpx;
  background: rgba(224, 122, 95, 0.08);
  color: #e07a5f;
  font-size: 28rpx;
  font-weight: 500;

  &:active {
    background: rgba(224, 122, 95, 0.15);
  }
}
</style>
