<template>
  <view class="page">
    <!-- Profile header -->
    <view class="profile-hero">
      <view class="hero-decor hero-decor--1" />
      <view class="hero-decor hero-decor--2" />
      <view class="hero-inner">
        <view class="avatar-wrap" @click="isLoggedIn ? goEditProfile() : goLogin()">
          <image
            v-if="isLoggedIn && (user?.avatarUrl || avatarFallback)"
            class="avatar"
            :src="user?.avatarUrl || avatarFallback"
            mode="aspectFill"
          />
          <view v-else class="avatar avatar--empty">
            <wd-icon name="user" size="56rpx" color="rgba(255,255,255,0.5)" />
          </view>
          <view class="avatar-ring" />
        </view>
        <view class="user-info" @click="goEditProfile">
          <text class="nickname">{{ user?.nickname || '未登录' }}</text>
          <view v-if="chefLevel" class="chef-level-badge" @click.stop="goChefLevel">
            <text class="chef-level-emoji">{{ chefLevel.emoji }}</text>
            <text class="chef-level-title">{{ chefLevel.title }}</text>
            <wd-icon name="arrow-right" size="20rpx" color="rgba(255,255,255,0.6)" />
          </view>
          <view class="family-hint">
            <wd-icon name="home" size="22rpx" color="rgba(255,255,255,0.7)" />
            <text class="family-name">{{
              family?.name || (isLoggedIn ? '未加入家庭' : '登录后开启小厨房')
            }}</text>
          </view>
        </view>
        <view v-if="!isLoggedIn" class="login-btn" @click="goLogin">
          <text>登录</text>
        </view>
      </view>
    </view>

    <!-- Metrics (logged in) -->
    <view v-if="isLoggedIn" class="metrics fade-up fade-up--1">
      <view class="metric-card" @click="goLovePoints">
        <view class="metric-icon metric-icon--rose">
          <wd-icon name="heart" size="40rpx" color="#E07A5F" />
        </view>
        <view class="metric-text">
          <text class="metric-value">{{ balance?.balance ?? '--' }}</text>
          <text class="metric-label">爱心币</text>
        </view>
      </view>
      <view class="metric-card" @click="goAchievements">
        <view class="metric-icon metric-icon--amber">
          <wd-icon name="star" size="40rpx" color="#D4A55A" />
        </view>
        <view class="metric-text">
          <text class="metric-value">{{ achievementCount }}</text>
          <text class="metric-label">徽章</text>
        </view>
      </view>
    </view>

    <!-- Menu section (logged in) -->
    <view v-if="isLoggedIn" class="menu-card fade-up fade-up--2">
      <view class="menu-item" @click="goFamilySettings">
        <view class="menu-icon menu-icon--rose">
          <wd-icon name="setting" size="34rpx" color="#E07A5F" />
        </view>
        <text class="menu-label">家庭空间设置</text>
        <wd-icon name="arrow-right" size="28rpx" color="#D5CEC8" />
      </view>
      <view class="menu-divider" />
      <view class="menu-item" @click="goEditProfile">
        <view class="menu-icon menu-icon--sage">
          <wd-icon name="edit" size="34rpx" color="#6B9E78" />
        </view>
        <text class="menu-label">编辑个人资料</text>
        <wd-icon name="arrow-right" size="28rpx" color="#D5CEC8" />
      </view>
      <!-- #ifdef MP-WEIXIN -->
      <view class="menu-divider" />
      <view class="menu-item" @click="goBindCredentials">
        <view class="menu-icon menu-icon--slate">
          <wd-icon name="computer" size="34rpx" color="#6B8FA8" />
        </view>
        <text class="menu-label">网页版登录</text>
        <wd-icon name="arrow-right" size="28rpx" color="#D5CEC8" />
      </view>
      <!-- #endif -->
    </view>

    <view v-if="isLoggedIn" class="menu-card fade-up fade-up--3">
      <view class="menu-item" @click="goFeedback">
        <view class="menu-icon menu-icon--slate">
          <wd-icon name="chat" size="34rpx" color="#6B8FA8" />
        </view>
        <text class="menu-label">意见反馈</text>
        <wd-icon name="arrow-right" size="28rpx" color="#D5CEC8" />
      </view>
      <view class="menu-divider" />
      <view class="menu-item" @click="goAbout">
        <view class="menu-icon menu-icon--amber">
          <wd-icon name="info-circle" size="34rpx" color="#D4A55A" />
        </view>
        <text class="menu-label">关于</text>
        <wd-icon name="arrow-right" size="28rpx" color="#D5CEC8" />
      </view>
    </view>

    <!-- Logout -->
    <view v-if="isLoggedIn" class="logout-section fade-up fade-up--4">
      <view class="logout-btn" @click="handleLogout">
        <text>退出登录</text>
      </view>
    </view>

    <custom-tabbar current="profile" />
  </view>
