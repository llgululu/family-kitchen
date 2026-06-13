<template>
  <view class="chat-page">
    <!-- Custom nav -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @click="goBack">
          <wd-icon name="thin-arrow-left" size="36rpx" color="#2E2926" />
        </view>
        <view class="nav-center">
          <text class="nav-title">{{ orderDishNames }}</text>
          <view class="nav-status-badge" :style="{ background: statusBg }">
            <text :style="{ color: statusColor }">{{ statusLabel }}</text>
          </view>
        </view>
        <view class="nav-action" @click="goDetail">
          <wd-icon name="list" size="36rpx" color="#6B6560" />
        </view>
      </view>
    </view>

    <!-- Message list -->
    <scroll-view
      scroll-y
      class="msg-scroll"
      :scroll-into-view="scrollIntoView"
      :scroll-with-animation="true"
      @click="emojiOpen = false"
      @scroll="onScroll"
      @scrolltolower="onScrollToBottom"
    >
      <view class="msg-list">
        <!-- Date separator -->
        <view class="msg-date">
          <text>{{ orderTime }}</text>
        </view>

        <view
          v-for="msg in messages"
          :key="msg.id"
          class="msg-row"
          :class="{
            'msg-row--mine': msg.senderUserId === myUserId,
            'msg-row--sys': msg.type === 'system' || !msg.senderUserId,
          }"
        >
          <!-- System message -->
          <view v-if="msg.type === 'system' || !msg.senderUserId" class="msg-sys">
            <text>{{
              msg.type === 'rush' ? '催菜！' : msg.content?.text || JSON.stringify(msg.content)
            }}</text>
          </view>

          <!-- AI assistant message -->
          <view v-else-if="msg.type === 'ai_assistant'" class="msg-row--ai">
            <view class="ai-avatar">
              <text class="ai-avatar-icon">&#x2728;</text>
            </view>
            <view class="ai-bubble">
              <text class="ai-text">✨ {{ msg.content?.text }}</text>
            </view>
          </view>

          <!-- Normal message -->
          <template v-else>
            <image
              v-if="msg.senderUserId !== myUserId"
              class="msg-avatar"
              :src="otherAvatar"
              mode="aspectFill"
            />
            <view
              class="msg-bubble-wrap"
              :class="{ 'msg-bubble-wrap--mine': msg.senderUserId === myUserId }"
            >
              <!-- Tip card -->
              <view v-if="msg.type === 'tip'" class="msg-card msg-card--tip">
                <view class="msg-card-icon">
                  <wd-icon name="thumb-up" size="40rpx" color="#E07A5F" />
                </view>
                <view class="msg-card-body">
                  <text class="msg-card-title">打赏 {{ msg.content?.amount }} 爱心币</text>
                  <text v-if="msg.content?.title" class="msg-card-sub">{{
                    msg.content.title
                  }}</text>
                </view>
              </view>
              <!-- Rush card -->
              <view v-else-if="msg.type === 'rush'" class="msg-card msg-card--rush">
                <view class="msg-card-icon">
                  <wd-icon name="clock" size="40rpx" color="#D4A55A" />
                </view>
                <view class="msg-card-body">
                  <text class="msg-card-title">催菜！</text>
                  <text class="msg-card-sub">快饿啦～</text>
                </view>
              </view>
              <!-- Regular bubble -->
              <view
                v-else
                class="msg-bubble"
                :class="{ 'msg-bubble--mine': msg.senderUserId === myUserId }"
              >
                <!-- Text -->
                <text v-if="msg.type === 'text'" class="msg-text">{{ msg.content?.text }}</text>
                <!-- Emoji -->
                <text v-else-if="msg.type === 'emoji'" class="msg-emoji">{{
                  emojiOf(msg.content?.emojiKey)
                }}</text>
                <!-- Image -->
                <image
                  v-else-if="msg.type === 'image'"
                  :src="msg.content?.imageUrl"
                  class="msg-photo"
                  mode="widthFix"
                  @click="previewImages([msg.content?.imageUrl], msg.content?.imageUrl)"
                />
                <!-- Fallback -->
                <text v-else class="msg-text">{{ JSON.stringify(msg.content) }}</text>
              </view>
              <!-- Timestamp + read status -->
              <view class="msg-meta" :class="{ 'msg-meta--mine': msg.senderUserId === myUserId }">
                <text
                  v-if="msg.senderUserId === myUserId && msg.type !== 'system'"
                  class="msg-read"
                >
                  {{ msg.readAt ? '已读' : '未读' }}
                </text>
                <text class="msg-time">
                  {{ formatTimeShort(msg.createdAt) }}
                </text>
              </view>
            </view>
            <image
              v-if="msg.senderUserId === myUserId"
              class="msg-avatar"
              :src="myAvatar"
              mode="aspectFill"
            />
          </template>
        </view>

        <!-- AI streaming bubble -->
        <view v-if="aiStreaming && aiStreamContent" class="msg-row--ai">
          <view class="ai-avatar">
            <text class="ai-avatar-icon">&#x2728;</text>
          </view>
          <view class="ai-bubble ai-bubble--streaming">
            <text class="ai-text">✨ {{ aiStreamContent }}<span class="ai-cursor">|</span></text>
          </view>
        </view>

        <!-- Bottom anchor -->
        <view id="chat-bottom-anchor" class="msg-bottom-spacer" />
      </view>
    </scroll-view>

    <!-- New message hint (shown when scrolled up) -->
    <view v-if="newMsgCount > 0" class="new-msg-hint" @click="onNewMsgTap">
      <text class="new-msg-text">{{ newMsgCount }}条新消息</text>
      <text class="new-msg-arrow">↓</text>
    </view>

    <!-- Input bar (only for non-terminal orders) -->
    <view v-if="!isTerminal" class="input-area">
      <view v-if="emojiOpen" class="emoji-panel">
        <view v-for="e in EMOJI_PALETTE" :key="e.key" class="emoji-item" @click="sendEmoji(e.key)">
          <text class="emoji-big">{{ e.emoji }}</text>
          <text class="emoji-label">{{ e.label }}</text>
        </view>
        <view class="emoji-safe" />
      </view>
      <view class="input-bar">
        <view class="bar-icon ai-icon" @click="sendAiChat">
          <text class="ai-sparkle">&#x2728;</text>
        </view>
        <view v-if="canRush" class="bar-icon" @click="sendRush">
          <wd-icon name="clock" size="44rpx" color="#D4A55A" />
        </view>
        <view
          class="bar-icon emoji-trigger"
          :class="{ active: emojiOpen }"
          @click="emojiOpen = !emojiOpen"
        >
          <text class="emoji-trigger-icon">&#x1F60A;</text>
        </view>
        <input
          v-model="msgText"
          class="msg-input"
          placeholder="说点什么…"
          confirm-type="send"
          maxlength="200"
          @confirm="sendText"
          @focus="emojiOpen = false"
        />
        <view class="send-btn" :class="{ disabled: !msgText.trim() }" @click="sendText">
          <text>发送</text>
        </view>
      </view>
    </view>

    <!-- Terminal state hint -->
    <view v-else class="terminal-hint">
      <text>订单已结束</text>
    </view>
  </view>
