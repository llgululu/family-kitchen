<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import * as echarts from 'echarts';
import { adminApi, type AnalyticsData } from '@/api/admin';

const data = ref<AnalyticsData | null>(null);
const loading = ref(false);

// chart DOM refs
const dailyOrdersRef = ref<HTMLDivElement>();
const dailyActiveUsersRef = ref<HTMLDivElement>();
const orderStatusRef = ref<HTMLDivElement>();
const ratingDistRef = ref<HTMLDivElement>();
const lovePointsRef = ref<HTMLDivElement>();
const topRecipesRef = ref<HTMLDivElement>();

let instances: echarts.ECharts[] = [];

async function load(): Promise<void> {
  loading.value = true;
  try {
    data.value = await adminApi.analytics();
    renderCharts();
  } catch {
    // intercepted by http
  } finally {
    loading.value = false;
  }
}

function renderCharts(): void {
  if (!data.value) return;
  disposeAll();
  const d = data.value;

  // 1. 订单趋势
  init(dailyOrdersRef.value, {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 16, top: 20, bottom: 32 },
    xAxis: {
      type: 'category',
      data: d.dailyOrders.map((x) => x.date.slice(5)),
      axisLabel: { fontSize: 10, color: '#7A6A5C' },
      axisLine: { lineStyle: { color: '#E3D9C6' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#F1EADC' } },
      axisLabel: { fontSize: 10, color: '#7A6A5C' },
    },
    series: [
      {
        type: 'line',
        data: d.dailyOrders.map((x) => x.count),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#C04A2C', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(192,74,44,0.25)' },
            { offset: 1, color: 'rgba(192,74,44,0.02)' },
          ]),
        },
      },
    ],
  });

  // 2. 活跃用户
  init(dailyActiveUsersRef.value, {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 16, top: 20, bottom: 32 },
    xAxis: {
      type: 'category',
      data: d.dailyActiveUsers.map((x) => x.date.slice(5)),
      axisLabel: { fontSize: 10, color: '#7A6A5C' },
      axisLine: { lineStyle: { color: '#E3D9C6' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#F1EADC' } },
      axisLabel: { fontSize: 10, color: '#7A6A5C' },
    },
    series: [
      {
        type: 'line',
        data: d.dailyActiveUsers.map((x) => x.count),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#6E7A45', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(110,122,69,0.22)' },
            { offset: 1, color: 'rgba(110,122,69,0.02)' },
          ]),
        },
      },
    ],
  });

  // 3. 订单状态分布（环形饼图）
  const statusColors: Record<string, string> = {
    completed: '#6E7A45',
    rated: '#8B9A5E',
    served: '#C04A2C',
    cooking: '#D17856',
    prepping: '#C58A2C',
    accepted: '#E1A84A',
    pending: '#A89884',
    rejected: '#A23A1F',
    cancelled: '#7A6A5C',
    draft: '#E3D9C6',
  };
  init(orderStatusRef.value, {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['42%', '72%'],
        center: ['50%', '50%'],
        label: {
          fontSize: 11,
          color: '#3A322B',
          formatter: '{b}',
        },
        data: d.orderStatusDistribution.map((x) => ({
          name: x.status,
          value: x.count,
          itemStyle: { color: statusColors[x.status] ?? '#A89884' },
        })),
      },
    ],
  });

  // 4. 评分分布（柱状图）
  init(ratingDistRef.value, {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 20, bottom: 32 },
    xAxis: {
      type: 'category',
      data: d.ratingDistribution.map((x) => `${x.stars} 星`),
      axisLabel: { fontSize: 10, color: '#7A6A5C' },
      axisLine: { lineStyle: { color: '#E3D9C6' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#F1EADC' } },
      axisLabel: { fontSize: 10, color: '#7A6A5C' },
    },
    series: [
      {
        type: 'bar',
        data: d.ratingDistribution.map((x) => x.count),
        barWidth: '50%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#C04A2C' },
            { offset: 1, color: '#D17856' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  });

  // 5. 爱心币月度流转
  init(lovePointsRef.value, {
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 16, top: 20, bottom: 32 },
    xAxis: {
      type: 'category',
      data: d.monthlyLovePoints.map((x) => x.month),
      axisLabel: { fontSize: 10, color: '#7A6A5C' },
      axisLine: { lineStyle: { color: '#E3D9C6' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#F1EADC' } },
      axisLabel: { fontSize: 10, color: '#7A6A5C' },
    },
    series: [
      {
        type: 'bar',
        data: d.monthlyLovePoints.map((x) => x.flow),
        barWidth: '45%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#C58A2C' },
            { offset: 1, color: '#E1A84A' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  });

  // 6. 热门菜谱（水平柱状图）
  const recipes = [...d.topRecipes].reverse();
  init(topRecipesRef.value, {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 100, right: 30, top: 12, bottom: 20 },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#F1EADC' } },
      axisLabel: { fontSize: 10, color: '#7A6A5C' },
    },
    yAxis: {
      type: 'category',
      data: recipes.map((x) => x.name),
      axisLabel: { fontSize: 11, color: '#3A322B', width: 80, overflow: 'truncate' },
      axisLine: { lineStyle: { color: '#E3D9C6' } },
    },
    series: [
      {
        type: 'bar',
        data: recipes.map((x) => x.orderCount),
        barWidth: '55%',
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#D17856' },
            { offset: 1, color: '#C04A2C' },
          ]),
          borderRadius: [0, 4, 4, 0],
        },
      },
    ],
  });
}

