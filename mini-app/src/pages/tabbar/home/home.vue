<template>
  <view class="page">
    <!-- Hero header -->
    <view class="hero" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="hero-decor hero-decor--1" />
      <view class="hero-decor hero-decor--2" />
      <view class="hero-inner">
        <text class="family-name">{{ family?.name || '我的小厨房' }}</text>
        <view class="hero-bottom">
          <view class="subtitle">
            <view class="subtitle-dot" />
            <text>让爱意从一顿饭开始</text>
          </view>
          <view class="hero-actions">
            <view class="hero-msg" @click="goToNotifications">
              <wd-icon name="notification" size="40rpx" color="#fff" />
              <view v-if="unreadNotifications > 0" class="hero-msg-badge">
                <text>{{ unreadNotifications > 99 ? '99+' : unreadNotifications }}</text>
              </view>
            </view>
            <view class="hero-msg" @click="goToChatList">
              <wd-icon name="chat" size="40rpx" color="#fff" />
              <view v-if="totalUnread > 0" class="hero-msg-badge">
                <text>{{ totalUnread > 99 ? '99+' : totalUnread }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="hero-wave">
        <view class="hero-wave-fill" />
      </view>
    </view>

    <!-- Guest state -->
    <guest-placeholder
      v-if="!isLoggedIn"
      icon="home"
      title="情侣厨房"
      desc="登录后和 TA 一起点菜、做菜、记录甜蜜"
    />

    <!-- Logged-in content -->
    <template v-else>
      <view class="content">
        <!-- 未加入家庭 -->
        <view v-if="!hasFamily" class="card welcome fade-up fade-up--1">
          <view class="welcome-icon-wrap">
            <wd-icon name="heart" size="64rpx" color="#E07A5F" />
          </view>
          <text class="welcome-title">先和 TA 组建小厨房</text>
          <text class="welcome-desc">两个人才能开始点菜哦</text>
          <wd-button type="error" round block @click="goToFamilySetup">去创建/加入</wd-button>
        </view>

        <!-- 有活跃订单 -->
        <view
          v-else-if="activeOrder"
          class="card active-card fade-up fade-up--1"
          @click="goToOrder(activeOrder.id)"
        >
          <view class="active-accent" :style="{ background: statusColor }" />
          <view class="active-body">
            <view class="active-head">
              <text class="status-tag" :style="{ background: statusColor }">
                {{ statusLabel }}
              </text>
              <text class="muted">{{ formatRelative(activeOrder.createdAt) }}</text>
            </view>
            <view class="active-dishes">
              <text v-for="item in activeOrder.items" :key="item.id" class="dish-pill">
                {{ getName(item) }}
              </text>
            </view>
            <view class="active-roles">
              <wd-icon
                :name="activeOrder.myRole === 'customer' ? 'service' : 'user'"
                size="26rpx"
                color="#8E8580"
              />
              <text class="muted"
                >我是{{
                  activeOrder.myRole === 'customer'
                    ? `点了 ${activeOrder.chefNickname || 'TA'} 的菜`
                    : `在给 ${activeOrder.customerNickname || 'TA'} 做菜`
                }}</text
              >
              <template v-if="activeOrder.expectedServeAt">
                <wd-icon name="clock" size="26rpx" color="#8E8580" />
                <text class="muted">期望 {{ formatTimeShort(activeOrder.expectedServeAt) }}</text>
              </template>
            </view>
          </view>
        </view>

        <!-- 无活跃订单 -->
        <view v-else class="card empty-card fade-up fade-up--1">
          <view class="empty-icon-wrap">
            <wd-icon name="heart" size="80rpx" color="#E07A5F" />
          </view>
          <text class="empty-title">还没有点单</text>
          <text class="empty-hint">今天想吃点什么？</text>
          <view class="cta-row">
            <wd-button type="error" round @click="goToCreateOrder">我要点菜</wd-button>
            <wd-button plain round @click="goToMenu">去菜单</wd-button>
          </view>
          <view class="recommend-row">
            <view class="recommend-btn" @click="loadRecommend">
              <wd-icon name="star" size="28rpx" color="#D4A55A" />
              <text>不知道吃啥？随机推荐</text>
            </view>
          </view>
        </view>

        <!-- 推荐卡片弹窗 -->
        <view v-if="recommendRecipe" class="recommend-card fade-up" @click="goToRecommendOrder">
          <view class="recommend-inner">
            <image
              v-if="recommendRecipe.imageUrls && recommendRecipe.imageUrls.length"
              class="recommend-thumb"
              :src="recommendRecipe.imageUrls[0]"
              mode="aspectFill"
            />
            <view class="recommend-info">
              <text class="recommend-name">{{ recommendRecipe.name }}</text>
              <view class="recommend-meta">
                <wd-rate
                  :model-value="recommendRecipe.difficulty"
                  :max="5"
                  size="18rpx"
                  color="#E07A5F"
                  void-color="#D5CEC8"
                  readonly
                />
                <text class="recommend-order-count">{{ recommendRecipe.orderCount }} 次下单</text>
              </view>
            </view>
            <view class="recommend-action">
              <text class="recommend-go">去点</text>
              <wd-icon name="arrow-right" size="24rpx" color="#E07A5F" />
            </view>
          </view>
          <view class="recommend-close" @click.stop="recommendRecipe = null">
            <wd-icon name="close" size="24rpx" color="#8E8580" />
          </view>
        </view>

        <!-- 快捷入口 -->
        <view v-if="hasFamily" class="shortcuts fade-up fade-up--2">
          <view class="shortcut-card" @click="goToOrders">
            <view class="shortcut-icon shortcut-icon--rose">
              <wd-icon name="list" size="40rpx" color="#E07A5F" />
            </view>
            <view class="shortcut-text">
              <text class="shortcut-label">历史订单</text>
              <text class="shortcut-sub">查看过往</text>
            </view>
          </view>
          <view class="shortcut-card" @click="goToTimeline">
            <view class="shortcut-icon shortcut-icon--sage">
              <wd-icon name="camera" size="40rpx" color="#6B9E78" />
            </view>
            <view class="shortcut-text">
              <text class="shortcut-label">时间线</text>
              <text class="shortcut-sub">甜蜜记录</text>
            </view>
          </view>
          <view class="shortcut-card" @click="goToBalance">
            <view class="shortcut-icon shortcut-icon--amber">
              <wd-icon name="heart" size="40rpx" color="#D4A55A" />
            </view>
            <view class="shortcut-text">
              <text class="shortcut-label">爱心币</text>
              <text class="shortcut-sub">爱的积分</text>
            </view>
          </view>
          <view class="shortcut-card" @click="goToAchievements">
            <view class="shortcut-icon shortcut-icon--slate">
              <wd-icon name="star" size="40rpx" color="#6B8FA8" />
            </view>
            <view class="shortcut-text">
              <text class="shortcut-label">成就</text>
              <text class="shortcut-sub">解锁徽章</text>
            </view>
          </view>
        </view>

        <!-- AI 功能入口 -->
        <view v-if="hasFamily" class="ai-section fade-up fade-up--3">
          <text class="ai-section-title">AI 智能助手</text>
          <view class="ai-grid">
            <view class="ai-card" @click="goToAiRecipeGen">
              <text class="ai-emoji">&#x1F372;</text>
              <text class="ai-label">菜谱生成</text>
            </view>
            <view class="ai-card" @click="goToAiRecommend">
              <text class="ai-emoji">&#x1F916;</text>
              <text class="ai-label">智能推荐</text>
            </view>
            <view class="ai-card" @click="goToAiNutrition">
              <text class="ai-emoji">&#x1F4CA;</text>
              <text class="ai-label">营养分析</text>
            </view>
            <view class="ai-card" @click="goToAiWeeklyPlan">
              <text class="ai-emoji">&#x1F4C5;</text>
              <text class="ai-label">一周菜单</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <custom-tabbar current="home" />
  </view>
</template>

<script>
import { useFamilyStore } from '@/stores/family.js';
import { useActiveOrderStore } from '@/stores/active-order.js';
import { useAuthStore } from '@/stores/auth.js';
import { useChatUnreadStore } from '@/stores/chat-unread.js';
import GuestPlaceholder from '@/components/guest-placeholder.vue';
import CustomTabbar from '@/components/custom-tabbar.vue';
import { ensureLogin } from '@/composables/use-auth-guard.js';
import { ensureFamily } from '@/composables/use-family-guard.js';
import { recipeApi } from '@/api/recipe.js';
import { notificationApi } from '@/api/notification.js';
import {
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  formatRelative,
  formatTimeShort,
} from '@/utils/labels.js';

export default {
  components: { GuestPlaceholder, CustomTabbar },
  data() {
    return {
      statusBarHeight: 0,
      recommendRecipe: null,
      unreadNotifications: 0,
    };
  },
  computed: {
    isLoggedIn() {
      return useAuthStore().isLoggedIn;
    },
    family() {
      return useFamilyStore().family;
    },
    hasFamily() {
      return useFamilyStore().hasFamily;
    },
    activeOrder() {
      return useActiveOrderStore().order;
    },
    statusLabel() {
      return ORDER_STATUS_LABEL[this.activeOrder?.status] || '';
    },
    statusColor() {
      return ORDER_STATUS_COLOR[this.activeOrder?.status] || '#8E8580';
    },
    totalUnread() {
      return useChatUnreadStore().totalUnread;
    },
  },
  async onShow() {
    this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
    if (!useAuthStore().isLoggedIn) return;
    const family = useFamilyStore();
    if (!family.family) await family.refresh();
    if (family.hasFamily) {
      useActiveOrderStore().refresh();
    }
    this.loadUnreadNotifications();
  },
  async onPullDownRefresh() {
    if (!useAuthStore().isLoggedIn) {
      uni.stopPullDownRefresh();
      return;
    }
    await useFamilyStore().refresh();
    if (useFamilyStore().hasFamily) {
      await useActiveOrderStore().refresh();
    }
    uni.stopPullDownRefresh();
  },
  methods: {
    formatRelative,
    formatTimeShort,
    getName(item) {
      return item.recipeSnapshot?.name || '未命名';
    },
    async goToFamilySetup() {
      if (!(await ensureLogin())) return;
      uni.navigateTo({ url: '/pages/family/setup' });
    },
    async goToCreateOrder() {
      if (!(await ensureFamily())) return;
      uni.navigateTo({ url: '/pages/order/create' });
    },
    goToOrder(id) {
      uni.navigateTo({ url: `/pages/order/detail?id=${id}` });
    },
    goToMenu() {
      uni.switchTab({ url: '/pages/tabbar/menu/menu' });
    },
    async goToOrders() {
      if (!(await ensureFamily())) return;
      uni.navigateTo({ url: '/pages/order/history' });
    },
    async goToTimeline() {
      if (!(await ensureLogin())) return;
      uni.switchTab({ url: '/pages/tabbar/timeline/timeline' });
    },
    async goToBalance() {
      if (!(await ensureLogin())) return;
      uni.navigateTo({ url: '/pages/profile/love-points' });
    },
    async goToAchievements() {
      if (!(await ensureLogin())) return;
      uni.navigateTo({ url: '/pages/profile/achievements' });
    },
    async goToChatList() {
      if (!(await ensureLogin())) return;
      uni.navigateTo({ url: '/pages/chat/list' });
    },
    async loadRecommend() {
      if (!(await ensureFamily())) return;
      try {
        this.recommendRecipe = await recipeApi.random();
      } catch {
        uni.showToast({ title: '还没有菜谱哦', icon: 'none' });
      }
    },
    goToRecommendOrder() {
      if (!this.recommendRecipe) return;
      uni.navigateTo({
        url: `/pages/order/create?recipeId=${this.recommendRecipe.id}`,
      });
      this.recommendRecipe = null;
    },
    async loadUnreadNotifications() {
      try {
        const res = await notificationApi.unreadCount();
        this.unreadNotifications = res.count;
      } catch {
        // ignore
      }
    },
    goToNotifications() {
      uni.navigateTo({ url: '/pages/notification/list' });
    },
    goToAiRecipeGen() {
      uni.navigateTo({ url: '/pages/ai/recipe-gen' });
    },
    goToAiRecommend() {
      uni.navigateTo({ url: '/pages/ai/recommend' });
    },
    goToAiNutrition() {
      uni.navigateTo({ url: '/pages/ai/nutrition' });
    },
    goToAiWeeklyPlan() {
      uni.navigateTo({ url: '/pages/ai/weekly-plan' });
    },
  },
};
</script>

<style lang="scss" scoped>
/* ═══════════════════════════════════════════════════════════
   Page foundation
   ═══════════════════════════════════════════════════════════ */
.page {
  min-height: 100vh;
  background: $fk-bg-page;
}

/* ═══════════════════════════════════════════════════════════
   Hero — gradient header with organic curve
   ═══════════════════════════════════════════════════════════ */
.hero {
  position: relative;
  background: linear-gradient(160deg, #e07a5f 0%, #ee9a86 50%, #f0a08c 100%);
  padding-bottom: 64rpx;
  overflow: hidden;
}

.hero-decor {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.07);
}
.hero-decor--1 {
  width: 320rpx;
  height: 320rpx;
  top: -80rpx;
  right: -60rpx;
}
.hero-decor--2 {
  width: 180rpx;
  height: 180rpx;
  bottom: 40rpx;
  left: -40rpx;
}

.hero-inner {
  position: relative;
  z-index: 1;
  padding: 28rpx 44rpx 0;
}

.family-name {
  font-size: 52rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 3rpx;
  line-height: 1.3;
}

.hero-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}

