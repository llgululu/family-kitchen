<template>
  <view class="setup" :style="{ paddingTop: statusBarHeight + 'px' }">
    <!-- Nav bar -->
    <view class="nav">
      <view v-if="mode !== 'choose'" class="nav-back" @click="mode = 'choose'">
        <wd-icon name="thin-arrow-left" size="36rpx" color="#2E2926" />
      </view>
      <text class="nav-title">{{ navTitle }}</text>
    </view>

    <!-- Step 1: 选择 -->
    <view v-if="mode === 'choose'" class="step step--choose">
      <!-- Decorative hero composition -->
      <view class="hero">
        <view class="hero-circle hero-circle--1" />
        <view class="hero-circle hero-circle--2" />
        <view class="hero-circle hero-circle--3" />
        <view class="hero-icon-main">
          <wd-icon name="heart" size="72rpx" color="#E07A5F" />
        </view>
      </view>

      <view class="hero-text fade-up">
        <text class="hero-title">和 TA 一起</text>
        <text class="hero-title hero-title--accent">开一个小厨房</text>
        <text class="hero-desc">点菜、做菜、记录甜蜜</text>
      </view>

      <view class="choices fade-up fade-up--1">
        <view class="choice" @click="mode = 'create'">
          <view class="choice-icon choice-icon--create">
            <wd-icon name="add-circle" size="56rpx" color="#E07A5F" />
          </view>
          <text class="choice-title">创建</text>
          <text class="choice-sub">发起一个新的空间</text>
        </view>

        <view class="choice" @click="mode = 'join'">
          <view class="choice-icon choice-icon--join">
            <wd-icon name="user" size="56rpx" color="#6B9E78" />
          </view>
          <text class="choice-title">加入</text>
          <text class="choice-sub">输入 TA 的邀请码</text>
        </view>
      </view>
    </view>

    <!-- Step 2: 创建 -->
    <view v-else-if="mode === 'create'" class="step step--form">
      <view class="form-header fade-up">
        <view class="form-icon form-icon--rose">
          <wd-icon name="edit" size="44rpx" color="#E07A5F" />
        </view>
        <text class="form-title">给小厨房取个名字</text>
        <text class="form-hint">比如：我们的小厨房、甜蜜食堂</text>
      </view>

      <view class="form-card fade-up fade-up--1">
        <wd-input v-model="familyName" placeholder="输入厨房名称" :maxlength="60" clearable />
      </view>

      <view class="form-action fade-up fade-up--2">
        <wd-button
          type="error"
          round
          block
          :loading="loading"
          :disabled="!familyName.trim() || loading"
          @click="handleCreate"
        >
          创建
        </wd-button>
      </view>
    </view>

    <!-- Step 3: 加入 -->
    <view v-else-if="mode === 'join'" class="step step--form">
      <view class="form-header fade-up">
        <view class="form-icon form-icon--sage">
          <wd-icon name="key" size="44rpx" color="#6B9E78" />
        </view>
        <text class="form-title">输入邀请码</text>
        <text class="form-hint">向对方索取 8 位邀请码</text>
      </view>

      <view class="form-card fade-up fade-up--1">
        <wd-input
          v-model="inviteCode"
          placeholder="输入邀请码"
          :maxlength="20"
          clearable
          @input="inviteCode = inviteCode.toUpperCase()"
        />
      </view>

      <view class="form-action fade-up fade-up--2">
        <wd-button
          type="error"
          round
          block
          :loading="loading"
          :disabled="!inviteCode.trim() || loading"
          @click="handleJoin"
        >
          加入
        </wd-button>
      </view>
    </view>
  </view>
</template>

<script>
import { useFamilyStore } from '@/stores/family.js';
import { familyApi } from '@/api/family.js';

