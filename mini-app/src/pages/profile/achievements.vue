<template>
  <view class="page">
    <view v-if="!hasFamily" class="empty">
      <wd-icon name="home" size="96rpx" color="#D5CEC8" />
      <text class="empty-text">请先创建或加入小厨房</text>
      <wd-button size="small" type="error" @click="goSetup"> 创建 / 加入小厨房 </wd-button>
    </view>
    <template v-else>
      <!-- 总进度概览 -->
      <view class="overview">
        <text class="overview-label">已解锁 {{ unlockedCount }} / {{ totalCount }}</text>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }" />
        </view>
        <text class="overview-percent">{{ progressPercent }}%</text>
      </view>

      <!-- 分类 Tab -->
      <scroll-view scroll-x class="category-scroll">
        <view class="category-tabs">
          <view
            v-for="cat in BADGE_CATEGORIES"
            :key="cat.key"
            class="category-tab"
            :class="{ active: activeCategory === cat.key }"
            @click="activeCategory = cat.key"
          >
            {{ cat.label }}
          </view>
        </view>
      </scroll-view>

      <!-- 成就列表 -->
      <view v-if="filteredBadges.length === 0" class="empty">
        <wd-icon name="star" size="64rpx" color="#8E8580" />
        <text class="muted">还没有成就</text>
      </view>
      <view v-else class="grid">
        <view
          v-for="badge in filteredBadges"
          :key="badge.badgeKey"
          class="badge-card"
          :class="{
            unlocked: badge.isUnlocked,
            'in-progress': !badge.isUnlocked && badge.target,
            locked: !badge.isUnlocked && !badge.target,
            'hidden-surprise': badge.hidden && badge.isUnlocked,
          }"
        >
          <!-- 隐藏彩蛋已解锁 -->
          <view v-if="badge.hidden && badge.isUnlocked" class="surprise-tag">惊喜!</view>

          <text class="emoji" :class="{ 'emoji-locked': !badge.isUnlocked }">
            {{ badge.isUnlocked ? badge.emoji : '🔒' }}
          </text>
          <text class="badge-title">{{ badge.title }}</text>

          <!-- 已解锁 -->
          <view v-if="badge.isUnlocked" class="badge-unlocked-area">
            <text class="badge-status unlocked-text">已解锁</text>
            <text class="share-btn" @click.stop="shareBadge(badge)">
              <wd-icon name="share" size="20rpx" color="#E07A5F" />
              分享
            </text>
          </view>

          <!-- 进行中（有进度） -->
          <view v-else-if="badge.target && badge.current !== null" class="badge-progress">
            <view class="mini-progress-bar">
              <view
                class="mini-progress-fill"
                :style="{ width: Math.min((badge.current / badge.target) * 100, 100) + '%' }"
              />
            </view>
            <text class="progress-text">{{ badge.current }}/{{ badge.target }}</text>
          </view>

          <!-- 未开始（无进度） -->
          <view v-else class="badge-status">
            <text class="muted">{{ badge.description }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- Hidden canvas for share card -->
    <view class="canvas-container">
      <canvas id="badge-share-canvas" type="2d" />
    </view>
  </view>
</template>

<script>
import { achievementApi } from '@/api/achievement.js';
import { useFamilyStore } from '@/stores/family.js';
import { useAuthStore } from '@/stores/auth.js';
import { BADGE_CATEGORIES, BADGE_LABEL } from '@/utils/labels.js';
import { drawBadgeCard } from '@/utils/share-card.js';

export default {
  data() {
    return {
      BADGE_CATEGORIES,
      activeCategory: 'all',
      badges: [],
      unlockedKeys: new Set(),
    };
  },
  computed: {
    hasFamily() {
      return !!useFamilyStore().family;
    },
    totalCount() {
      return this.badges.length;
    },
    unlockedCount() {
      return this.badges.filter((b) => b.isUnlocked).length;
    },
    progressPercent() {
      if (this.totalCount === 0) return 0;
      return Math.round((this.unlockedCount / this.totalCount) * 100);
    },
    filteredBadges() {
      if (this.activeCategory === 'all') return this.badges;
      return this.badges.filter((b) => b.category === this.activeCategory);
    },
  },
  onShow() {
    if (!this.hasFamily) return;
    this.load();
  },
  methods: {
    goSetup() {
      uni.navigateTo({ url: '/pages/family/setup' });
    },
    async load() {
      try {
        const progress = await achievementApi.getProgress();
        this.badges = progress;
        this.unlockedKeys = new Set(progress.filter((b) => b.isUnlocked).map((b) => b.badgeKey));
      } catch {
        // fallback: 使用旧 API
        try {
          const [mine, family] = await Promise.all([
            achievementApi.listMine(),
            achievementApi.listFamily(),
          ]);
          const allAchievements = [...mine, ...family];
          this.unlockedKeys = new Set(allAchievements.map((a) => a.badgeKey));
          this.badges = Object.entries(BADGE_LABEL).map(([key, val]) => ({
            badgeKey: key,
            title: val.title,
            emoji: val.emoji,
            category: this.inferCategory(key),
            hidden: key.startsWith('hidden_'),
            isUnlocked: this.unlockedKeys.has(key),
            current: null,
            target: null,
          }));
        } catch {
          // ignore
        }
      }
    },
    inferCategory(key) {
      if (key.startsWith('chef_') || key.startsWith('five_star_')) return 'chef';
      if (key.startsWith('customer_') || key.startsWith('rater_')) return 'customer';
      if (key.startsWith('recipe_')) return 'recipe';
      if (key.startsWith('love_')) return 'love';
      if (key.startsWith('msg_')) return 'interaction';
      if (key.startsWith('family_')) return 'family';
      if (key.startsWith('hidden_')) return 'hidden';
      return 'other';
    },
    async shareBadge(badge) {
      try {
        const user = useAuthStore().user;
        const family = useFamilyStore().family;
        const filePath = await drawBadgeCard(
          { emoji: badge.emoji, title: badge.title, description: badge.description },
          { nickname: user?.nickname },
          { name: family?.name },
        );
        uni.showActionSheet({
          itemList: ['保存到相册'],
          success: (res) => {
            if (res.tapIndex === 0) {
              uni.saveImageToPhotosAlbum({
                filePath,
                success: () => uni.showToast({ title: '已保存', icon: 'success' }),
                fail: () => uni.showToast({ title: '保存失败', icon: 'none' }),
              });
            }
          },
        });
      } catch {
        uni.showToast({ title: '生成失败', icon: 'none' });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}
.muted {
  color: #8e8580;
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

/* 总进度概览 */
.overview {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.overview-label {
  font-size: 26rpx;
  color: #333;
  white-space: nowrap;
  font-weight: 600;
}
.overview-percent {
  font-size: 24rpx;
  color: #8e8580;
  white-space: nowrap;
}
.progress-bar {
  flex: 1;
  height: 12rpx;
  background: #f0ece8;
  border-radius: 6rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e85d3a, #f59e42);
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

/* 分类 Tab */
.category-scroll {
  white-space: nowrap;
  margin-bottom: 24rpx;
}
.category-tabs {
  display: flex;
  gap: 16rpx;
  padding: 0 4rpx;
}
.category-tab {
  display: inline-block;
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #8e8580;
  background: #f5f2ef;
  &.active {
    background: #333;
    color: #fff;
  }
}

/* 成就网格 */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.badge-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;

  &.locked {
    opacity: 0.6;
  }
  &.hidden-surprise {
    background: linear-gradient(135deg, #fff8f0, #fff0f0);
    border: 2rpx solid #f59e42;
  }
}
.emoji {
  font-size: 64rpx;
  &.emoji-locked {
    font-size: 48rpx;
    opacity: 0.4;
  }
}
.badge-title {
  margin-top: 12rpx;
  font-weight: 600;
  font-size: 26rpx;
}
.badge-status {
  margin-top: 8rpx;
  font-size: 22rpx;
  text-align: center;
  &.unlocked-text {
    color: #6b9e78;
    font-weight: 600;
  }
}

/* 进度条 */
.badge-progress {
  margin-top: 12rpx;
  width: 100%;
  padding: 0 12rpx;
}
.mini-progress-bar {
  height: 8rpx;
  background: #f0ece8;
  border-radius: 4rpx;
  overflow: hidden;
}
.mini-progress-fill {
  height: 100%;
  background: #e85d3a;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}
.progress-text {
  display: block;
  text-align: center;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8e8580;
}

/* 惊喜标签 */
.surprise-tag {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  background: #f59e42;
  color: #fff;
  font-size: 18rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.badge-unlocked-area {
  margin-top: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: #e07a5f;
  font-weight: 500;
}
.canvas-container {
  position: fixed;
  left: -9999rpx;
  top: -9999rpx;
  width: 600rpx;
  height: 800rpx;
}
</style>
