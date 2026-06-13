<template>
  <view class="page">
    <view class="header">
      <wd-icon name="calendar" size="40rpx" color="#fff" />
      <text class="hero">{{ summary?.month || '本月' }} 月度回顾</text>
    </view>

    <view v-if="summary" class="metrics">
      <view class="metric">
        <text class="value">{{ summary.totalOrders }}</text>
        <text class="label">完成菜数</text>
      </view>
      <view class="metric">
        <text class="value">{{
          summary.avgRating != null ? summary.avgRating.toFixed(1) : '-'
        }}</text>
        <text class="label">平均评分</text>
      </view>
      <view class="metric">
        <text class="value">{{ summary.totalLovePoints }}</text>
        <text class="label">爱心币</text>
      </view>
    </view>

    <view v-if="summary?.topRecipes.length" class="card">
      <view class="card-title">
        <wd-icon name="goods" size="28rpx" color="#6B6560" /> 最常做的菜
      </view>
      <canvas
        id="topRecipesChart"
        canvas-id="topRecipesChart"
        type="2d"
        class="chart-canvas top-recipes-chart"
      />
    </view>

    <view v-if="summary?.contributors.length" class="card">
      <view class="card-title">
        <wd-icon name="user" size="28rpx" color="#6B6560" /> 谁更辛苦
      </view>
      <canvas
        id="contributorsChart"
        canvas-id="contributorsChart"
        type="2d"
        class="chart-canvas contributors-chart"
      />
    </view>

    <view v-if="summary?.unlockedBadgeKeys.length" class="card">
      <view class="card-title">
        <wd-icon name="star" size="28rpx" color="#6B6560" /> 本月解锁徽章
      </view>
      <view class="badges">
        <view v-for="k in summary.unlockedBadgeKeys" :key="k" class="badge">
          <text class="emoji">{{ BADGE_LABEL[k]?.emoji || '🏅' }}</text>
          <text class="title">{{ BADGE_LABEL[k]?.title || k }}</text>
        </view>
      </view>
    </view>

    <view v-if="!summary || summary.totalOrders === 0" class="empty muted"> 本月还没有点单 </view>
  </view>
</template>

<script>
import { timelineApi } from '@/api/timeline.js';
import { BADGE_LABEL } from '@/utils/labels.js';
import uCharts from '@qiun/ucharts';

export default {
  data() {
    return { BADGE_LABEL, summary: null, charts: {} };
  },
  onLoad() {
    this.load();
  },
  methods: {
    async load() {
      try {
        this.summary = await timelineApi.monthlySummary();
        this.$nextTick(() => {
          setTimeout(() => this.drawCharts(), 150);
        });
      } catch {
        // ignore
      }
    },
    drawCharts() {
      if (this.summary?.topRecipes.length) {
        this.drawTopRecipes();
      }
      if (this.summary?.contributors.length) {
        this.drawContributors();
      }
    },
    drawTopRecipes() {
      const query = uni.createSelectorQuery().in(this);
      query
        .select('#topRecipesChart')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) return;
          const { node: canvas, width, height } = res[0];
          const dpr = uni.getSystemInfoSync().pixelRatio;
          canvas.width = width * dpr;
          canvas.height = height * dpr;

          const recipes = this.summary.topRecipes.slice(0, 5);
          this.charts.topRecipes = new uCharts({
            type: 'bar',
            canvas,
            canvas2d: true,
            context: canvas.getContext('2d'),
            width: width * dpr,
            height: height * dpr,
            pixelRatio: dpr,
            fontSize: 11,
            categories: recipes.map((r) => r.recipeName),
            series: [{ name: '次数', data: recipes.map((r) => r.count) }],
            animation: true,
            padding: [15, 20, 0, 0],
            dataLabel: true,
            legend: { show: false },
            yAxis: {
              disabled: false,
              axisLine: false,
              gridType: 'dash',
              splitNumber: 2,
            },
            xAxis: { disabled: false, axisLine: false },
            color: ['#e07a5f'],
            extra: {
              bar: {
                type: 'group',
                width: 20,
                seriesGap: 4,
                categoryGap: 8,
                activeBgOpacity: 0.08,
              },
            },
          });
        });
    },
    drawContributors() {
      const query = uni.createSelectorQuery().in(this);
      query
        .select('#contributorsChart')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) return;
          const { node: canvas, width, height } = res[0];
          const dpr = uni.getSystemInfoSync().pixelRatio;
          canvas.width = width * dpr;
          canvas.height = height * dpr;

          const contributors = this.summary.contributors;
          this.charts.contributors = new uCharts({
            type: 'column',
            canvas,
            canvas2d: true,
            context: canvas.getContext('2d'),
            width: width * dpr,
            height: height * dpr,
            pixelRatio: dpr,
            fontSize: 11,
            categories: contributors.map((c) => c.nickname),
            series: [
              { name: '做菜', data: contributors.map((c) => c.cookedCount) },
              { name: '点菜', data: contributors.map((c) => c.orderedCount) },
            ],
            animation: true,
            padding: [15, 15, 0, 0],
            dataLabel: true,
            legend: { show: true, position: 'bottom', lineHeight: 20 },
            yAxis: {
              disabled: false,
              axisLine: false,
              gridType: 'dash',
              splitNumber: 3,
            },
            xAxis: { disabled: false, axisLine: false },
            color: ['#e07a5f', '#6b8fa8'],
            extra: {
              column: {
                type: 'group',
                width: 30,
                seriesGap: 4,
                categoryGap: 20,
                activeBgOpacity: 0.08,
              },
            },
          });
        });
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}
.header {
  background: linear-gradient(135deg, #e07a5f 0%, #f0a08c 100%);
  color: #fff;
  border-radius: 16rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.hero {
  font-size: 44rpx;
  font-weight: 600;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.metric {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 0;
  text-align: center;
}
.value {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #e07a5f;
}
.label {
  font-size: 24rpx;
  color: #8e8580;
  margin-top: 4rpx;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.chart-canvas {
  width: 100%;
}
.top-recipes-chart {
  height: 350rpx;
}
.contributors-chart {
  height: 280rpx;
}
.badges {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}
.badge {
  background: #fff0eb;
  border-radius: 12rpx;
  padding: 16rpx 0;
  text-align: center;
}
.emoji {
  display: block;
  font-size: 48rpx;
}
.title {
  font-size: 22rpx;
  color: #6b6560;
}
.muted {
  color: #8e8580;
  font-size: 24rpx;
}
.empty {
  text-align: center;
  padding: 160rpx 0;
}
</style>