.hero-actions {
  display: flex;
  gap: 16rpx;
}

.subtitle {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 300;
  letter-spacing: 1rpx;
}

.subtitle-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
}

.hero-msg {
  position: relative;
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-msg-badge {
  position: absolute;
  top: 4rpx;
  right: 0;
  min-width: 32rpx;
  height: 32rpx;
  border-radius: 999rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.hero-msg-badge text {
  font-size: 20rpx;
  color: $fk-primary;
  font-weight: 700;
  line-height: 1;
}

/* Organic wave curve at bottom of hero */
.hero-wave {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40rpx;
  overflow: hidden;
}

.hero-wave-fill {
  width: 120%;
  margin-left: -10%;
  height: 100%;
  background: $fk-bg-page;
  border-radius: 50% 50% 0 0;
}

/* ═══════════════════════════════════════════════════════════
   Content area — floats above hero
   ═══════════════════════════════════════════════════════════ */
.content {
  position: relative;
  z-index: 2;
  padding: 0 32rpx;
  margin-top: -32rpx;
}

/* ═══════════════════════════════════════════════════════════
   Cards — shared base
   ═══════════════════════════════════════════════════════════ */
.card {
  background: #fff;
  border-radius: 28rpx;
  padding: 40rpx;
  margin-bottom: 32rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.06),
    0 8rpx 32rpx rgba(142, 133, 128, 0.04);
}

.muted {
  color: $fk-text-muted;
}

/* ── Welcome card ─────────────────────────────────────────── */
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 56rpx 40rpx;
}

