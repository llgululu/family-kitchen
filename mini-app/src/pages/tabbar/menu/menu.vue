<template>
  <view class="page">
    <guest-placeholder
      v-if="!isLoggedIn"
      icon="goods"
      title="菜单"
      desc="登录后查看你和 TA 的家常菜谱"
    />

    <template v-else>
      <view class="search-wrap">
        <wd-search
          v-model="searchText"
          placeholder="搜索菜名…"
          cancel-txt=""
          @search="onSearch"
          @clear="onSearch"
        />
      </view>

      <scroll-view scroll-x class="filter-chips" show-scrollbar="false">
        <view
          class="chip"
          :class="{ 'chip--active': !onlyFavorites }"
          @click="setOnlyFavorites(false)"
        >
          全部
        </view>
        <view
          class="chip"
          :class="{ 'chip--active': onlyFavorites }"
          @click="setOnlyFavorites(true)"
        >
          <wd-icon name="heart" size="22rpx" />
          最爱
        </view>
        <view
          v-for="t in MEAL_TAGS"
          :key="t.value"
          class="chip"
          :class="{ 'chip--active': mealTags.includes(t.value) }"
          @click="toggleMeal(t.value)"
        >
          {{ t.label }}
        </view>
      </scroll-view>

      <!-- 无家庭 -->
      <view v-if="!hasFamily" class="empty">
        <view class="empty-icon-wrap">
          <wd-icon name="warning" size="56rpx" color="#8E8580" />
        </view>
        <text class="empty-title">还没加入小厨房</text>
        <text class="empty-hint">先去创建或加入一个吧</text>
        <text class="empty-link" @click="goToFamilySetup">创建/加入 →</text>
      </view>

      <!-- 空菜单 -->
      <view v-else-if="!loading && items.length === 0" class="empty">
        <view class="empty-icon-wrap empty-icon-wrap--rose">
          <wd-icon name="search" size="56rpx" color="#E07A5F" />
        </view>
        <text class="empty-title">菜单空空的</text>
        <text class="empty-hint">添加第一道菜，开始你们的美食之旅</text>
        <wd-button type="error" round @click="goToCreate" custom-style="margin-top:32rpx">
          <wd-icon name="add" size="28rpx" color="#fff" />
          添加第一道菜
        </wd-button>
      </view>

      <!-- 菜谱列表 -->
      <view v-else class="list">
        <view
          v-for="(r, i) in items"
          :key="r.id"
          class="recipe-card fade-up"
          :style="{ animationDelay: (i % 6) * 0.04 + 's' }"
          @click="goToDetail(r.id)"
        >
          <image class="cover" :src="r.imageUrls[0] || '/static/logo.png'" mode="aspectFill" />
          <view class="card-body">
            <view class="name-row">
              <text class="name">{{ r.name }}</text>
              <view v-if="r.isFavorited" class="fav-badge">
                <wd-icon name="heart" size="24rpx" color="#E07A5F" />
              </view>
            </view>
            <view class="meta-row">
              <wd-rate
                :model-value="r.difficulty"
                :max="5"
                size="20rpx"
                color="#E07A5F"
                void-color="#D5CEC8"
                readonly
              />
            </view>
            <view class="stats-row">
              <text v-if="r.orderCount" class="stat">
                <wd-icon name="list" size="20rpx" color="#8E8580" />
                {{ r.orderCount }} 次
              </text>
              <text v-if="r.avgRating != null" class="stat">
                <wd-icon name="star" size="20rpx" color="#E07A5F" />
                {{ r.avgRating.toFixed(1) }}
              </text>
            </view>
          </view>
        </view>

        <view v-if="hasMore" class="load-more" @click="loadMore">加载更多</view>
        <view v-else-if="items.length > 0" class="load-more muted">— 没有更多了 —</view>
      </view>

      <view v-if="hasFamily" class="fab-btn" @click="goToCreate">
        <wd-icon name="add" size="48rpx" color="#fff" />
      </view>
    </template>

    <custom-tabbar current="menu" />
  </view>
</template>