function init(el: HTMLDivElement | undefined, option: echarts.EChartsOption): void {
  if (!el) return;
  const chart = echarts.init(el);
  chart.setOption(option);
  instances.push(chart);
}

function disposeAll(): void {
  instances.forEach((c) => c.dispose());
  instances = [];
}

function handleResize(): void {
  instances.forEach((c) => c.resize());
}

onMounted(() => {
  void load();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  disposeAll();
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <div v-loading="loading" class="analytics">
    <header class="hero">
      <div class="hero-l">
        <div class="eyebrow">ANALYTICS · 数据分析</div>
        <h1 class="hero-title">运营数据，<em>一目了然</em></h1>
        <p class="hero-sub">六维度图表，展示近 30 天趋势与分布。按需刷新。</p>
      </div>
      <div class="hero-r">
        <button class="snap-btn" @click="load">刷新数据 ↻</button>
      </div>
    </header>

    <div class="rule">
      <span class="rule-no">№ 01</span>
      <span class="rule-mid">CHARTS · 图表</span>
      <span class="rule-cnt">6 组</span>
    </div>

    <div class="grid">
      <article class="chart-card">
        <div class="card-header">
          <span class="card-caption">TREND · 趋势</span>
          <span class="card-title">订单趋势（近 30 天）</span>
        </div>
        <div ref="dailyOrdersRef" class="chart-area" />
      </article>

      <article class="chart-card">
        <div class="card-header">
          <span class="card-caption">USERS · 用户</span>
          <span class="card-title">活跃用户（近 30 天）</span>
        </div>
        <div ref="dailyActiveUsersRef" class="chart-area" />
      </article>

      <article class="chart-card">
        <div class="card-header">
          <span class="card-caption">STATUS · 状态</span>
          <span class="card-title">订单状态分布</span>
        </div>
        <div ref="orderStatusRef" class="chart-area" />
      </article>

      <article class="chart-card">
        <div class="card-header">
          <span class="card-caption">RATING · 评分</span>
          <span class="card-title">评分分布</span>
        </div>
        <div ref="ratingDistRef" class="chart-area" />
      </article>

      <article class="chart-card">
        <div class="card-header">
          <span class="card-caption">LOVE · 爱心币</span>
          <span class="card-title">月度流转（近 6 个月）</span>
        </div>
        <div ref="lovePointsRef" class="chart-area" />
      </article>

      <article class="chart-card">
        <div class="card-header">
          <span class="card-caption">RECIPES · 菜谱</span>
          <span class="card-title">热门菜谱 Top 10</span>
        </div>
        <div ref="topRecipesRef" class="chart-area" />
      </article>
    </div>
  </div>
</template>

<style scoped>
.analytics {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Hero ───────────────────────────────────────────────────────── */
.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 32px;
  padding-bottom: 6px;
}
.hero-l {
  max-width: 640px;
}
.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.26em;
  color: var(--persimmon);
  font-weight: 600;
  margin-bottom: 10px;
}
.hero-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(30px, 4vw, 44px);
  line-height: 1.05;
  letter-spacing: -0.025em;
  margin: 0;
  color: var(--ink);
}
.hero-title em {
  font-style: italic;
  font-weight: 400;
  color: var(--persimmon);
}
.hero-sub {
  margin: 12px 0 0;
  color: var(--ink-3);
  font-size: 14px;
  line-height: 1.6;
}
.hero-r {
  display: flex;
  align-items: flex-end;
}
.snap-btn {
  background: transparent;
  border: 1px solid var(--rule);
  color: var(--ink-2);
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.18s ease;
}
.snap-btn:hover {
  border-color: var(--persimmon);
  color: var(--persimmon);
}

/* ── Rule ───────────────────────────────────────────────────────── */
.rule {
  display: flex;
  align-items: center;
  gap: 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--ink-3);
  text-transform: uppercase;
}
.rule::before,
.rule::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--ink);
  opacity: 0.18;
}
.rule-no {
  color: var(--persimmon);
  font-weight: 600;
}
.rule-mid {
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.22em;
}
.rule-cnt {
  color: var(--ink-3);
}

/* ── Chart grid ─────────────────────────────────────────────────── */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media (max-width: 860px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background: var(--paper-2);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
  overflow: hidden;
  animation: fadein 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  transition: border-color 0.18s ease;
}
.chart-card:hover {
  border-color: var(--ink-4);
}

.card-header {
  padding: 16px 20px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.card-caption {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  color: var(--ink-4);
  text-transform: uppercase;
  font-weight: 600;
}
.card-title {
  font-family: var(--font-display);
  font-size: 15px;
  color: var(--ink-2);
  font-weight: 500;
}

.chart-area {
  width: 100%;
  height: 280px;
}

/* ── Animation ──────────────────────────────────────────────────── */
@keyframes fadein {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