.welcome-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: $fk-primary-lighter;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.welcome-title {
  font-size: 34rpx;
  font-weight: 600;
  color: $fk-text;
  margin-top: 20rpx;
}

.welcome-desc {
  display: block;
  margin: 16rpx 0 36rpx;
  color: $fk-text-muted;
  font-size: 26rpx;
}

/* ── Active order card ────────────────────────────────────── */
.active-card {
  display: flex;
  overflow: hidden;
  padding: 0;
}

.active-accent {
  width: 8rpx;
  flex-shrink: 0;
  border-radius: 28rpx 0 0 28rpx;
}

.active-body {
  flex: 1;
  padding: 32rpx 36rpx;
}

.active-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.status-tag {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 500;
  color: #fff;
}

.active-dishes {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.dish-pill {
  padding: 10rpx 24rpx;
  background: $fk-primary-lighter;
  color: $fk-primary;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 500;
}

.active-roles {
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 24rpx;
}

/* ── Empty state card ─────────────────────────────────────── */
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 72rpx 40rpx 56rpx;
}

.empty-icon-wrap {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: $fk-primary-lighter;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: $fk-text;
  margin-top: 28rpx;
}

.empty-hint {
  display: block;
  font-size: 26rpx;
  color: $fk-text-muted;
  margin: 12rpx 0 40rpx;
}

