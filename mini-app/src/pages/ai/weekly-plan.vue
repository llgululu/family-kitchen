<script setup>
import { ref } from 'vue';
import { aiApi } from '@/api/ai.js';

const loading = ref(false);
const preference = ref('');
const servings = ref(2);
const plan = ref(null);

async function generate() {
  loading.value = true;
  plan.value = null;
  try {
    const res = await aiApi.weeklyPlan({
      preference: preference.value || undefined,
      servings: servings.value,
    });
    plan.value = res.plan;
  } catch (e) {
    uni.showToast({ title: e.message || '生成失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const mealLabels = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };

function goToRecipe(id) {
  if (!id) return;
  uni.navigateTo({ url: `/pages/recipe/detail?id=${id}` });
}
</script>

<template>
  <view class="page">
    <view class="section">
      <view class="section-title">AI 一周菜单规划</view>
      <input v-model="preference" class="input" placeholder="偏好描述（可选）" />
      <view class="row">
        <text class="label">用餐人数</text>
        <view class="stepper">
          <text class="stepper-btn" @click="servings = Math.max(1, servings - 1)">-</text>
          <text class="stepper-val">{{ servings }}</text>
          <text class="stepper-btn" @click="servings = Math.min(10, servings + 1)">+</text>
        </view>
      </view>
      <wd-button type="primary" block :loading="loading" @click="generate" style="margin-top: 20rpx;">
        {{ loading ? 'AI 规划中...' : '生成一周菜单' }}
      </wd-button>
    </view>

    <view v-if="plan" class="plan">
      <view v-if="plan.balanceScore" class="score-bar">
        <text class="score-label">均衡评分</text>
        <text class="score-value">{{ plan.balanceScore }}/100</text>
      </view>

      <view v-if="plan.days" class="days">
        <view v-for="(day, i) in plan.days" :key="i" class="day-card">
          <text class="day-label">{{ dayLabels[i] || day.day }}</text>
          <view class="meals">
            <view v-for="(meal, key) in day.meals" :key="key" class="meal-row" @click="goToRecipe(meal.recipeId)">
              <text class="meal-type">{{ mealLabels[key] || key }}</text>
              <text class="meal-name">{{ meal.name }}</text>
              <text class="meal-cal">{{ meal.calories }}kcal</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="plan.totalWeekCalories" class="total-bar">
        <text>一周总热量：{{ plan.totalWeekCalories }} kcal</text>
      </view>

      <view v-if="plan.suggestions?.length" class="suggestions">
        <text class="sug-title">规划建议</text>
        <text v-for="(s, i) in plan.suggestions" :key="i" class="sug-item">{{ s }}</text>
      </view>
    </view>

    <view v-if="!loading && !plan" class="empty">
      <text class="empty-icon">&#x1F4C5;</text>
      <text class="empty-text">点击生成按钮，AI 为你规划一周均衡菜单</text>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.section { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.section-title { font-size: 32rpx; font-weight: 700; color: #333; margin-bottom: 16rpx; }
.input { height: 72rpx; border: 1px solid #e0e0e0; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; margin-bottom: 16rpx; }

.row { display: flex; align-items: center; justify-content: space-between; }
.label { font-size: 26rpx; color: #666; }
.stepper { display: flex; align-items: center; gap: 16rpx; }
.stepper-btn { width: 52rpx; height: 52rpx; border-radius: 26rpx; background: #f5f5f5; text-align: center; line-height: 52rpx; font-size: 32rpx; color: #333; }
.stepper-val { font-size: 28rpx; font-weight: 600; min-width: 40rpx; text-align: center; }

.plan { display: flex; flex-direction: column; gap: 16rpx; }
.score-bar { background: #E8F5E9; border-radius: 12rpx; padding: 16rpx 24rpx; display: flex; justify-content: space-between; align-items: center; }
.score-label { font-size: 26rpx; color: #333; }
.score-value { font-size: 30rpx; font-weight: 700; color: #4CAF50; }

.days { display: flex; flex-direction: column; gap: 12rpx; }
.day-card { background: #fff; border-radius: 12rpx; padding: 20rpx; border: 1px solid #f0f0f0; }
.day-label { font-size: 28rpx; font-weight: 700; color: #E07A5F; display: block; margin-bottom: 12rpx; }
.meals { display: flex; flex-direction: column; gap: 8rpx; }
.meal-row { display: flex; align-items: center; gap: 12rpx; padding: 8rpx 0; }
.meal-type { font-size: 22rpx; color: #999; width: 80rpx; }
.meal-name { flex: 1; font-size: 26rpx; color: #333; }
.meal-cal { font-size: 22rpx; color: #999; }

.total-bar { background: #FFF8E1; border-radius: 12rpx; padding: 16rpx 24rpx; font-size: 26rpx; color: #333; text-align: center; }

.suggestions { background: #fff; border-radius: 12rpx; padding: 20rpx; }
.sug-title { font-size: 26rpx; font-weight: 600; color: #555; display: block; margin-bottom: 12rpx; }
.sug-item { font-size: 26rpx; color: #666; line-height: 1.6; display: block; padding: 4rpx 0; }

.empty { text-align: center; padding: 80rpx 0; }
.empty-icon { font-size: 80rpx; display: block; margin-bottom: 20rpx; }
.empty-text { font-size: 26rpx; color: #999; }
</style>