<script>
import { recipeApi } from '@/api/recipe.js';
import { useFamilyStore } from '@/stores/family.js';
import { useAuthStore } from '@/stores/auth.js';
import GuestPlaceholder from '@/components/guest-placeholder.vue';
import CustomTabbar from '@/components/custom-tabbar.vue';
import { ensureLogin } from '@/composables/use-auth-guard.js';
import { ensureFamily } from '@/composables/use-family-guard.js';
import { MEAL_TAGS } from '@/utils/labels.js';

export default {
  components: { GuestPlaceholder, CustomTabbar },
  data() {
    return {
      MEAL_TAGS,
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      loading: false,
      searchText: '',
      onlyFavorites: false,
      mealTags: [],
    };
  },
  computed: {
    isLoggedIn() {
      return useAuthStore().isLoggedIn;
    },
    hasFamily() {
      return useFamilyStore().hasFamily;
    },
    hasMore() {
      return this.items.length < this.total;
    },
  },
  async onShow() {
    if (!useAuthStore().isLoggedIn) return;
    const family = useFamilyStore();
    await family.refresh();
    if (family.hasFamily) {
      this.page = 1;
      await this.load();
    }
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
  async onReachBottom() {
    if (this.hasMore && !this.loading) {
      await this.loadMore();
    }
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const res = await recipeApi.list({
          page: this.page,
          pageSize: this.pageSize,
          search: this.searchText || undefined,
          mealTags: this.mealTags.length ? this.mealTags : undefined,
          onlyFavorites: this.onlyFavorites || undefined,
        });
        this.items = this.page === 1 ? res.items : [...this.items, ...res.items];
        this.total = res.total;
      } catch {
        // ignore
      } finally {
        this.loading = false;
      }
    },
    async loadMore() {
      this.page += 1;
      await this.load();
    },
    onSearch() {
      this.page = 1;
      this.load();
    },
    setOnlyFavorites(v) {
      this.onlyFavorites = v;
      this.page = 1;
      this.load();
    },
    toggleMeal(tag) {
      const idx = this.mealTags.indexOf(tag);
      if (idx >= 0) this.mealTags.splice(idx, 1);
      else this.mealTags.push(tag);
      this.page = 1;
      this.load();
    },
    goToDetail(id) {
      uni.navigateTo({ url: `/pages/recipe/detail?id=${id}` });
    },
    async goToCreate() {
      if (!(await ensureFamily())) return;
      uni.navigateTo({ url: '/pages/recipe/edit' });
    },
    async goToFamilySetup() {
      if (!(await ensureLogin())) return;
      uni.navigateTo({ url: '/pages/family/setup' });
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $fk-bg-page;
}

/* ── Search ──────────────────────────────────────────────── */
.search-wrap {
  padding: 20rpx 32rpx 0;
}

/* ── Filter chips ────────────────────────────────────────── */
.filter-chips {
  white-space: nowrap;
  padding: 16rpx 32rpx 8rpx;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 14rpx 28rpx;
  margin-right: 12rpx;
  background: #fff;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: $fk-text-secondary;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
  transition: all 0.2s;
}

.chip--active {
  background: $fk-primary;
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(224, 122, 95, 0.25);
}

.chip--active :deep(.wd-icon) {
  color: #fff !important;
}

/* ── Empty states ────────────────────────────────────────── */
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
  background: $fk-bg-hover;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.empty-icon-wrap--rose {
  background: $fk-primary-lighter;
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

.empty-link {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: $fk-primary;
  font-weight: 600;
}

/* ── Recipe list ─────────────────────────────────────────── */
.list {
  padding: 16rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.recipe-card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  display: flex;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.06),
    0 8rpx 28rpx rgba(142, 133, 128, 0.04);
}

.cover {
  width: 200rpx;
  height: 200rpx;
  flex-shrink: 0;
  background: $fk-avatar-bg;
}

.card-body {
  flex: 1;
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10rpx;
}

.name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.name {
  font-size: 30rpx;
  font-weight: 600;
  color: $fk-text;
}

.fav-badge {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: $fk-primary-lighter;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: $fk-text-muted;
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

/* ── FAB ─────────────────────────────────────────────────── */
.fab-btn {
  position: fixed;
  right: 40rpx;
  bottom: calc(120rpx + env(safe-area-inset-bottom));
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: $fk-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(224, 122, 95, 0.4);
  z-index: 99;
}

.fab-btn:active {
  transform: scale(0.92);
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
</style>
