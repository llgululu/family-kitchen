<template>
  <view class="page">
    <guest-placeholder
      v-if="!isLoggedIn"
      icon="clock"
      title="时间线"
      desc="登录后回顾你和 TA 的每一餐"
    />

    <template v-else>
      <!-- Hero header -->
      <view class="hero" @click="goMonthly">
        <view class="hero-decor" />
        <view class="hero-inner">
          <view class="title-row">
            <view class="title-icon">
              <wd-icon name="clock" size="36rpx" color="#fff" />
            </view>
            <text class="title">时间线</text>
          </view>
          <view class="sub-row">
            <wd-icon name="calendar" size="22rpx" color="rgba(255,255,255,0.8)" />
            <text class="hint">查看月度回顾 →</text>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="!items.length && !loading" class="empty">
        <view class="empty-icon-wrap">
          <wd-icon name="camera" size="56rpx" color="#E07A5F" />
        </view>
        <text class="empty-title">还没有记录</text>
        <text class="empty-hint">先去点几道菜，开始记录甜蜜时光</text>
      </view>

      <!-- 时间线列表 -->
      <view v-else class="timeline">
        <view
          v-for="(e, i) in items"
          :key="e.id"
          class="tl-entry fade-up"
          :style="{ animationDelay: (i % 5) * 0.05 + 's' }"
          @click="goEntryAction(e)"
        >
          <!-- Timeline connector -->
          <view class="tl-rail">
            <view class="tl-dot" />
            <view v-if="i < items.length - 1" class="tl-line" />
          </view>

          <!-- Entry content -->
          <view class="tl-card">
            <view class="entry-head">
              <text class="entry-time">{{ formatDateTime(e.occurredAt) }}</text>
              <view v-if="e.sourceType === 'manual'" class="manual-tag"> 手动补记 </view>
            </view>

            <view v-if="e.imageUrls.length" class="entry-images">
              <image
                v-for="url in e.imageUrls"
                :key="url"
                :src="url"
                class="img"
                mode="aspectFill"
                @click.stop="preview(e.imageUrls, url)"
              />
            </view>

            <view v-if="e.customerComment || e.chefComment" class="comments">
              <view v-if="e.customerComment" class="comment comment--rose">
                <view class="comment-icon comment-icon--rose">
                  <wd-icon name="chat" size="22rpx" color="#E07A5F" />
                </view>
                <text>{{ e.customerNickname || '食客' }}：{{ e.customerComment }}</text>
              </view>
              <view v-if="e.chefComment" class="comment comment--slate">
                <view class="comment-icon comment-icon--slate">
                  <wd-icon name="chat" size="22rpx" color="#6B8FA8" />
                </view>
                <text>{{ e.chefNickname || '厨师' }}：{{ e.chefComment }}</text>
              </view>
            </view>

            <!-- 订单条目无评价时的摘要 -->
            <view v-else-if="e.sourceType === 'order'" class="entry-summary">
              <text class="summary-text"
                >{{ e.customerNickname || '食客' }} 点了 {{ e.chefNickname || '厨师' }} 的菜</text
              >
              <text class="summary-tag">暂无评价</text>
            </view>

            <!-- Reply hint for partner -->
            <view v-if="canReply(e)" class="reply-hint" @click.stop="openReplyDialog(e)">
              <wd-icon name="chat" size="22rpx" color="#E07A5F" />
              <text>点击回复 TA</text>
            </view>
          </view>
        </view>

        <view v-if="hasMore" class="load-more" @click="loadMore">加载更多</view>
        <view v-else-if="items.length" class="load-more muted">— 没有更多了 —</view>
      </view>

      <view class="fab" @click="goManual">
        <wd-icon name="add" size="48rpx" color="#fff" />
      </view>
    </template>

    <!-- Reply popup -->
    <view v-if="replyDialog.visible" class="reply-overlay" @click.stop="closeReplyDialog">
      <view class="reply-popup" @click.stop>
        <view class="reply-popup-header">
          <text class="reply-popup-title"
            >回复 {{ replyDialog.entry?.customerNickname || 'TA' }}</text
          >
          <view class="reply-popup-close" @click="closeReplyDialog">
            <wd-icon name="close" size="32rpx" color="#999" />
          </view>
        </view>
        <textarea
          v-model="replyDialog.comment"
          class="reply-textarea"
          placeholder="说点什么…"
          :maxlength="500"
          auto-height
        />
        <view class="reply-popup-footer">
          <text class="reply-char-count">{{ replyDialog.comment.length }}/500</text>
          <view
            class="reply-submit-btn"
            :class="{ disabled: !replyDialog.comment.trim() || replyDialog.submitting }"
            @click="submitReply"
          >
            <text>{{ replyDialog.submitting ? '发送中…' : '发送' }}</text>
          </view>
        </view>
      </view>
    </view>

    <custom-tabbar current="timeline" />
  </view>
