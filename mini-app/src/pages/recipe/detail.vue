<template>
  <view>
    <view v-if="recipe" class="page">
      <!-- Image gallery -->
      <swiper
        v-if="recipe.imageUrls.length"
        class="swiper"
        indicator-dots
        indicator-color="rgba(255,255,255,0.35)"
        indicator-active-color="#fff"
      >
        <swiper-item v-for="(url, idx) in recipe.imageUrls" :key="idx">
          <image :src="url" class="img" mode="aspectFill" />
        </swiper-item>
      </swiper>
      <view v-else class="cover-placeholder">
        <wd-icon name="camera" size="56rpx" color="#D5CEC8" />
        <text class="cover-placeholder-text">还没有图片</text>
      </view>

      <!-- Main info -->
      <view class="header-card fade-up">
        <view class="title-row">
          <text class="name">{{ recipe.name }}</text>
          <view
            class="fav-btn"
            :class="{ 'fav-btn--active': recipe.isFavorited }"
            @click="toggleFav"
          >
            <wd-icon
              :name="recipe.isFavorited ? 'heart-filled' : 'heart'"
              size="44rpx"
              :color="recipe.isFavorited ? '#fff' : '#B8AFA8'"
            />
          </view>
        </view>
        <view class="meta">
          <wd-rate
            :model-value="recipe.difficulty"
            :max="5"
            size="24rpx"
            color="#E07A5F"
            void-color="#D5CEC8"
            readonly
          />
          <view v-if="recipe.orderCount" class="meta-item">
            <wd-icon name="list" size="20rpx" color="#8E8580" />
            <text>{{ recipe.orderCount }} 次</text>
          </view>
          <view v-if="recipe.avgRating != null" class="meta-item">
            <wd-icon name="star" size="20rpx" color="#E07A5F" />
            <text>{{ recipe.avgRating.toFixed(1) }}</text>
          </view>
        </view>
      </view>

      <!-- Tags -->
      <view
        v-if="recipe.mealTags.length || recipe.flavorTags.length"
        class="card fade-up fade-up--1"
      >
        <view class="card-header">
          <view class="card-icon card-icon--slate">
            <wd-icon name="clock" size="28rpx" color="#6B8FA8" />
          </view>
          <text class="card-label">标签</text>
        </view>
        <view class="chips">
          <text v-for="t in mealTagLabels" :key="'m-' + t" class="chip chip--slate">{{ t }}</text>
          <text v-for="t in flavorTagLabels" :key="'f-' + t" class="chip chip--sage">{{ t }}</text>
        </view>
      </view>

      <!-- Notes -->
      <view v-if="recipe.notes" class="card fade-up fade-up--2">
        <view class="card-header">
          <view class="card-icon card-icon--amber">
            <wd-icon name="chat" size="28rpx" color="#D4A55A" />
          </view>
          <text class="card-label">做法备注</text>
        </view>
        <text class="notes">{{ recipe.notes }}</text>
      </view>

      <!-- Bottom safe spacer -->
      <view class="footer-spacer" />

      <!-- Fixed footer -->
      <view class="footer">
        <view class="footer-inner">
          <view class="footer-actions">
            <view class="action-btn action-btn--edit" @click="goEdit">
              <wd-icon name="edit" size="28rpx" color="#6B6560" custom-style="margin-right:6rpx" />
              <text>编辑</text>
            </view>
            <view class="action-btn action-btn--danger" @click="handleDelete">
              <wd-icon
                name="delete"
                size="28rpx"
                color="#C75B5B"
                custom-style="margin-right:6rpx"
              />
              <text>删除</text>
            </view>
            <view class="action-btn action-btn--primary" @click="orderThis">
              <wd-icon name="add" size="28rpx" color="#fff" custom-style="margin-right:6rpx" />
              <text>点这道菜</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Empty / loading -->
    <view v-else class="empty-detail">
      <view class="empty-icon">
        <wd-icon name="goods" size="64rpx" color="#D5CEC8" />
      </view>
      <text class="empty-text">{{ isLoggedIn ? '加载中…' : '登录后查看菜谱详情' }}</text>
      <view v-if="!isLoggedIn" class="empty-action" @click="goLogin">
        <text>微信登录</text>
      </view>
    </view>
  </view>
</template>

<script>
import { recipeApi } from '@/api/recipe.js';
import { MEAL_TAGS, FLAVOR_TAGS } from '@/utils/labels.js';
import { ensureLogin } from '@/composables/use-auth-guard.js';
import { ensureFamily } from '@/composables/use-family-guard.js';
import { useAuthStore } from '@/stores/auth.js';