</template>

<script>
import { useAuthStore } from '@/stores/auth.js';
import { useBusinessConfigStore } from '@/stores/business-config.js';
import { useFamilyStore } from '@/stores/family.js';
import { lovePointApi } from '@/api/love-point.js';
import { achievementApi } from '@/api/achievement.js';
import { userApi } from '@/api/user.js';
import CustomTabbar from '@/components/custom-tabbar.vue';

export default {
  components: { CustomTabbar },
  data() {
    return {
      balance: null,
      personalAchievements: [],
      familyAchievements: [],
      chefLevel: null,
    };
  },
  computed: {
    isLoggedIn() {
      return useAuthStore().isLoggedIn;
    },
    user() {
      return useAuthStore().user;
    },
    family() {
      return useFamilyStore().family;
    },
    achievementCount() {
      if (!this.personalAchievements.length && !this.familyAchievements.length) return '--';
      return this.personalAchievements.length + this.familyAchievements.length;
    },
    avatarFallback() {
      return useBusinessConfigStore().avatarFallback(this.user?.gender);
    },
  },
  async onShow() {
    if (!useAuthStore().isLoggedIn) return;
    if (!this.family) await useFamilyStore().refresh();
    await this.loadMetrics();
  },
  methods: {
    async loadMetrics() {
      if (!useFamilyStore().hasFamily) return;

      try {
        this.balance = await lovePointApi.balance();
      } catch {
        // ignore
      }

      try {
        const [personal, family] = await Promise.all([
          achievementApi.listMine(),
          achievementApi.listFamily(),
        ]);
        this.personalAchievements = personal;
        this.familyAchievements = family;
      } catch {
        // ignore
      }

      try {
        this.chefLevel = await userApi.getChefLevel();
      } catch {
        // ignore
      }
    },
    goLogin() {
      uni.navigateTo({ url: '/pages/auth/login' });
    },
    goLovePoints() {
      uni.navigateTo({ url: '/pages/profile/love-points' });
    },
    goAchievements() {
      uni.navigateTo({ url: '/pages/profile/achievements' });
    },
    goFamilySettings() {
      uni.navigateTo({ url: '/pages/family/settings' });
    },
    goEditProfile() {
      uni.navigateTo({ url: '/pages/profile/edit' });
    },
    goBindCredentials() {
      uni.navigateTo({ url: '/pages/profile/bind-credentials' });
    },
    goFeedback() {
      uni.navigateTo({ url: '/pages/profile/feedback' });
    },
    goAbout() {
      uni.navigateTo({ url: '/pages/profile/about' });
    },
    goChefLevel() {
      uni.navigateTo({ url: '/pages/profile/chef-level' });
    },
    async handleLogout() {
      const r = await new Promise((resolve) => {
        uni.showModal({
          title: '退出登录',
          confirmText: '退出',
          confirmColor: '#C75B5B',
          success: (x) => resolve(x.confirm),
          fail: () => resolve(false),
        });
      });
      if (!r) return;
      useAuthStore().logout();
      useFamilyStore().clear();
      this.balance = null;
      this.personalAchievements = [];
      this.familyAchievements = [];
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $fk-bg-page;
}

/* ── Profile hero ────────────────────────────────────────── */
.profile-hero {
  position: relative;
  background: linear-gradient(160deg, #e07a5f 0%, #ee9a86 50%, #f0a08c 100%);
  padding: 48rpx 40rpx 64rpx;
  overflow: hidden;
}

.hero-decor {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
}
.hero-decor--1 {
  width: 280rpx;
  height: 280rpx;
  top: -80rpx;
  right: -40rpx;
}
.hero-decor--2 {
  width: 140rpx;
  height: 140rpx;
  bottom: 20rpx;
  left: -30rpx;
}

.hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 28rpx;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 4rpx solid rgba(255, 255, 255, 0.4);
}

.avatar--empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-ring {
  position: absolute;
  inset: -8rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.15);
}

.user-info {
  flex: 1;
}

.nickname {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1rpx;
}

.family-hint {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
  line-height: 1;
}

.chef-level-badge {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 8rpx;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
}

.chef-level-emoji {
  font-size: 22rpx;
  line-height: 1;
}

.chef-level-title {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  line-height: 1;
}

.family-name {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
  font-weight: 300;
  line-height: 1;
}

.login-btn {
  padding: 14rpx 36rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  border: 2rpx solid rgba(255, 255, 255, 0.4);
  font-size: 28rpx;
  color: #fff;
  font-weight: 500;
}

/* ── Metrics ─────────────────────────────────────────────── */
.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  padding: 0 32rpx;
  margin-top: -28rpx;
  position: relative;
  z-index: 2;
}