</template>

<script>
import { timelineApi } from '@/api/timeline.js';
import { useFamilyStore } from '@/stores/family.js';
import { useAuthStore } from '@/stores/auth.js';
import GuestPlaceholder from '@/components/guest-placeholder.vue';
import CustomTabbar from '@/components/custom-tabbar.vue';
import { ensureFamily } from '@/composables/use-family-guard.js';
import { formatDateTime } from '@/utils/labels.js';

export default {
  components: { GuestPlaceholder, CustomTabbar },
  data() {
    return {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      loading: false,
      replyDialog: {
        visible: false,
        entry: null,
        comment: '',
        submitting: false,
      },
    };
  },
  computed: {
    isLoggedIn() {
      return useAuthStore().isLoggedIn;
    },
    hasMore() {
      return this.items.length < this.total;
    },
    currentUserId() {
      return useAuthStore().user?.id || null;
    },
  },
  async onShow() {
    if (!useAuthStore().isLoggedIn) return;
    if (!useFamilyStore().family) await useFamilyStore().refresh();
    if (useFamilyStore().hasFamily) {
      this.page = 1;
      await this.load();
    }
  },
  async onReachBottom() {
    if (this.hasMore && !this.loading) await this.loadMore();
  },
  async onPullDownRefresh() {
    if (!useAuthStore().isLoggedIn) {
      uni.stopPullDownRefresh();
      return;
    }
    this.page = 1;
    await this.load();
    uni.stopPullDownRefresh();
  },
  methods: {
    formatDateTime,
    preview(urls, current) {
      uni.previewImage({ urls, current });
    },
    async load() {
      this.loading = true;
      try {
        const res = await timelineApi.list({
          page: this.page,
          pageSize: this.pageSize,
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
    goEntryAction(e) {
      if (e.sourceOrderId) {
        uni.navigateTo({ url: `/pages/order/detail?id=${e.sourceOrderId}` });
        return;
      }
      // 手动补记：弹出操作菜单
      const actions = [];
      if (this.canReply(e)) actions.push('回复 TA');
      actions.push('删除这条记录');
      uni.showActionSheet({
        itemList: actions,
        itemColor: '#C75B5B',
        success: async (res) => {
          const action = actions[res.tapIndex];
          if (action === '回复 TA') {
            this.openReplyDialog(e);
            return;
          }
          if (action === '删除这条记录') {
            const confirmed = await new Promise((resolve) => {
              uni.showModal({
                title: '删除记录',
                content: '确定要删除这条记录吗？',
                confirmText: '删除',
                confirmColor: '#C75B5B',
                success: (r) => resolve(r.confirm),
              });
            });
            if (!confirmed) return;
            try {
              await timelineApi.remove(e.id);
              uni.showToast({ title: '已删除', icon: 'success' });
              this.page = 1;
              await this.load();
            } catch {
              // ignore
            }
          }
        },
      });
    },
    canReply(e) {
      return e.sourceType === 'manual' && !e.chefComment && e.customerUserId !== this.currentUserId;
    },
    openReplyDialog(e) {
      this.replyDialog = {
        visible: true,
        entry: e,
        comment: '',
        submitting: false,
      };
    },
    closeReplyDialog() {
      this.replyDialog.visible = false;
    },
    async submitReply() {
      const { entry, comment } = this.replyDialog;
      if (!comment.trim() || this.replyDialog.submitting) return;
      this.replyDialog.submitting = true;
      try {
        await timelineApi.reply(entry.id, { comment: comment.trim() });
        uni.showToast({ title: '回复成功', icon: 'success' });
        this.closeReplyDialog();
        this.page = 1;
        await this.load();
      } catch {
        uni.showToast({ title: '回复失败', icon: 'none' });
      } finally {
        this.replyDialog.submitting = false;
      }
    },
    async goMonthly() {
      if (!(await ensureFamily())) return;
      uni.navigateTo({ url: '/pages/timeline/monthly' });
    },
    async goManual() {
      if (!(await ensureFamily())) return;
      uni.navigateTo({ url: '/pages/timeline/manual' });
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $fk-bg-page;
}

/* ── Hero header ─────────────────────────────────────────── */
.hero {
  position: relative;
  background: linear-gradient(160deg, #e07a5f 0%, #ee9a86 50%, #f0a08c 100%);
  margin: 20rpx 32rpx 0;
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  overflow: hidden;
}

.hero-decor {
  position: absolute;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  top: -40rpx;
  right: -20rpx;
}

.hero-inner {
  position: relative;
  z-index: 1;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.title-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
}

.sub-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 14rpx;
}

.hint {
  color: rgba(255, 255, 255, 0.8);
  font-size: 26rpx;
  font-weight: 300;
}

/* ── Empty state ─────────────────────────────────────────── */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 160rpx 60rpx 0;
}

.empty-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: $fk-primary-lighter;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $fk-text;
}

.empty-hint {
  font-size: 26rpx;
  color: $fk-text-muted;
  margin-top: 8rpx;
}

/* ── Timeline ────────────────────────────────────────────── */
.timeline {
  padding: 24rpx 32rpx 0;
}

.tl-entry {
  display: flex;
  gap: 20rpx;
}

/* Rail (dot + line) */
.tl-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 32rpx;
}

.tl-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: $fk-primary;
  margin-top: 28rpx;
  flex-shrink: 0;
  box-shadow: 0 0 0 6rpx rgba(224, 122, 95, 0.15);
}

.tl-line {
  width: 4rpx;
  flex: 1;
  background: $fk-border;
  border-radius: 4rpx;
  margin: 8rpx 0;
}

/* Card */
.tl-card {
  flex: 1;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.05),
    0 6rpx 24rpx rgba(142, 133, 128, 0.03);
}

.entry-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.entry-time {
  font-size: 24rpx;
  color: $fk-text-muted;
}

.manual-tag {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  color: $fk-primary;
  background: $fk-primary-lighter;
  font-weight: 500;
}

.entry-images {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.img {
  width: 180rpx;
  height: 180rpx;
  border-radius: 16rpx;
  background: $fk-avatar-bg;
}

/* ── Comments ────────────────────────────────────────────── */
.comments {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.comment {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  padding: 14rpx 18rpx;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: $fk-text-secondary;
  line-height: 1.5;
}

.comment--rose {
  background: rgba(224, 122, 95, 0.06);
}
.comment--slate {
  background: rgba(107, 143, 168, 0.06);
}

.comment-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.comment-icon--rose {
  background: rgba(224, 122, 95, 0.12);
}
.comment-icon--slate {
  background: rgba(107, 143, 168, 0.12);
}

/* ── Entry summary (order without comments) ─────────────── */
.entry-summary {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.summary-text {
  font-size: 26rpx;
  color: $fk-text-secondary;
}

.summary-tag {
  font-size: 20rpx;
  color: $fk-text-placeholder;
  padding: 2rpx 12rpx;
  border-radius: 999rpx;
  background: $fk-bg-page;
}

/* ── Reply hint ──────────────────────────────────────────── */
.reply-hint {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 12rpx;
  padding: 10rpx 16rpx;
  border-radius: 12rpx;
  background: rgba(224, 122, 95, 0.06);

  text {
    font-size: 24rpx;
    color: $fk-primary;
    font-weight: 500;
  }
}

/* ── Reply popup ─────────────────────────────────────────── */
.reply-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 900;
  display: flex;
  align-items: flex-end;
}

.reply-popup {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
}

.reply-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.reply-popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $fk-text;
}

.reply-popup-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: $fk-bg-page;
}

.reply-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: $fk-bg-page;
  font-size: 28rpx;
  color: $fk-text;
  box-sizing: border-box;
}

.reply-popup-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20rpx;
}

.reply-char-count {
  font-size: 24rpx;
  color: $fk-text-placeholder;
}

.reply-submit-btn {
  padding: 16rpx 48rpx;
  border-radius: 999rpx;
  background: $fk-primary;
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;

  &.disabled {
    opacity: 0.45;
  }
}

/* ── Load more ───────────────────────────────────────────── */
.load-more {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: $fk-text-muted;
}

.muted {
  color: $fk-text-placeholder;
}

/* ── Entrance animation ──────────────────────────────────── */
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.fade-up {
  animation: fadeUp 0.4s ease-out both;
}

/* ── FAB ─────────────────────────────────────────────────── */
.fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(env(safe-area-inset-bottom) + 120rpx + 24rpx);
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: $fk-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(224, 122, 95, 0.35);
  z-index: 501;
}

.fab:active {
  transform: scale(0.9);
}
</style>