export default {
  data() {
    return { recipe: null, id: null };
  },
  computed: {
    mealTagLabels() {
      if (!this.recipe) return [];
      return this.recipe.mealTags.map((t) => MEAL_TAGS.find((m) => m.value === t)?.label || t);
    },
    flavorTagLabels() {
      if (!this.recipe) return [];
      return this.recipe.flavorTags.map((t) => FLAVOR_TAGS.find((f) => f.value === t)?.label || t);
    },
    isLoggedIn() {
      return useAuthStore().isLoggedIn;
    },
  },
  onLoad(query) {
    this.id = query.id;
    this.load();
  },
  onShow() {
    if (this.id) this.load();
  },
  methods: {
    async load() {
      try {
        this.recipe = await recipeApi.get(this.id);
      } catch {
        // ignore
      }
    },
    async toggleFav() {
      if (!(await ensureLogin())) return;
      try {
        if (this.recipe.isFavorited) {
          await recipeApi.unfavorite(this.id);
        } else {
          await recipeApi.favorite(this.id);
        }
        await this.load();
      } catch {
        // ignore
      }
    },
    async goEdit() {
      if (!(await ensureFamily())) return;
      uni.navigateTo({ url: `/pages/recipe/edit?id=${this.id}` });
    },
    async handleDelete() {
      if (!(await ensureFamily())) return;
      const res = await new Promise((resolve) => {
        uni.showModal({
          title: '删除菜谱',
          content: '历史订单仍能看到，但菜单列表不再显示',
          confirmText: '删除',
          confirmColor: '#C75B5B',
          success: (r) => resolve(r.confirm),
          fail: () => resolve(false),
        });
      });
      if (!res) return;
      try {
        await recipeApi.remove(this.id);
        uni.showToast({ title: '已删除', icon: 'success' });
        setTimeout(() => uni.navigateBack(), 600);
      } catch {
        // ignore
      }
    },
    async orderThis() {
      if (!(await ensureFamily())) return;
      uni.navigateTo({ url: `/pages/order/create?recipeId=${this.id}` });
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/auth/login' });
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

/* ── Image gallery ──────────────────────────────────────── */
.swiper {
  width: 100%;
  height: 560rpx;
}

.img {
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  height: 360rpx;
  background: $fk-avatar-bg;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}

.cover-placeholder-text {
  font-size: 26rpx;
  color: $fk-text-placeholder;
}

/* ── Header card ────────────────────────────────────────── */
.header-card {
  background: #fff;
  margin: -32rpx 28rpx 0;
  position: relative;
  z-index: 2;
  border-radius: 28rpx;
  padding: 32rpx 28rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.06),
    0 8rpx 28rpx rgba(142, 133, 128, 0.04);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.name {
  font-size: 42rpx;
  font-weight: 700;
  color: $fk-text;
  letter-spacing: 1rpx;
}

.fav-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(142, 133, 128, 0.08);
  transition:
    transform 0.2s ease,
    background 0.25s ease,
    box-shadow 0.25s ease;
}

.fav-btn:active {
  transform: scale(0.88);
}

.fav-btn--active {
  background: $fk-primary;
  box-shadow: 0 4rpx 16rpx rgba(224, 122, 95, 0.35);
}

.meta {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 16rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 24rpx;
  color: $fk-text-muted;
}

/* ── Cards ──────────────────────────────────────────────── */
.card {
  background: #fff;
  margin: 20rpx 28rpx 0;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.05),
    0 6rpx 24rpx rgba(142, 133, 128, 0.03);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.card-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-icon--slate {
  background: rgba(107, 143, 168, 0.1);
}
.card-icon--amber {
  background: rgba(212, 165, 90, 0.1);
}

.card-label {
  font-size: 28rpx;
  font-weight: 600;
  color: $fk-text;
}

/* ── Chips ──────────────────────────────────────────────── */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.chip {
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 500;
}

.chip--slate {
  background: rgba(107, 143, 168, 0.1);
  color: $fk-info;
}

.chip--sage {
  background: rgba(107, 158, 120, 0.1);
  color: $fk-success;
}

/* ── Notes ──────────────────────────────────────────────── */
.notes {
  white-space: pre-wrap;
  font-size: 28rpx;
  line-height: 1.7;
  color: $fk-text-secondary;
}

/* ── Footer ─────────────────────────────────────────────── */
.footer-spacer {
  height: 160rpx;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  background: #fff;
  border-top: 1rpx solid $fk-border-light;
}

.footer-inner {
  padding: 20rpx 28rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

.footer-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22rpx 0;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.action-btn--edit {
  flex: 1;
  background: $fk-bg-page;
  color: $fk-text-secondary;
}

.action-btn--danger {
  flex: 1;
  background: $fk-bg-page;
  color: $fk-error;
}

.action-btn--primary {
  flex: 2;
  background: $fk-primary;
  color: #fff;
  box-shadow: 0 6rpx 20rpx rgba(224, 122, 95, 0.25);
}

/* ── Empty state ────────────────────────────────────────── */
.empty-detail {
  min-height: 100vh;
  background: $fk-bg-page;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 0 60rpx;
}

.empty-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: $fk-avatar-bg;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $fk-text-muted;
}

.empty-action {
  margin-top: 16rpx;
  padding: 22rpx 80rpx;
  border-radius: 999rpx;
  background: $fk-primary;
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: 0 6rpx 20rpx rgba(224, 122, 95, 0.25);
}

/* ── Animations ─────────────────────────────────────────── */
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

.fade-up--1 {
  animation-delay: 0.06s;
}
.fade-up--2 {
  animation-delay: 0.12s;
}
</style>
