<template>
  <view class="page">
    <!-- Hero -->
    <view class="hero">
      <view class="hero-decor" />
      <view class="hero-inner">
        <view class="hero-row">
          <view class="hero-icon">
            <wd-icon name="edit" size="32rpx" color="#fff" />
          </view>
          <text class="hero-title">记录甜蜜时光</text>
        </view>
        <text class="hero-hint">补上那些忘记记录的美好瞬间</text>
      </view>
    </view>

    <!-- Date card -->
    <view class="card fade-up">
      <view class="card-header">
        <view class="card-icon card-icon--slate">
          <wd-icon name="calendar" size="28rpx" color="#6B8FA8" />
        </view>
        <text class="card-label">日期</text>
      </view>
      <picker mode="date" :value="form.date" @change="(e) => (form.date = e.detail.value)">
        <view class="date-picker">
          <text class="date-value">{{ form.date }}</text>
          <wd-icon name="arrow-right" size="24rpx" color="#D5CEC8" />
        </view>
      </picker>
    </view>

    <!-- Comment card -->
    <view class="card fade-up fade-up--1">
      <view class="card-header">
        <view class="card-icon card-icon--amber">
          <wd-icon name="chat" size="28rpx" color="#D4A55A" />
        </view>
        <text class="card-label">想留下什么</text>
      </view>
      <textarea
        v-model="form.comment"
        class="textarea"
        placeholder="今天我们去了……"
        maxlength="500"
      />
    </view>

    <!-- Images card -->
    <view class="card fade-up fade-up--2">
      <view class="card-header">
        <view class="card-icon card-icon--sage">
          <wd-icon name="camera" size="28rpx" color="#6B9E78" />
        </view>
        <text class="card-label">配图</text>
        <text class="card-count">{{ form.imageUrls.length }} / 5</text>
      </view>
      <view class="images">
        <view v-for="(url, idx) in form.imageUrls" :key="url" class="img-wrap">
          <image :src="url" class="thumb" mode="aspectFill" @click="preview(idx)" />
          <view class="remove" @click="form.imageUrls.splice(idx, 1)">
            <wd-icon name="close" size="20rpx" color="#fff" />
          </view>
        </view>
        <view v-if="form.imageUrls.length < 5" class="img-add" @click="addImage">
          <wd-icon name="add" size="36rpx" color="#E07A5F" />
          <text class="img-add-text">添加</text>
        </view>
      </view>
    </view>

    <!-- Submit -->
    <view class="submit-wrap fade-up fade-up--3">
      <view
        class="submit-btn"
        :class="{ 'submit-btn--disabled': !canSubmit }"
        @click="handleSubmit"
      >
        <text>保存</text>
      </view>
    </view>

    <view class="bottom-spacer" />
  </view>
</template>

<script>
import { timelineApi } from '@/api/timeline.js';
import { chooseAndUploadImages } from '@/api/storage.js';
import { ensureFamily } from '@/composables/use-family-guard.js';

export default {
  data() {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return {
      form: {
        date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
        comment: '',
        imageUrls: [],
      },
      saving: false,
    };
  },
  computed: {
    canSubmit() {
      return this.form.comment.trim().length > 0 || this.form.imageUrls.length > 0;
    },
  },
  async onLoad() {
    if (!(await ensureFamily())) {
      uni.navigateBack();
      return;
    }
  },
  methods: {
    preview(idx) {
      uni.previewImage({ urls: this.form.imageUrls, current: this.form.imageUrls[idx] });
    },
    async addImage() {
      try {
        const uploaded = await chooseAndUploadImages({
          count: 5 - this.form.imageUrls.length,
          category: 'timeline',
        });
        for (const u of uploaded) this.form.imageUrls.push(u.url);
      } catch {
        // ignore
      }
    },
    async handleSubmit() {
      if (!this.canSubmit || this.saving) return;
      this.saving = true;
      try {
        const occurredAt = new Date(`${this.form.date}T12:00:00`).toISOString();
        await timelineApi.createManual({
          occurredAt,
          comment: this.form.comment || undefined,
          imageUrls: this.form.imageUrls,
        });
        uni.showToast({ title: '已记录', icon: 'success' });
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
}

/* ── Hero ────────────────────────────────────────────────── */
.hero {
  position: relative;
  background: linear-gradient(160deg, #e07a5f 0%, #ee9a86 50%, #f0a08c 100%);
  margin: 20rpx 28rpx 0;
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

.hero-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.hero-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
}

.hero-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
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

.card-icon--sage {
  background: rgba(107, 158, 120, 0.1);
}

.card-label {
  font-size: 28rpx;
  font-weight: 600;
  color: $fk-text;
}

.card-count {
  margin-left: auto;
  font-size: 24rpx;
  color: $fk-text-muted;
}

/* ── Date picker ────────────────────────────────────────── */
.date-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: $fk-bg-page;
  border-radius: 16rpx;
}

.date-value {
  font-size: 30rpx;
  font-weight: 500;
  color: $fk-text;
}

/* ── Textarea ───────────────────────────────────────────── */
.textarea {
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

/* ── Images ─────────────────────────────────────────────── */
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
  border-radius: 16rpx;
  background: $fk-bg-page;
}

.remove {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 36rpx;
  height: 36rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-add {
  width: 160rpx;
  height: 160rpx;
  border-radius: 16rpx;
  border: 2rpx dashed $fk-border;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  background: rgba(224, 122, 95, 0.04);
}

.img-add-text {
  font-size: 22rpx;
  color: $fk-primary;
}

/* ── Submit ─────────────────────────────────────────────── */
.submit-wrap {
  margin: 40rpx 28rpx 0;
}

.submit-btn {
  width: 100%;
  padding: 26rpx 0;
  border-radius: 999rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
  background: $fk-primary;
  color: #fff;
  box-shadow: 0 6rpx 20rpx rgba(224, 122, 95, 0.25);
  transition: opacity 0.2s;
}

.submit-btn:active {
  opacity: 0.85;
}

.submit-btn--disabled {
  opacity: 0.45;
  box-shadow: none;
}

.bottom-spacer {
  height: 40rpx;
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

.fade-up--3 {
  animation-delay: 0.18s;
}
</style>
