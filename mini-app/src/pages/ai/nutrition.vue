<script setup>
import { ref, computed } from 'vue';
import { aiApi } from '@/api/ai.js';
import { recipeApi } from '@/api/recipe.js';

const recipes = ref([]);
const selectedIds = ref([]);
const loading = ref(false);
const analyzing = ref(false);
const analysis = ref(null);

async function loadRecipes() {
  loading.value = true;
  try {
    const res = await recipeApi.list({ pageSize: 50 });
    recipes.value = res.items || [];
  } catch {
    uni.showToast({ title: '加载菜谱失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(id);
}

async function analyze() {
  if (selectedIds.value.length === 0) {
    uni.showToast({ title: '请至少选择一个菜谱', icon: 'none' });
    return;
  }
  analyzing.value = true;
  analysis.value = null;
  try {
    const res = await aiApi.nutritionAnalyze({ recipeIds: selectedIds.value });
    analysis.value = res.analysis;
  } catch (e) {
    uni.showToast({ title: e.message || '分析失败', icon: 'none' });
  } finally {
    analyzing.value = false;
  }
}

loadRecipes();
</script>

<template>
  <view class="page">
    <view class="section">
      <view class="section-title">选择菜谱</view>
      <text class="hint">选择要分析的菜谱（可多选）</text>
      <view class="recipe-list">
        <view
          v-for="r in recipes"
          :key="r.id"
          class="recipe-item"
          :class="{ selected: selectedIds.includes(r.id) }"
          @click="toggleSelect(r.id)"
        >
          <view class="check-box">
            <text v-if="selectedIds.includes(r.id)" class="check-mark">&#10003;</text>
          </view>
          <text class="recipe-name">{{ r.name }}</text>
          <text class="recipe-diff">难度{{ r.difficulty }}</text>
        </view>
      </view>
      <wd-button type="primary" block :loading="analyzing" :disabled="selectedIds.length === 0" @click="analyze" style="margin-top: 20rpx;">
        {{ analyzing ? 'AI 分析中...' : `分析 ${selectedIds.length} 个菜谱` }}
      </wd-button>
    </view>

    <view v-if="analysis" class="result">
      <view class="result-header">
        <text class="result-title">营养分析结果</text>
        <text class="balance-score">均衡评分 {{ analysis.balanceScore }}/100</text>
      </view>

      <view v-if="analysis.recipes" class="nutrition-cards">
        <view v-for="(r, i) in analysis.recipes" :key="i" class="nutrition-card">
          <text class="nc-name">{{ r.name }}</text>
          <view class="nc-grid">
            <view class="nc-item">
              <text class="nc-value">{{ r.calories }}</text>
              <text class="nc-label">热量(kcal)</text>
            </view>
            <view class="nc-item">
              <text class="nc-value">{{ r.protein }}</text>
              <text class="nc-label">蛋白质(g)</text>
            </view>
            <view class="nc-item">
              <text class="nc-value">{{ r.carbs }}</text>
              <text class="nc-label">碳水(g)</text>
            </view>
            <view class="nc-item">
              <text class="nc-value">{{ r.fat }}</text>
              <text class="nc-label">脂肪(g)</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="analysis.totalNutrition" class="total">
        <text class="total-title">总计</text>
        <view class="total-row">
          <text>热量 {{ analysis.totalNutrition.calories }} kcal</text>
          <text>蛋白质 {{ analysis.totalNutrition.protein }}g</text>
          <text>碳水 {{ analysis.totalNutrition.carbs }}g</text>
          <text>脂肪 {{ analysis.totalNutrition.fat }}g</text>
        </view>
      </view>

      <view v-if="analysis.suggestions?.length" class="suggestions">
        <text class="sug-title">营养建议</text>
        <text v-for="(s, i) in analysis.suggestions" :key="i" class="sug-item">{{ s }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }
.section { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: #333; margin-bottom: 8rpx; }
.hint { font-size: 24rpx; color: #999; margin-bottom: 16rpx; display: block; }

.recipe-list { max-height: 600rpx; overflow-y: auto; }
.recipe-item { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; border-bottom: 1px solid #f5f5f5; }
.recipe-item.selected { background: #FFF8E1; margin: 0 -12rpx; padding: 16rpx 12rpx; border-radius: 8rpx; }
.check-box { width: 40rpx; height: 40rpx; border: 2rpx solid #ddd; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; }
.recipe-item.selected .check-box { background: #E07A5F; border-color: #E07A5F; }
.check-mark { color: #fff; font-size: 24rpx; }
.recipe-name { flex: 1; font-size: 28rpx; color: #333; }
.recipe-diff { font-size: 22rpx; color: #999; }

.result { background: #fff; border-radius: 16rpx; padding: 24rpx; border: 1px solid #C8E6C9; }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.result-title { font-size: 30rpx; font-weight: 700; color: #333; }
.balance-score { font-size: 26rpx; font-weight: 600; color: #4CAF50; background: #E8F5E9; padding: 6rpx 16rpx; border-radius: 8rpx; }

.nutrition-cards { display: flex; flex-direction: column; gap: 16rpx; }
.nutrition-card { background: #f9f9f9; border-radius: 12rpx; padding: 20rpx; }
.nc-name { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 12rpx; }
.nc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; }
.nc-item { text-align: center; }
.nc-value { font-size: 28rpx; font-weight: 700; color: #E07A5F; display: block; }
.nc-label { font-size: 20rpx; color: #999; }

.total { margin-top: 20rpx; padding-top: 16rpx; border-top: 1px solid #eee; }
.total-title { font-size: 26rpx; font-weight: 600; color: #555; display: block; margin-bottom: 12rpx; }
.total-row { display: flex; flex-wrap: wrap; gap: 20rpx; font-size: 24rpx; color: #666; }

.suggestions { margin-top: 20rpx; }
.sug-title { font-size: 26rpx; font-weight: 600; color: #555; display: block; margin-bottom: 12rpx; }
.sug-item { font-size: 26rpx; color: #666; line-height: 1.6; display: block; padding: 4rpx 0; }
</style>
