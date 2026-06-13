<script setup>
import { ref } from 'vue';
import { aiApi } from '@/api/ai.js';

const ingredients = ref([]);
const inputText = ref('');
const mealTag = ref('');
const flavorTag = ref('');
const difficulty = ref(null);
const notes = ref('');
const loading = ref(false);
const recipe = ref(null);
const saving = ref(false);

const mealOptions = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'midnight', label: '夜宵' },
];
const flavorOptions = [
  { value: 'sweet', label: '甜' },
  { value: 'salty', label: '咸' },
  { value: 'spicy', label: '辣' },
  { value: 'mild', label: '清淡' },
];

function addIngredient() {
  const text = inputText.value.trim();
  if (!text) return;
  for (const item of text.split(/[、,，\s]+/)) {
    const t = item.trim();
    if (t && !ingredients.value.includes(t)) {
      ingredients.value.push(t);
    }
  }
  inputText.value = '';
}

function removeIngredient(index) {
  ingredients.value.splice(index, 1);
}

async function generate() {
  if (ingredients.value.length === 0) {
    uni.showToast({ title: '请至少输入一个食材', icon: 'none' });
    return;
  }
  loading.value = true;
  recipe.value = null;
  try {
    const res = await aiApi.generateRecipe({
      ingredients: ingredients.value,
      mealTag: mealTag.value || undefined,
      flavorTag: flavorTag.value || undefined,
      difficulty: difficulty.value || undefined,
      notes: notes.value || undefined,
    });
    recipe.value = res.recipe;
  } catch (e) {
    uni.showToast({ title: e.message || '生成失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function saveRecipe() {
  if (!recipe.value?.name) return;
  saving.value = true;
  try {
    await aiApi.saveRecipe({
      name: recipe.value.name,
      ingredients: recipe.value.ingredients || [],
      steps: recipe.value.steps || [],
      difficulty: recipe.value.difficulty || 3,
      cookingTimeMinutes: recipe.value.cookingTimeMinutes,
      tips: recipe.value.tips,
      mealTags: mealTag.value ? [mealTag.value] : [],
      flavorTags: flavorTag.value ? [flavorTag.value] : [],
    });
    uni.showToast({ title: '已保存到菜谱', icon: 'success' });
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <view class="page">
    <!-- 食材输入 -->
    <view class="section">
      <view class="section-title">食材</view>
      <view class="input-row">
        <input
          v-model="inputText"
          class="input"
          placeholder="输入食材，用空格或逗号分隔"
          confirm-type="done"
          @confirm="addIngredient"
        />
        <wd-button size="small" type="primary" @click="addIngredient">添加</wd-button>
      </view>
      <view class="tags">
        <view v-for="(item, i) in ingredients" :key="i" class="tag">
          {{ item }}
          <text class="tag-close" @click="removeIngredient(i)">&times;</text>
        </view>
      </view>
    </view>

    <!-- 偏好筛选 -->
    <view class="section">
      <view class="section-title">偏好（可选）</view>
      <view class="filter-row">
        <picker :range="mealOptions" range-key="label" @change="(e) => mealTag = mealOptions[e.detail.value]?.value">
          <view class="picker">{{ mealTag ? mealOptions.find(m => m.value === mealTag)?.label : '餐段' }}</view>
        </picker>
        <picker :range="flavorOptions" range-key="label" @change="(e) => flavorTag = flavorOptions[e.detail.value]?.value">
          <view class="picker">{{ flavorTag ? flavorOptions.find(f => f.value === flavorTag)?.label : '口味' }}</view>
        </picker>
        <picker :range="[1,2,3,4,5]" @change="(e) => difficulty = [1,2,3,4,5][e.detail.value]">
          <view class="picker">{{ difficulty ? `难度${difficulty}` : '难度' }}</view>
        </picker>
      </view>
      <input v-model="notes" class="input mt" placeholder="补充说明（可选）" />
    </view>

    <!-- 生成按钮 -->
    <wd-button type="primary" block :loading="loading" :disabled="ingredients.length === 0" @click="generate">
      {{ loading ? 'AI 生成中...' : '生成菜谱' }}
    </wd-button>

    <!-- 生成结果 -->
    <view v-if="recipe" class="result">
      <view class="result-header">
        <text class="result-name">{{ recipe.name }}</text>
        <view class="result-meta">
          <text>难度 {{ recipe.difficulty }}/5</text>
          <text v-if="recipe.cookingTimeMinutes">{{ recipe.cookingTimeMinutes }}分钟</text>
        </view>
      </view>

      <view v-if="recipe.ingredients?.length" class="sub-section">
        <text class="sub-title">食材清单</text>
        <view v-for="(item, i) in recipe.ingredients" :key="i" class="list-item">{{ item }}</view>
      </view>

      <view v-if="recipe.steps?.length" class="sub-section">
        <text class="sub-title">烹饪步骤</text>
        <view v-for="(step, i) in recipe.steps" :key="i" class="list-item step">
          <text class="step-num">{{ i + 1 }}</text>
          <text>{{ step }}</text>
        </view>
      </view>

      <view v-if="recipe.tips?.length" class="sub-section">
        <text class="sub-title">小贴士</text>
        <view v-for="(tip, i) in recipe.tips" :key="i" class="list-item tip">{{ tip }}</view>
      </view>

      <wd-button type="primary" block :loading="saving" @click="saveRecipe" class="save-btn">
        保存到我的菜谱
      </wd-button>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx; display: flex; flex-direction: column; gap: 24rpx; }

.section { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }

.input-row { display: flex; gap: 12rpx; align-items: center; }
.input { flex: 1; height: 72rpx; border: 1px solid #e0e0e0; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; }
.mt { margin-top: 16rpx; }

.tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 16rpx; }
.tag { display: flex; align-items: center; gap: 6rpx; background: #FFF3E0; color: #E07A5F; padding: 8rpx 18rpx; border-radius: 20rpx; font-size: 24rpx; }
.tag-close { font-size: 28rpx; color: #E07A5F; }

.filter-row { display: flex; gap: 16rpx; }
.picker { background: #f5f5f5; border-radius: 12rpx; padding: 16rpx 24rpx; font-size: 26rpx; color: #666; }

.result { background: #fff; border-radius: 16rpx; padding: 24rpx; border: 1px solid #FFE0B2; }
.result-header { margin-bottom: 20rpx; }
.result-name { font-size: 34rpx; font-weight: 700; color: #333; }
.result-meta { display: flex; gap: 20rpx; margin-top: 8rpx; font-size: 24rpx; color: #999; }

.sub-section { margin-top: 20rpx; }
.sub-title { font-size: 26rpx; font-weight: 600; color: #555; margin-bottom: 12rpx; display: block; }
.list-item { font-size: 26rpx; color: #444; padding: 8rpx 0; line-height: 1.6; }

.step { display: flex; gap: 12rpx; align-items: flex-start; }
.step-num { background: #E07A5F; color: #fff; border-radius: 50%; width: 36rpx; height: 36rpx; display: flex; align-items: center; justify-content: center; font-size: 22rpx; flex-shrink: 0; margin-top: 4rpx; }

.tip { color: #888; font-style: italic; }
.save-btn { margin-top: 24rpx; }
</style>
