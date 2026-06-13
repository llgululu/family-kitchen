<template>
  <view class="page">
    <view class="form">
      <!-- 菜名 -->
      <view class="card fade-up">
        <view class="card-header">
          <view class="card-icon card-icon--rose">
            <wd-icon name="edit" size="28rpx" color="#E07A5F" />
          </view>
          <text class="card-label">菜名</text>
          <text class="card-required">*</text>
        </view>
        <input
          v-model="form.name"
          class="name-input"
          placeholder="例：番茄炒蛋"
          maxlength="30"
          placeholder-class="name-placeholder"
        />
      </view>

      <!-- 图片 -->
      <view class="card fade-up fade-up--1">
        <view class="card-header">
          <view class="card-icon card-icon--amber">
            <wd-icon name="camera" size="28rpx" color="#D4A55A" />
          </view>
          <text class="card-label">图片</text>
          <text class="card-hint">最多 5 张</text>
        </view>
        <view class="images">
          <view v-for="(url, idx) in form.imageUrls" :key="url" class="img-wrap">
            <image :src="url" class="thumb" mode="aspectFill" />
            <view class="remove" @click="removeImage(idx)">
              <wd-icon name="close" size="20rpx" color="#fff" />
            </view>
          </view>
          <view v-if="form.imageUrls.length < 5" class="img-add" @click="addImage">
            <wd-icon name="add" size="44rpx" color="#E07A5F" />
            <text class="img-add-text">添加</text>
          </view>
        </view>
      </view>

      <!-- 难度 -->
      <view class="card fade-up fade-up--2">
        <view class="card-header">
          <view class="card-icon card-icon--rose">
            <wd-icon name="star" size="28rpx" color="#E07A5F" />
          </view>
          <text class="card-label">难度</text>
        </view>
        <wd-rate
          v-model="form.difficulty"
          :max="5"
          size="44rpx"
          color="#E07A5F"
          void-color="#D5CEC8"
        />
      </view>

      <!-- 餐段标签 -->
      <view class="card fade-up fade-up--2">
        <view class="card-header">
          <view class="card-icon card-icon--slate">
            <wd-icon name="clock" size="28rpx" color="#6B8FA8" />
          </view>
          <text class="card-label">餐段标签</text>
        </view>
        <view class="chips">
          <text
            v-for="t in MEAL_TAGS"
            :key="t.value"
            class="chip"
            :class="{ 'chip--active': form.mealTags.includes(t.value) }"
            @click="toggleMeal(t.value)"
          >
            {{ t.label }}
          </text>
        </view>
      </view>

      <!-- 口味标签 -->
      <view class="card fade-up fade-up--3">
        <view class="card-header">
          <view class="card-icon card-icon--sage">
            <wd-icon name="goods" size="28rpx" color="#6B9E78" />
          </view>
          <text class="card-label">口味标签</text>
        </view>
        <view class="chips">
          <text
            v-for="t in FLAVOR_TAGS"
            :key="t.value"
            class="chip"
            :class="{ 'chip--active': form.flavorTags.includes(t.value) }"
            @click="toggleFlavor(t.value)"
          >
            {{ t.label }}
          </text>
        </view>
      </view>

      <!-- 做法备注 -->
      <view class="card fade-up fade-up--3">
        <view class="card-header">
          <view class="card-icon card-icon--amber">
            <wd-icon name="chat" size="28rpx" color="#D4A55A" />
          </view>
          <text class="card-label">做法备注</text>
        </view>
        <textarea
          v-model="form.notes"
          class="notes-textarea"
          placeholder="食材、火候、小窍门……"
          maxlength="500"
          placeholder-class="notes-placeholder"
        />
      </view>
    </view>

    <!-- 底部安全占位 -->
    <view class="footer-spacer" />

    <!-- 固定底部 -->
    <view class="footer">
      <view class="footer-inner">
        <view
          class="save-btn"
          :class="{ disabled: saving || !form.name.trim() }"
          @click="handleSave"
        >
          <text v-if="saving">保存中…</text>
          <text v-else>{{ isEdit ? '保存菜谱' : '创建菜谱' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { recipeApi } from '@/api/recipe.js';
import { chooseAndUploadImages } from '@/api/storage.js';
import { MEAL_TAGS, FLAVOR_TAGS } from '@/utils/labels.js';
import { ensureFamily } from '@/composables/use-family-guard.js';

export default {
  data() {
    return {
      MEAL_TAGS,
      FLAVOR_TAGS,
      id: null,
      saving: false,
      form: {
        name: '',
        imageUrls: [],
        difficulty: 3,
        mealTags: [],
        flavorTags: [],
        notes: '',
      },
    };
  },
  computed: {
    isEdit() {
      return !!this.id;
    },
  },
  async onLoad(query) {
    if (!(await ensureFamily())) {
      uni.navigateBack();
      return;
    }
    if (query.id) {
      this.id = query.id;
      this.loadDetail();
      uni.setNavigationBarTitle({ title: '编辑菜谱' });
    }
  },
  methods: {
    async loadDetail() {
      try {
        const r = await recipeApi.get(this.id);
        this.form.name = r.name;
        this.form.imageUrls = [...r.imageUrls];
        this.form.difficulty = r.difficulty;
        this.form.mealTags = [...r.mealTags];
        this.form.flavorTags = [...r.flavorTags];
        this.form.notes = r.notes || '';
      } catch {
        // ignore
      }
    },
    async addImage() {
      try {
        const remaining = 5 - this.form.imageUrls.length;
        const uploaded = await chooseAndUploadImages({
          count: remaining,
          category: 'recipe',
        });
        for (const u of uploaded) this.form.imageUrls.push(u.url);
      } catch (err) {
        // user cancel or fail
      }
    },
    removeImage(idx) {
      this.form.imageUrls.splice(idx, 1);
    },
    toggleMeal(tag) {
      const i = this.form.mealTags.indexOf(tag);
      if (i >= 0) this.form.mealTags.splice(i, 1);
      else this.form.mealTags.push(tag);
    },
    toggleFlavor(tag) {
      const i = this.form.flavorTags.indexOf(tag);
      if (i >= 0) this.form.flavorTags.splice(i, 1);
      else this.form.flavorTags.push(tag);
    },
    async handleSave() {
      const name = this.form.name.trim();
      if (!name) return;
      this.saving = true;
      try {
        const payload = {
          ...this.form,
          name,
          notes: this.form.notes || undefined,
        };
        if (this.isEdit) {
          await recipeApi.update(this.id, payload);
        } else {
          await recipeApi.create(payload);
        }
        uni.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => uni.navigateBack(), 600);
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
}

.card-hint {
  margin-left: auto;
  font-size: 24rpx;
  color: $fk-text-muted;
}

/* ── Name input ──────────────────────────────────────────── */
.name-input {
  width: 100%;
  background: $fk-bg-page;
  border: none;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 32rpx;
  font-weight: 500;
  color: $fk-text;
}

.name-placeholder {
  color: $fk-text-placeholder;
  font-weight: 400;
}

/* ── Images ──────────────────────────────────────────────── */
.images {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.img-wrap {
  position: relative;
  width: 160rpx;
  height: 160rpx;
}

.thumb {
  width: 100%;
  height: 100%;
  border-radius: 20rpx;
  background: $fk-avatar-bg;
}

.remove {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  width: 36rpx;
  height: 36rpx;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-add {
  width: 160rpx;
  height: 160rpx;
  background: $fk-primary-lighter;
  border: 2rpx dashed rgba(224, 122, 95, 0.3);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}

.img-add-text {
  font-size: 22rpx;
  color: $fk-primary;
}

/* ── Chips ───────────────────────────────────────────────── */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.chip {
  padding: 14rpx 28rpx;
  background: $fk-bg-page;
  border-radius: 999rpx;
  font-size: 26rpx;
  color: $fk-text-secondary;
}

.chip--active {
  background: $fk-primary;
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(224, 122, 95, 0.2);
}

/* ── Notes textarea ──────────────────────────────────────── */
.notes-textarea {
  width: 100%;
  min-height: 200rpx;
  background: $fk-bg-page;
  border: none;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: $fk-text;
  box-sizing: border-box;
}

.notes-placeholder {
  color: $fk-text-placeholder;
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

.save-btn {
  width: 100%;
  padding: 24rpx 0;
  border-radius: 999rpx;
  background: $fk-primary;
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
}

.save-btn.disabled {
  opacity: 0.5;
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
