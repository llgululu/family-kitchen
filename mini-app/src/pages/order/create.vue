<template>
  <view class="page">
    <view class="form">
      <!-- 厨师 -->
      <view class="card fade-up">
        <view class="card-header">
          <view class="card-icon card-icon--rose">
            <wd-icon name="user" size="28rpx" color="#E07A5F" />
          </view>
          <text class="card-label">让 TA 来做</text>
          <text class="card-required">*</text>
        </view>

        <view v-if="candidateChefs.length" class="chef-row">
          <view
            v-for="m in candidateChefs"
            :key="m.userId"
            class="chef-card"
            :class="{ active: form.chefUserId === m.userId }"
            @click="form.chefUserId = m.userId"
          >
            <image
              class="chef-avatar"
              :src="m.avatarUrl || getAvatarFallback(m.gender)"
              mode="aspectFill"
            />
            <view class="chef-check">
              <wd-icon v-if="form.chefUserId === m.userId" name="check" size="20rpx" color="#fff" />
            </view>
            <text class="chef-name">{{ m.nickname }}</text>
          </view>
        </view>

        <view v-else class="empty-hint">
          <wd-icon name="warning" size="24rpx" color="#8E8580" />
          <text>家庭里还没有第二个成员，先去邀请 TA</text>
        </view>
      </view>

      <!-- 菜品 -->
      <view class="card fade-up fade-up--1">
        <view class="card-header">
          <view class="card-icon card-icon--amber">
            <wd-icon name="goods" size="28rpx" color="#D4A55A" />
          </view>
          <text class="card-label">选菜</text>
          <text class="card-required">*</text>
          <text class="card-link" @click="openRecipePicker">
            <wd-icon name="add" size="24rpx" color="#E07A5F" />
            添加菜品
          </text>
        </view>

        <view v-if="!form.items.length" class="empty-hint">
          <text>还没有选菜，点击上方添加</text>
        </view>

        <view v-else class="items">
          <view v-for="(item, idx) in form.items" :key="item.recipeId" class="item">
            <view class="item-index">{{ idx + 1 }}</view>
            <view class="item-body">
              <text class="item-name">{{ item.recipeName }}</text>
              <wd-input
                v-model="item.customNotes"
                placeholder="例：少放辣"
                :maxlength="200"
                custom-style="margin-top:8rpx"
              />
            </view>
            <view class="item-remove" @click="removeItem(idx)">
              <wd-icon name="close" size="24rpx" color="#C75B5B" />
            </view>
          </view>
        </view>
      </view>

      <!-- 期望时间 -->
      <view class="card fade-up fade-up--2">
        <view class="card-header">
          <view class="card-icon card-icon--slate">
            <wd-icon name="clock" size="28rpx" color="#6B8FA8" />
          </view>
          <text class="card-label">期望上菜时间</text>
        </view>
        <view class="time-row">
          <picker
            mode="time"
            :value="expectedTime"
            @change="(e) => (expectedTime = e.detail.value)"
          >
            <view class="picker-value">
              <text :class="expectedTime ? 'time-set' : 'time-unset'">
                {{ expectedTime || '尽快' }}
              </text>
              <wd-icon name="arrow-right" size="24rpx" color="#B5AEA8" />
            </view>
          </picker>
          <text v-if="expectedTime" class="clear-link" @click="expectedTime = ''">清除</text>
        </view>
      </view>

      <!-- 备注 -->
      <view class="card fade-up fade-up--3">
        <view class="card-header">
          <view class="card-icon card-icon--sage">
            <wd-icon name="chat" size="28rpx" color="#6B9E78" />
          </view>
          <text class="card-label">整体备注</text>
        </view>
        <wd-textarea
          v-model="form.customerNotes"
          placeholder="今天清淡点 / 多放点醋……"
          :maxlength="500"
        />
      </view>
    </view>

    <!-- 底部安全区域占位 -->
    <view class="footer-spacer" />

    <!-- 固定底部按钮 -->
    <view class="footer">
      <view class="footer-inner">
        <wd-button
          type="error"
          round
          block
          :loading="saving"
          :disabled="!canSubmit || saving"
          @click="handleSubmit"
        >
          提交订单
        </wd-button>
      </view>
    </view>

    <!-- 菜品选择浮层 -->
    <view v-if="pickerOpen" class="overlay" @click="pickerOpen = false">
      <view class="picker-sheet" @click.stop>
        <view class="sheet-bar" />
        <view class="sheet-head">
          <text class="sheet-title">选择菜品</text>
          <text class="sheet-done" @click="pickerOpen = false">完成</text>
        </view>
        <scroll-view scroll-y class="sheet-body" style="max-height: 55vh">
          <view
            v-for="r in recipeOptions"
            :key="r.id"
            class="picker-row"
            :class="{ selected: isSelected(r.id) }"
            @click="toggleRecipe(r)"
          >
            <image
              class="picker-thumb"
              :src="r.imageUrls[0] || '/static/logo.png'"
              mode="aspectFill"
            />
            <view class="picker-info">
              <text class="picker-name">{{ r.name }}</text>
              <wd-rate
                :model-value="r.difficulty"
                :max="5"
                size="18rpx"
                color="#E07A5F"
                void-color="#D5CEC8"
                readonly
              />
            </view>
            <view class="picker-check" :class="{ checked: isSelected(r.id) }">
              <wd-icon
                :name="isSelected(r.id) ? 'check' : 'add'"
                size="28rpx"
                :color="isSelected(r.id) ? '#fff' : '#B5AEA8'"
              />
            </view>
          </view>
          <view v-if="!recipeOptions.length" class="empty-hint center">
            <text>没有菜谱，先去菜单添加</text>
          </view>
        </scroll-view>
        <view class="sheet-safe" />
      </view>
    </view>
  </view>
