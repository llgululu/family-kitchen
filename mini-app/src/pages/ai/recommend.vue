<script setup>
import { ref } from 'vue';
import { aiApi } from '@/api/ai.js';

const loading = ref(false);
const mealTag = ref('');
const preference = ref('');
const recommendations = ref([]);

const mealOptions = [
  { value: '', label: '不限' },
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'midnight', label: '夜宵' },
];

async function recommend() {
  loading.value = true;
  recommendations.value = [];
  try {
    const res = await aiApi.recommend({
      mealTag: mealTag.value || undefined,
      preference: preference.value || undefined,
    });
    recommendations.value = res.recommendations || [];
  } catch (e) {
    uni.showToast({ title: e.message || '推荐失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function goToRecipe(id) {
  if (!id) return;
  uni.navigateTo({ url: `/pages/recipe/detail?id=${id}` });
}

async function saveAsRecipe(item) {
  try {
    await aiApi.saveRecipe({
      name: item.name,
      ingredients: item.ingredients || [],
      steps: [],
      difficulty: 3,
    });
    uni.showToast({ title: '已保存', icon: 'success' });
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' });
  }
}
</script>

<template>
  <view class="page">
    <view class="section">
      <view class="section-title">今天吃什么？</view>
      <view class="filter-row">
        <picker :range="mealOptions" range-key="label" @change="(e) => mealTag = mealOptions[e.detail.value]?.value">
          <view class="picker">{{ mealTag ? mealOptions.find(m => m.value === mealTag)?.label : '不限餐段' }}</view>
        </picker>
      </view>
      <input v-model="preference" class="input" placeholder="描述偏好（可选）" />
      <wd-button type="primary" block :loading="loading" @click="recommend" style="margin-top: 20rpx;">
        {{ loading ? 'AI 推荐中...' : '智能推荐' }}
      </wd-button>
    </view>

    <view v-if="recommendations.length > 0" class="cards">
      <view v-for="(item, i) in recommendations" :key="i" class="card">
        <view class="card-header">
          <text class="card-name">{{ item.name }}</text>
          <text v-if="item.isExistingRecipe" class="card-badge">已有菜谱</text>
          <text v-else class="card-badge new">新菜谱</text>
        </view>
        <text class="card-reason">{{ item.reason }}</text>
        <view class="card-footer">
          <text class="card-score">匹配度 {{ item.matchScore }}%</text>
          <view class="card-actions">
            <wd-button v-if="item.recipeId" size="small" type="primary" plain @click="goToRecipe(item.recipeId)">查看菜谱</wd-button>
            <wd-button v-if="!item.isExistingRecipe" size="small" type="primary" @click="saveAsRecipe(item)">保存</wd-button>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!loading && recommendations.length === 0" class="empty">
      <text class="empty-icon">&#x1F4DA;</text>
      <text class="empty-text">点击上方按钮，AI 为你推荐今日美食</text>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }

.section { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.section-title { font-size: 32rpx; font-weight: 700; color: #333; margin-bottom: 16rpx; }

.filter-row { margin-bottom: 16rpx; }
.picker { background: #f5f5f5; border-radius: 12rpx; padding: 16rpx 24rpx; font-size: 26rpx; color: #666; display: inline-block; }
.input { height: 72rpx; border: 1px solid #e0e0e0; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; margin-top: 12rpx; }

.cards { display: flex; flex-direction: column; gap: 16rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; border: 1px solid #f0f0f0; }
.card-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.card-name { font-size: 30rpx; font-weight: 600; color: #333; }
.card-badge { font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 8rpx; background: #E8F5E9; color: #4CAF50; }
.card-badge.new { background: #FFF3E0; color: #E07A5F; }
.card-reason { font-size: 26rpx; color: #666; line-height: 1.5; display: block; margin-bottom: 12rpx; }
.card-footer { display: flex; justify-content: space-between; align-items: center; }
.card-score { font-size: 22rpx; color: #999; }
.card-actions { display: flex; gap: 12rpx; }

.empty { text-align: center; padding: 80rpx 0; }
.empty-icon { font-size: 80rpx; display: block; margin-bottom: 20rpx; }
.empty-text { font-size: 26rpx; color: #999; }
</style>
