<template>
  <view class="page">
    <!-- Empty state -->
    <view v-if="!loading && conversations.length === 0" class="empty">
      <wd-icon name="chat" size="80rpx" color="#ccc" />
      <text class="empty-text">暂无消息</text>
    </view>

    <!-- Conversation list -->
    <view v-else class="list">
      <view
        v-for="item in conversations"
        :key="item.orderId"
        class="conv-item"
        @click="goChat(item.orderId)"
      >
        <image class="conv-avatar" :src="item.avatar" mode="aspectFill" />
        <view class="conv-body">
          <view class="conv-top">
            <text class="conv-name">{{ item.name }}</text>
            <text class="conv-time">{{ item.timeText }}</text>
          </view>
          <view class="conv-bottom">
            <text class="conv-preview">{{ item.preview }}</text>
            <view v-if="item.unread > 0" class="conv-badge">
              <text>{{ item.unread > 99 ? '99+' : item.unread }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { orderApi } from '@/api/order.js';
import { messageApi } from '@/api/message.js';
import { useChatUnreadStore } from '@/stores/chat-unread.js';
import { useAuthStore } from '@/stores/auth.js';
import { useBusinessConfigStore } from '@/stores/business-config.js';
import * as ws from '@/api/ws.js';
import { formatRelative } from '@/utils/labels.js';

export default {
  data() {
    return {
      conversations: [],
      loading: true,
    };
  },
  computed: {
    unreadStore() {
      return useChatUnreadStore();
    },
  },
  onShow() {
    this.load();
  },
  onLoad() {
    this._wsHandler = (data) => {
      this.handleWsMessage(data);
    };
    ws.on('order:message', this._wsHandler);
  },
  onUnload() {
    if (this._wsHandler) ws.off('order:message', this._wsHandler);
  },
  methods: {
    formatRelative,

    async load() {
      this.loading = true;
      try {
        const res = await orderApi.list({ page: 1, pageSize: 50 });
        const orders = res.items || res || [];
        const myId = useAuthStore().user?.id;

        // Fetch last message for each order in parallel
        const store = useChatUnreadStore();
        const tasks = orders.map(async (order) => {
          let preview = '';
          let timeText = '';
          try {
            const msgRes = await messageApi.list(order.id, { page: 1, pageSize: 1 });
            const msgs = msgRes.items || [];
            if (msgs.length > 0) {
              const last = msgs[0];
              timeText = formatRelative(last.createdAt);
              preview = this.previewText(last);
            }
          } catch {
            // ignore
          }

          const isCustomer = order.myRole === 'customer';
          const otherAvatar = isCustomer ? order.chefAvatarUrl : order.customerAvatarUrl;
          const names = (order.items || [])
            .map((i) => i.recipeSnapshot?.name || '?')
            .slice(0, 2)
            .join('、');

          return {
            orderId: order.id,
            name: names || '订单沟通',
            avatar:
              otherAvatar ||
              useBusinessConfigStore().avatarFallback(
                isCustomer ? order.chefGender : order.customerGender,
              ),
            preview: preview || '暂无消息',
            timeText,
            unread: order.unreadCount || 0,
          };
        });

        this.conversations = await Promise.all(tasks);
        // Initialize store from server unreadCount
        for (const order of orders) {
          if (order.unreadCount > 0) store.setCount(order.id, order.unreadCount);
        }
      } catch {
        // ignore
      } finally {
        this.loading = false;
      }
    },

    previewText(msg) {
      if (msg.type === 'text') return msg.content?.text || '';
      if (msg.type === 'emoji') return '[表情]';
      if (msg.type === 'image') return '[图片]';
      if (msg.type === 'rush') return '[催菜]';
      if (msg.type === 'tip') return '[打赏]';
      if (msg.type === 'system') return msg.content?.text || '[系统消息]';
      return '[消息]';
    },

    handleWsMessage(data) {
      const idx = this.conversations.findIndex((c) => c.orderId === data.orderId);
      if (idx !== -1) {
        const item = this.conversations[idx];
        item.preview = this.previewText(data.message);
        item.timeText = formatRelative(data.message.createdAt);
        item.unread = useChatUnreadStore().getCount(data.orderId);
        // Move to top
        this.conversations.splice(idx, 1);
        this.conversations.unshift(item);
      }
    },

    goChat(orderId) {
      uni.navigateTo({ url: `/pages/order/chat?id=${orderId}` });
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $fk-bg-page;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 240rpx;
}

.empty-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: $fk-text-muted;
}

.list {
  padding: 0 24rpx;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 24rpx;
  background: #fff;
  border-radius: 24rpx;
  margin-top: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(142, 133, 128, 0.05);
}

.conv-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: $fk-avatar-bg;
  flex-shrink: 0;
}

.conv-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.conv-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conv-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $fk-text;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 16rpx;
}

.conv-time {
  font-size: 22rpx;
  color: $fk-text-muted;
  flex-shrink: 0;
}

.conv-bottom {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.conv-preview {
  flex: 1;
  font-size: 26rpx;
  color: $fk-text-secondary;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.conv-badge {
  min-width: 36rpx;
  height: 36rpx;
  border-radius: 999rpx;
  background: $fk-error;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10rpx;
  flex-shrink: 0;
}

.conv-badge text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}
</style>