</template>

<script>
import { useFamilyStore } from '@/stores/family.js';
import { useBusinessConfigStore } from '@/stores/business-config.js';
import { useAuthStore } from '@/stores/auth.js';
import { ensureFamily } from '@/composables/use-family-guard.js';
import { recipeApi } from '@/api/recipe.js';
import { orderApi } from '@/api/order.js';

export default {
  data() {
    return {
      form: {
        chefUserId: '',
        items: [],
        customerNotes: '',
      },
      expectedTime: '',
      recipeOptions: [],
      pickerOpen: false,
      saving: false,
    };
  },
  computed: {
    candidateChefs() {
      const auth = useAuthStore();
      const family = useFamilyStore();
      return (family.members || []).filter((m) => m.userId !== auth.user?.id);
    },
    canSubmit() {
      return this.form.chefUserId && this.form.items.length > 0;
    },
  },
  async onLoad(query) {
    if (!(await ensureFamily())) {
      uni.navigateBack();
      return;
    }
    if (this.candidateChefs.length === 1) {
      this.form.chefUserId = this.candidateChefs[0].userId;
    }
    // 一键复购：预填厨师
    if (query.chefUserId) {
      const exists = this.candidateChefs.some((m) => m.userId === query.chefUserId);
      if (exists) this.form.chefUserId = query.chefUserId;
    }
    await this.loadRecipes();
    // 一键复购：预填菜品
    if (query.recipeIds) {
      const ids = String(query.recipeIds).split(',').filter(Boolean);
      for (const rid of ids) {
        const recipe = this.recipeOptions.find((r) => r.id === rid);
        if (recipe && !this.isSelected(recipe.id)) this.addRecipe(recipe);
      }
    } else if (query.recipeId) {
      const recipe = this.recipeOptions.find((r) => r.id === query.recipeId);
      if (recipe) this.addRecipe(recipe);
    }
  },
  methods: {
    getAvatarFallback(gender) {
      return useBusinessConfigStore().avatarFallback(gender);
    },
    async loadRecipes() {
      try {
        const res = await recipeApi.list({ page: 1, pageSize: 100 });
        this.recipeOptions = res.items;
      } catch {
        // ignore
      }
    },
    openRecipePicker() {
      this.pickerOpen = true;
    },
    isSelected(id) {
      return this.form.items.some((i) => i.recipeId === id);
    },
    toggleRecipe(r) {
      if (this.isSelected(r.id)) {
        const idx = this.form.items.findIndex((i) => i.recipeId === r.id);
        this.form.items.splice(idx, 1);
      } else {
        this.addRecipe(r);
      }
    },
    addRecipe(r) {
      this.form.items.push({
        recipeId: r.id,
        recipeName: r.name,
        customNotes: '',
      });
    },
    removeItem(idx) {
      this.form.items.splice(idx, 1);
    },
    buildExpectedAt() {
      if (!this.expectedTime) return undefined;
      const [hh, mm] = this.expectedTime.split(':').map(Number);
      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
      if (target.getTime() < now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return target.toISOString();
    },
    async handleSubmit() {
      if (!this.canSubmit) return;
      this.saving = true;
      try {
        const order = await orderApi.create({
          chefUserId: this.form.chefUserId,
          items: this.form.items.map((i) => ({
            recipeId: i.recipeId,
            customNotes: i.customNotes || undefined,
          })),
          customerNotes: this.form.customerNotes || undefined,
          expectedServeAt: this.buildExpectedAt(),
        });
        uni.showToast({ title: '已下单', icon: 'success' });
        setTimeout(() => {
          uni.redirectTo({ url: `/pages/order/detail?id=${order.id}` });
        }, 600);
      } catch {
        // ignore
      } finally {
        this.saving = false;
      }
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

.form {
  padding: 20rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* ── Card ────────────────────────────────────────────────── */
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 28rpx 24rpx;
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

.card-icon--rose {
  background: rgba(224, 122, 95, 0.1);
}
.card-icon--amber {
  background: rgba(212, 165, 90, 0.1);
}
.card-icon--slate {
  background: rgba(107, 143, 168, 0.1);
}
.card-icon--sage {
  background: rgba(107, 158, 120, 0.1);
}

.card-label {
  font-size: 28rpx;
  font-weight: 600;
  color: $fk-text;
}

.card-required {
  color: $fk-primary;
  font-size: 28rpx;
  margin-left: -4rpx;
}

.card-link {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4rpx;
  color: $fk-primary;
  font-size: 26rpx;
  font-weight: 500;
}

.empty-hint {
  display: flex;
  align-items: center;
  gap: 8rpx;
  color: $fk-text-muted;
  font-size: 26rpx;
  padding: 8rpx 0;
}

.center {
  justify-content: center;
  padding: 48rpx 0;
}

/* ── Chef selection ──────────────────────────────────────── */
.chef-row {
  display: flex;
  gap: 16rpx;
}

.chef-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 24rpx 16rpx 20rpx;
  border: 2rpx solid $fk-border;
  border-radius: 20rpx;
  position: relative;
}

.chef-card.active {
  border-color: $fk-primary;
  background: $fk-primary-lighter;
}

.chef-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: $fk-avatar-bg;
}

.chef-check {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: $fk-border;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.chef-card.active .chef-check {
  background: $fk-primary;
}

.chef-name {
  font-size: 26rpx;
  font-weight: 500;
  color: $fk-text;
}

/* ── Items list ──────────────────────────────────────────── */
.items {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 16rpx;
  background: $fk-bg-page;
  border-radius: 16rpx;
}

.item-index {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(224, 122, 95, 0.1);
  color: $fk-primary;
  font-size: 22rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.item-body {
  flex: 1;
  min-width: 0;
}

.item-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $fk-text;
}

.item-remove {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
}

/* ── Time picker ─────────────────────────────────────────── */
.time-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-value {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
}

.time-set {
  font-size: 30rpx;
  font-weight: 600;
  color: $fk-primary;
}

.time-unset {
  font-size: 28rpx;
  color: $fk-text-muted;
}

.clear-link {
  font-size: 24rpx;
  color: $fk-text-muted;
}

/* ── Footer ──────────────────────────────────────────────── */
.footer-spacer {
  height: 140rpx;
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
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

/* ── Picker overlay ──────────────────────────────────────── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 99;
}

.picker-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 75vh;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  display: flex;
  flex-direction: column;
}

.sheet-bar {
  width: 64rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: $fk-border;
  margin: 16rpx auto 0;
}

.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 32rpx 16rpx;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $fk-text;
}

.sheet-done {
  font-size: 28rpx;
  color: $fk-primary;
  font-weight: 600;
}

.sheet-body {
  flex: 1;
  overflow: hidden;
}

.sheet-safe {
  height: env(safe-area-inset-bottom);
}

.picker-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 32rpx;
  border-bottom: 1rpx solid $fk-border-light;
  box-sizing: border-box;
}

.picker-row.selected {
  background: $fk-primary-lighter;
  border-radius: 16rpx;
  border-bottom-color: transparent;
}

.picker-thumb {
  width: 80rpx;
  height: 80rpx;
  border-radius: 16rpx;
  background: $fk-avatar-bg;
  flex-shrink: 0;
}

.picker-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.picker-name {
  font-size: 28rpx;
  font-weight: 500;
  color: $fk-text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-check {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  border: 2rpx solid $fk-border;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.picker-check.checked {
  background: $fk-primary;
  border-color: $fk-primary;
}

/* ── Animations ──────────────────────────────────────────── */
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
.fade-up--3 {
  animation-delay: 0.18s;
}
</style>