export default {
  data() {
    return {
      statusBarHeight: 0,
      mode: 'choose',
      familyName: '',
      inviteCode: '',
      loading: false,
    };
  },
  computed: {
    navTitle() {
      const map = { create: '创建小厨房', join: '加入小厨房' };
      return map[this.mode] || '';
    },
  },
  onShow() {
    this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
  },
  methods: {
    async handleCreate() {
      const name = this.familyName.trim();
      if (!name) return;
      this.loading = true;
      try {
        const family = useFamilyStore();
        await family.create({ name });
        // 生成邀请码并复制到剪贴板，方便直接发给对方
        const invite = await familyApi.refreshInviteCode();
        uni.setClipboardData({
          data: `加入我的小厨房，邀请码 ${invite.inviteCode}`,
          showToast: false,
        });
        uni.showModal({
          title: '小厨房已创建',
          content: `邀请码 ${invite.inviteCode} 已复制到剪贴板，发给 TA 让 TA 加入吧！也可以稍后在「家庭设置」中邀请。`,
          showCancel: false,
          confirmText: '知道了',
          success: () => {
            uni.switchTab({ url: '/pages/tabbar/home/home' });
          },
        });
      } catch (err) {
        // ignore, toast 已显示
      } finally {
        this.loading = false;
      }
    },

    async handleJoin() {
      const code = this.inviteCode.trim();
      if (!code) return;
      this.loading = true;
      try {
        const family = useFamilyStore();
        await family.joinByCode(code);
        uni.showToast({ title: '加入成功', icon: 'success' });
        setTimeout(() => uni.switchTab({ url: '/pages/tabbar/home/home' }), 600);
      } catch (err) {
        // ignore
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.setup {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff8f5 0%, $fk-bg-page 40%);
}

.nav {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 32rpx;
}

.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: $fk-text;
}

.step--choose {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 40rpx 0;
}

.hero {
  position: relative;
  width: 280rpx;
  height: 280rpx;
  margin-bottom: 40rpx;
}

.hero-circle {
  position: absolute;
  border-radius: 50%;
}

.hero-circle--1 {
  width: 200rpx;
  height: 200rpx;
  background: $fk-primary-lighter;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

.hero-circle--2 {
  width: 160rpx;
  height: 160rpx;
  background: rgba(224, 122, 95, 0.12);
  bottom: 20rpx;
  left: 20rpx;
}

.hero-circle--3 {
  width: 100rpx;
  height: 100rpx;
  background: rgba(224, 122, 95, 0.08);
  top: 40rpx;
  right: 20rpx;
}

.hero-icon-main {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.hero-text {
  text-align: center;
  margin-bottom: 56rpx;
}

.hero-title {
  display: block;
  font-size: 46rpx;
  font-weight: 700;
  color: $fk-text;
  line-height: 1.4;
}

.hero-title--accent {
  color: $fk-primary;
}

.hero-desc {
  display: block;
  font-size: 28rpx;
  color: $fk-text-muted;
  margin-top: 12rpx;
  font-weight: 300;
  letter-spacing: 2rpx;
}

.choices {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
}

.choice {
  background: #fff;
  border-radius: 28rpx;
  padding: 40rpx 20rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12rpx;
  box-shadow:
    0 4rpx 16rpx rgba(142, 133, 128, 0.06),
    0 12rpx 40rpx rgba(142, 133, 128, 0.04);
}

.choice-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4rpx;
}

.choice-icon--create {
  background: $fk-primary-lighter;
}

.choice-icon--join {
  background: rgba(107, 158, 120, 0.1);
}

.choice-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $fk-text;
}

.choice-sub {
  font-size: 22rpx;
  color: $fk-text-muted;
  line-height: 1.4;
}

.step--form {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 48rpx 0;
}

.form-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 48rpx;
}

.form-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.form-icon--rose {
  background: $fk-primary-lighter;
}

.form-icon--sage {
  background: rgba(107, 158, 120, 0.1);
}

.form-title {
  font-size: 38rpx;
  font-weight: 700;
  color: $fk-text;
}

.form-hint {
  font-size: 26rpx;
  color: $fk-text-muted;
  margin-top: 10rpx;
}

.form-card {
  width: 100%;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow:
    0 2rpx 8rpx rgba(142, 133, 128, 0.06),
    0 8rpx 28rpx rgba(142, 133, 128, 0.04);
}

.form-action {
  width: 100%;
  margin-top: 32rpx;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(28rpx);
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
  animation-delay: 0.08s;
}

.fade-up--2 {
  animation-delay: 0.16s;
}
</style>