</template>

<script>
import { useAuthStore } from '@/stores/auth.js';
import { useBusinessConfigStore } from '@/stores/business-config.js';
import { useChatUnreadStore } from '@/stores/chat-unread.js';
import { orderApi } from '@/api/order.js';
import { messageApi } from '@/api/message.js';
import { aiApi } from '@/api/ai.js';
import * as ws from '@/api/ws.js';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_COLOR,
  EMOJI_PALETTE,
  formatTimeShort,
} from '@/utils/labels.js';
import { setActiveChatOrderId } from '@/utils/chat-active.js';

const TERMINAL = ['completed', 'rejected', 'cancelled'];

export default {
  data() {
    return {
      EMOJI_PALETTE,
      orderId: null,
      order: null,
      messages: [],
      msgText: '',
      emojiOpen: false,
      scrollIntoView: '',
      statusBarHeight: 0,
      isAtBottom: true,
      newMsgCount: 0,
      aiConversationId: null,
      aiStreaming: false,
      aiStreamContent: '',
    };
  },
  computed: {
    myUserId() {
      return useAuthStore().user?.id;
    },
    isTerminal() {
      return this.order ? TERMINAL.includes(this.order.status) : false;
    },
    canRush() {
      return this.order?.myRole === 'customer' && this.order?.status === 'cooking';
    },
    statusLabel() {
      return ORDER_STATUS_LABEL[this.order?.status] || '';
    },
    statusColor() {
      return ORDER_STATUS_COLOR[this.order?.status] || '#8E8580';
    },
    orderDishNames() {
      if (!this.order?.items?.length) return '订单沟通';
      const names = this.order.items
        .map((i) => i.recipeSnapshot?.name || '?')
        .slice(0, 2)
        .map((n) => (n.length > 6 ? n.slice(0, 6) + '…' : n));
      const total = this.order.items.length;
      return names.join('、') + (total > 2 ? '…' : '');
    },
    otherAvatar() {
      const fallback = useBusinessConfigStore().avatarFallback;
      if (!this.order) return fallback(this.order?.chefGender || this.order?.customerGender);
      return this.order.myRole === 'customer'
        ? this.order.chefAvatarUrl || fallback(this.order.chefGender)
        : this.order.customerAvatarUrl || fallback(this.order.customerGender);
    },
    myAvatar() {
      const user = useAuthStore().user;
      return user?.avatarUrl || useBusinessConfigStore().avatarFallback(user?.gender);
    },
    orderTime() {
      if (!this.order?.createdAt) return '';
      const d = new Date(this.order.createdAt);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${month}月${day}日 ${h}:${m}`;
    },
    statusBg() {
      const map = {
        pending: 'rgba(224,122,95,0.1)',
        accepted: 'rgba(107,158,120,0.1)',
        prepping: 'rgba(107,143,168,0.1)',
        cooking: 'rgba(212,165,90,0.1)',
        served: 'rgba(107,158,120,0.1)',
        completed: 'rgba(142,133,128,0.1)',
      };
      return map[this.order?.status] || 'rgba(142,133,128,0.1)';
    },
  },
  onLoad(query) {
    this.orderId = query.id;
    setActiveChatOrderId(this.orderId);
    useChatUnreadStore().clearOrder(this.orderId);
    this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
    this._wsHandler = (data) => {
      if (data.orderId === this.orderId) {
        this.messages.push(data.message);
        if (data.message.senderUserId === this.myUserId) {
          this.$nextTick(() => this.scrollToBottom());
        } else if (this.isAtBottom) {
          this.$nextTick(() => this.scrollToBottom());
          messageApi.markRead(this.orderId).catch(() => {});
        } else {
          // 不在底部 → 累计新消息计数
          this.newMsgCount++;
        }
      }
    };
    ws.on('order:message', this._wsHandler);
    this._wsReadHandler = (data) => {
      if (data.orderId === this.orderId) {
        const idSet = new Set(data.messageIds);
        for (const msg of this.messages) {
          if (idSet.has(msg.id) && !msg.readAt) msg.readAt = data.readAt;
        }
      }
    };
    ws.on('order:messagesRead', this._wsReadHandler);
    // AI stream handler
    this._wsAiHandler = (data) => {
      if (data.orderId === this.orderId) {
        if (data.done) {
          // Stream finished — add as a message
          this.aiStreaming = false;
          if (this.aiStreamContent) {
            this.messages.push({
              id: 'ai-' + Date.now(),
              type: 'ai_assistant',
              senderUserId: null,
              content: { text: this.aiStreamContent },
              createdAt: new Date().toISOString(),
              readAt: null,
            });
            this.aiStreamContent = '';
            this.aiConversationId = data.conversationId;
            this.$nextTick(() => this.scrollToBottom());
          }
        } else {
          this.aiStreaming = true;
          this.aiStreamContent += data.delta;
          this.$nextTick(() => this.scrollToBottom());
        }
      }
    };
    ws.on('ai:stream', this._wsAiHandler);
    this.load();
  },
  onShow() {
    if (this.orderId) {
      useChatUnreadStore().clearOrder(this.orderId);
      this.load();
    }
  },
  onUnload() {
    setActiveChatOrderId(null);
    if (this._wsHandler) {
      ws.off('order:message', this._wsHandler);
    }
    if (this._wsReadHandler) {
      ws.off('order:messagesRead', this._wsReadHandler);
    }
    if (this._wsAiHandler) {
      ws.off('ai:stream', this._wsAiHandler);
    }
  },
  methods: {
    formatTimeShort,
    emojiOf(key) {
      return EMOJI_PALETTE.find((e) => e.key === key)?.emoji || '😊';
    },
    previewImages(urls, current) {
      uni.previewImage({ urls, current });
    },

    async load() {
      try {
        const [order, msgs] = await Promise.all([
          orderApi.get(this.orderId),
          messageApi.list(this.orderId, { page: 1, pageSize: 100 }),
        ]);
        this.order = order;
        this.messages = msgs.items;
        this.$nextTick(() => this.scrollToBottom());
        messageApi.markRead(this.orderId).catch(() => {});
      } catch {
        // ignore
      }
    },

    scrollToBottom() {
      this.scrollIntoView = '';
      this.$nextTick(() => {
        this.scrollIntoView = 'chat-bottom-anchor';
      });
      this.isAtBottom = true;
      this.newMsgCount = 0;
    },

    onScroll(e) {
      const top = e.detail.scrollTop;
      if (top === undefined) return;
      // 向上滑（看历史）
      if (this._lastScrollTop !== undefined && top < this._lastScrollTop - 10) {
        this.isAtBottom = false;
      }
      this._lastScrollTop = top;
    },

    onScrollToBottom() {
      if (!this.isAtBottom) {
        this.isAtBottom = true;
        this.newMsgCount = 0;
        messageApi.markRead(this.orderId).catch(() => {});
      }
    },

    onNewMsgTap() {
      this.scrollToBottom();
      messageApi.markRead(this.orderId).catch(() => {});
    },

    async sendText() {
      const text = this.msgText.trim();
      if (!text) return;
      try {
        const msg = await messageApi.sendText(this.orderId, text);
        this.msgText = '';
        this.messages.push(msg);
        this.$nextTick(() => this.scrollToBottom());
      } catch {
        // ignore
      }
    },

    async sendEmoji(key) {
      try {
        const msg = await messageApi.sendEmoji(this.orderId, key);
        this.emojiOpen = false;
        this.messages.push(msg);
        this.$nextTick(() => this.scrollToBottom());
      } catch {
        // ignore
      }
    },

    async sendRush() {
      try {
        const msg = await messageApi.rush(this.orderId);
        this.messages.push(msg);
        this.$nextTick(() => this.scrollToBottom());
      } catch {
        // ignore
      }
    },

    async sendAiChat() {
      const text = this.msgText.trim();
      if (!text || this.aiStreaming) return;
      try {
        this.msgText = '';
        // Add user message locally
        this.messages.push({
          id: 'temp-' + Date.now(),
          type: 'text',
          senderUserId: this.myUserId,
          content: { text: `✨ ${text}` },
          createdAt: new Date().toISOString(),
          readAt: null,
        });
        this.$nextTick(() => this.scrollToBottom());
        await aiApi.cookingChat({
          orderId: this.orderId,
          message: text,
          conversationId: this.aiConversationId || undefined,
        });
      } catch (e) {
        uni.showToast({ title: e.message || 'AI 助手暂时不可用', icon: 'none' });
      }
    },

    goBack() {
      uni.navigateBack();
    },
    goDetail() {
      uni.navigateTo({ url: `/pages/order/detail?id=${this.orderId}` });
    },
  },
};
</script>

<style lang="scss" scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $fk-bg-page;
  position: relative;
}

/* ── Nav ────────────────────────────────────────────────── */
.nav {
  background: #fff;
  border-bottom: 1rpx solid $fk-border-light;
  flex-shrink: 0;
}

.nav-inner {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 24rpx;
}

.nav-back,
.nav-action {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  overflow: hidden;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $fk-text;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  min-width: 0;
}

.nav-status-badge {
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  flex-shrink: 0;

  text {
    font-size: 22rpx;
    font-weight: 500;
  }
}

/* ── Message scroll ─────────────────────────────────────── */
.msg-scroll {
  flex: 1;
  overflow: hidden;
}

/* ── New message hint ──────────────────────────────────── */
.new-msg-hint {
  position: absolute;
  bottom: 180rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 32rpx;
  border-radius: 999rpx;
  background: $fk-primary;
  box-shadow: 0 6rpx 20rpx rgba(224, 122, 95, 0.35);
  z-index: 10;
}

.new-msg-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 500;
}

.new-msg-arrow {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}

.msg-list {
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.msg-bottom-spacer {
  height: 20rpx;
}

/* ── Date separator ─────────────────────────────────────── */
.msg-date {
  display: flex;
  justify-content: center;
  padding: 12rpx 0 4rpx;

  text {
    font-size: 22rpx;
    color: $fk-text-placeholder;
    background: rgba(142, 133, 128, 0.06);
    padding: 4rpx 20rpx;
    border-radius: 999rpx;
  }
}

/* ── Message row ────────────────────────────────────────── */
.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.msg-row--mine {
  justify-content: flex-end;
}

.msg-row--sys {
  justify-content: center;
}

/* Avatar */
.msg-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: $fk-avatar-bg;
  flex-shrink: 0;
  margin-top: 4rpx;
}

/* System message */
.msg-sys {
  background: rgba(142, 133, 128, 0.08);
  padding: 8rpx 24rpx;
  border-radius: 999rpx;

  text {
    font-size: 24rpx;
    color: $fk-text-muted;
  }
}

/* Bubble wrapper (holds bubble + timestamp) */
.msg-bubble-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 65%;
  gap: 6rpx;
}

.msg-bubble-wrap--mine {
  align-items: flex-end;
}

/* Bubble */
.msg-bubble {
  background: #fff;
  border-radius: 24rpx 24rpx 24rpx 6rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(142, 133, 128, 0.06);
}

.msg-bubble--mine {
  background: $fk-primary;
  border-radius: 24rpx 24rpx 6rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(224, 122, 95, 0.18);
}

.msg-text {
  font-size: 30rpx;
  line-height: 1.6;
  color: $fk-text;
  word-break: break-all;
}

.msg-bubble--mine .msg-text {
  color: #fff;
}

.msg-emoji {
  font-size: 64rpx;
}

.msg-photo {
  width: 280rpx;
  border-radius: 16rpx;
}

/* Timestamp */
.msg-time {
  font-size: 20rpx;
  color: $fk-text-placeholder;
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.msg-meta--mine {
  justify-content: flex-end;
}

.msg-read {
  font-size: 18rpx;
  color: $fk-text-placeholder;
}

/* ── Card messages (tip / rush) ──────────────────────────── */
.msg-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  min-width: 320rpx;
}

.msg-card--tip {
  background: $fk-primary-lighter;
}

.msg-bubble-wrap--mine .msg-card--tip {
  background: rgba(255, 255, 255, 0.2);
}

.msg-card--rush {
  background: #fdf3e1;
}

.msg-bubble-wrap--mine .msg-card--rush {
  background: #fdf3e1;

  .msg-card-title {
    color: $fk-text;
  }

  .msg-card-sub {
    color: $fk-text-muted;
  }
}

.msg-card-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.msg-bubble-wrap--mine .msg-card-icon {
  background: rgba(255, 255, 255, 0.3);
}

.msg-card-body {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  flex: 1;
  min-width: 0;
}

.msg-card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $fk-text;
}

.msg-bubble-wrap--mine .msg-card-title {
  color: #fff;
}

.msg-card-sub {
  font-size: 22rpx;
  color: $fk-text-muted;
}

.msg-bubble-wrap--mine .msg-card-sub {
  color: rgba(255, 255, 255, 0.7);
}

/* ── Input area ─────────────────────────────────────────── */
.input-area {
  flex-shrink: 0;
  background: #fff;
  border-top: 1rpx solid $fk-border-light;
}

.input-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
}

.bar-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.emoji-trigger-icon {
  font-size: 40rpx;
  line-height: 1;
}

.emoji-trigger.active .emoji-trigger-icon {
  transform: scale(1.15);
}

.msg-input {
  flex: 1;
  background: $fk-bg-page;
  border-radius: 999rpx;
  padding: 16rpx 28rpx;
  font-size: 28rpx;
}

.send-btn {
  padding: 16rpx 32rpx;
  border-radius: 999rpx;
  background: $fk-primary;
  color: #fff;
  font-size: 26rpx;
  font-weight: 500;
  flex-shrink: 0;
}

.send-btn.disabled {
  opacity: 0.5;
}

/* ── Emoji panel ────────────────────────────────────────── */
.emoji-panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  padding: 24rpx;
  border-top: 1rpx solid $fk-border-light;
}

.emoji-safe {
  height: env(safe-area-inset-bottom);
}

.emoji-item {
  background: $fk-bg-page;
  border-radius: 16rpx;
  padding: 20rpx 0;
  text-align: center;
}

.emoji-big {
  display: block;
  font-size: 48rpx;
}

.emoji-label {
  font-size: 22rpx;
  color: $fk-text-muted;
  margin-top: 4rpx;
}

/* ── Terminal hint ──────────────────────────────────────── */
.terminal-hint {
  text-align: center;
  padding: 20rpx 0 calc(20rpx + env(safe-area-inset-bottom));

  text {
    font-size: 26rpx;
    color: $fk-text-placeholder;
  }

  background: #fff;
  border-top: 1rpx solid $fk-border-light;
  flex-shrink: 0;
}

/* ── AI Assistant ──────────────────────────────────────── */
.ai-icon {
  .ai-sparkle {
    font-size: 36rpx;
    line-height: 1;
  }
}

.msg-row--ai {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.ai-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFF3E0, #FFE0B2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.ai-avatar-icon {
  font-size: 32rpx;
}

.ai-bubble {
  background: linear-gradient(135deg, #FFF8E1, #FFF3E0);
  border-radius: 24rpx 24rpx 24rpx 6rpx;
  padding: 20rpx 24rpx;
  max-width: 65%;
  box-shadow: 0 2rpx 8rpx rgba(224, 122, 95, 0.08);
}

.ai-bubble--streaming {
  border: 1rpx solid #FFE0B2;
}

.ai-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: $fk-text;
  word-break: break-all;
}

.ai-cursor {
  animation: blink 0.8s infinite;
  color: #E07A5F;
  font-weight: 300;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>