.cta-row {
  display: flex;
  gap: 20rpx;
  justify-content: center;
}

/* ═══════════════════════════════════════════════════════════
   Shortcuts — 2×2 card grid
   ═══════════════════════════════════════════════════════════ */
.shortcuts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  padding-bottom: 24rpx;
}

.shortcut-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.05),
    0 4rpx 16rpx rgba(142, 133, 128, 0.03);
}

.shortcut-icon {
  width: 84rpx;
  height: 84rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.shortcut-icon--rose {
  background: rgba(224, 122, 95, 0.1);
}
.shortcut-icon--sage {
  background: rgba(107, 158, 120, 0.1);
}
.shortcut-icon--amber {
  background: rgba(212, 165, 90, 0.1);
}
.shortcut-icon--slate {
  background: rgba(107, 143, 168, 0.1);
}

.shortcut-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.shortcut-label {
  font-size: 28rpx;
  font-weight: 600;
  color: $fk-text;
}

.shortcut-sub {
  font-size: 22rpx;
  color: $fk-text-muted;
}

/* ── Recommend ────────────────────────────────────────────── */
.recommend-row {
  margin-top: 24rpx;
}
.recommend-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 28rpx;
  background: rgba(212, 165, 90, 0.1);
  border-radius: 999rpx;
  font-size: 26rpx;
  color: #d4a55a;
  font-weight: 500;
}
.recommend-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 20rpx 28rpx;
  margin-bottom: 24rpx;
  position: relative;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.06),
    0 8rpx 32rpx rgba(142, 133, 128, 0.04);
}
.recommend-inner {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.recommend-thumb {
  width: 100rpx;
  height: 100rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  background: $fk-avatar-bg;
}
.recommend-info {
  flex: 1;
  min-width: 0;
}
.recommend-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $fk-text;
}
.recommend-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 8rpx;
}
.recommend-order-count {
  font-size: 22rpx;
  color: $fk-text-muted;
}
.recommend-action {
  display: flex;
  align-items: center;
  gap: 4rpx;
  flex-shrink: 0;
}
.recommend-go {
  font-size: 28rpx;
  color: $fk-primary;
  font-weight: 600;
}
.recommend-close {
  position: absolute;
  top: 8rpx;
  right: 12rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ═══════════════════════════════════════════════════════════
   Entrance animations
   ═══════════════════════════════════════════════════════════ */
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(24rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-up {
  animation: fadeUp 0.5s ease-out both;
}

.fade-up--1 {
  animation-delay: 0.05s;
}
.fade-up--2 {
  animation-delay: 0.15s;
}
.fade-up--3 {
  animation-delay: 0.25s;
}

/* ═══════════════════════════════════════════════════════════
   AI Section
   ═══════════════════════════════════════════════════════════ */
.ai-section {
  margin-bottom: 24rpx;
}

.ai-section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $fk-text;
  margin-bottom: 16rpx;
  display: block;
  padding-left: 4rpx;
}

.ai-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.ai-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.05),
    0 4rpx 16rpx rgba(142, 133, 128, 0.03);
}

.ai-emoji {
  font-size: 44rpx;
}

.ai-label {
  font-size: 22rpx;
  color: $fk-text;
  font-weight: 500;
}
</style>