.metric-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.06),
    0 8rpx 28rpx rgba(142, 133, 128, 0.04);
}

.metric-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.metric-icon--rose {
  background: rgba(224, 122, 95, 0.1);
}
.metric-icon--amber {
  background: rgba(212, 165, 90, 0.1);
}

.metric-text {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 40rpx;
  font-weight: 700;
  color: $fk-text;
  line-height: 1.2;
}

.metric-label {
  font-size: 22rpx;
  color: $fk-text-muted;
  margin-top: 2rpx;
}

/* ── Menu cards ──────────────────────────────────────────── */
.menu-card {
  background: #fff;
  border-radius: 24rpx;
  margin: 20rpx 32rpx 0;
  padding: 8rpx 0;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.05),
    0 4rpx 16rpx rgba(142, 133, 128, 0.03);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 28rpx;
}

.menu-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.menu-icon--rose {
  background: rgba(224, 122, 95, 0.1);
}
.menu-icon--sage {
  background: rgba(107, 158, 120, 0.1);
}
.menu-icon--slate {
  background: rgba(107, 143, 168, 0.1);
}
.menu-icon--amber {
  background: rgba(212, 165, 90, 0.1);
}

.menu-label {
  flex: 1;
  font-size: 30rpx;
  color: $fk-text;
}

.menu-divider {
  height: 1rpx;
  background: $fk-border-light;
  margin: 0 28rpx 0 112rpx;
}

/* ── Logout ──────────────────────────────────────────────── */
.logout-section {
  padding: 48rpx 32rpx;
}

.logout-btn {
  text-align: center;
  padding: 24rpx;
  border-radius: 24rpx;
  background: #fff;
  color: $fk-error;
  font-size: 30rpx;
  font-weight: 500;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.04),
    0 4rpx 12rpx rgba(142, 133, 128, 0.02);
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
  animation: fadeUp 0.45s ease-out both;
}
.fade-up--1 {
  animation-delay: 0.05s;
}
.fade-up--2 {
  animation-delay: 0.12s;
}
.fade-up--3 {
  animation-delay: 0.19s;
}
.fade-up--4 {
  animation-delay: 0.26s;
}
</style>
