<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { adminApi, type AdminMetrics } from '@/api/admin';

const metrics = ref<AdminMetrics | null>(null);
const loading = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;

async function load(): Promise<void> {
  loading.value = true;
  try {
    metrics.value = await adminApi.metrics();
  } catch {
    // intercepted by http
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
  timer = setInterval(load, 30_000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});

interface Tile {
  key: keyof AdminMetrics;
  label: string;
  caption: string;
  unit?: string;
  formatter?: (v: number) => string;
  highlight?: boolean;
  hint?: string;
}

const tiles: Tile[] = [
  { key: 'totalUsers', label: '注册用户', caption: 'REGISTERED · 累计', unit: '人' },
  { key: 'totalFamilies', label: '家庭空间', caption: 'FAMILIES · 累计', unit: '组' },
  { key: 'activeFamiliesLast7d', label: '七日活跃家庭', caption: 'ACTIVE · 7D', unit: '组' },
  { key: 'todayDau', label: '今日活跃', caption: 'DAU · 今日', unit: '人' },
  { key: 'weeklyOrders', label: '本周完单', caption: 'ORDERS · 7D', unit: '单' },
  {
    key: 'doubleActiveRate',
    label: '双活率',
    caption: '★ POLARIS · 北极星',
    formatter: (v) => `${Math.round(v * 100)}`,
    unit: '%',
    highlight: true,
    hint: '两人都活跃的家庭占比 — 衡量产品价值的核心',
  },
  { key: 'monthlyLovePointVolume', label: '爱心币流转', caption: 'LOVE POINTS · 30D', unit: '枚' },
];

function val(t: Tile): string {
  if (!metrics.value) return '—';
  const raw = metrics.value[t.key] as number;
  if (t.formatter) return t.formatter(raw);
  if (raw >= 10000) return `${(raw / 10000).toFixed(1)}w`;
  return String(raw);
}

const snapshotLabel = computed(() => {
  if (!metrics.value) return '—';
  return new Date(metrics.value.snapshotAt).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
});
</script>

<template>
  <div v-loading="loading" class="dashboard">
    <header class="hero">
      <div class="hero-l">
        <div class="eyebrow">EDITION · {{ new Date().getFullYear() }} / Q{{ Math.ceil((new Date().getMonth() + 1) / 3) }}</div>
        <h1 class="hero-title">今日的小厨房，<em>怎么样</em>？</h1>
        <p class="hero-sub">关键指标每 30 秒自动刷新。本期重点：北极星 · 双活率。</p>
      </div>
      <div class="hero-r">
        <div class="snap-label">SNAPSHOT</div>
        <div class="snap-time">{{ snapshotLabel }}</div>
        <button class="snap-btn" @click="load">手动刷新 ↻</button>
      </div>
    </header>

    <div class="rule">
      <span class="rule-no">№ 01</span>
      <span class="rule-mid">METRICS · 指标</span>
      <span class="rule-cnt">{{ tiles.length }} 项</span>
    </div>

    <div class="grid">
      <article
        v-for="(t, i) in tiles"
        :key="t.key"
        class="tile"
        :class="{ 'tile-hi': t.highlight }"
        :style="{ animationDelay: `${i * 60}ms` }"
      >
        <div class="tile-caption">{{ t.caption }}</div>
        <div class="tile-figure">
          <span class="tile-value">{{ val(t) }}</span>
          <span v-if="t.unit" class="tile-unit">{{ t.unit }}</span>
        </div>
        <div class="tile-label">{{ t.label }}</div>
        <div v-if="t.hint" class="tile-hint">{{ t.hint }}</div>
        <div v-if="t.highlight" class="tile-stamp">CŒUR</div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
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
.hero-l { max-width: 640px; }
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
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.snap-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.24em;
  color: var(--ink-4);
}
.snap-time {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 14px;
  color: var(--ink);
  letter-spacing: 0.04em;
}
.snap-btn {
  margin-top: 8px;
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

/* ── Rule (newspaper-style divider) ─────────────────────────────── */
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
.rule-no { color: var(--persimmon); font-weight: 600; }
.rule-mid { color: var(--ink); font-weight: 600; letter-spacing: 0.22em; }
.rule-cnt { color: var(--ink-3); }

/* ── Tile grid ──────────────────────────────────────────────────── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.tile {
  position: relative;
  padding: 22px 22px 20px;
  background: var(--paper-2);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  animation: fadein 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  transition: border-color 0.18s ease, transform 0.18s ease;
}
.tile:hover {
  border-color: var(--ink-4);
  transform: translateY(-1px);
}
.tile::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(to right, var(--ink) 0%, var(--ink) 35%, transparent 35%);
  opacity: 0.08;
}

.tile-caption {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  color: var(--ink-4);
  text-transform: uppercase;
  font-weight: 600;
}
.tile-figure {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 2px;
}
.tile-value {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 48px;
  line-height: 1;
  color: var(--ink);
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums lining-nums;
}
.tile-unit {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 16px;
  color: var(--ink-3);
}
.tile-label {
  font-family: var(--font-display);
  font-size: 15px;
  color: var(--ink-2);
  font-weight: 500;
}
.tile-hint {
  font-size: 12px;
  color: var(--ink-3);
  line-height: 1.5;
  margin-top: 2px;
}

/* Highlighted (Polaris) tile */
.tile-hi {
  background: linear-gradient(135deg, #2A1F18 0%, #1B1614 100%);
  border-color: var(--ink);
  color: var(--paper);
  grid-column: span 2;
}
@media (max-width: 720px) {
  .tile-hi { grid-column: span 1; }
}
.tile-hi::before {
  background: linear-gradient(to right, var(--persimmon) 0%, var(--persimmon) 35%, transparent 35%);
  opacity: 1;
  height: 3px;
}
.tile-hi .tile-caption { color: var(--persimmon-3); }
.tile-hi .tile-value { color: var(--paper); font-size: 64px; }
.tile-hi .tile-unit { color: var(--persimmon-3); font-size: 22px; }
.tile-hi .tile-label { color: var(--paper); font-style: italic; font-size: 18px; }
.tile-hi .tile-hint { color: rgba(244, 238, 227, 0.65); max-width: 380px; }
.tile-hi:hover { border-color: var(--persimmon); transform: translateY(-1px); }

.tile-stamp {
  position: absolute;
  right: -8px;
  bottom: -10px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 90px;
  line-height: 1;
  color: var(--persimmon);
  opacity: 0.18;
  letter-spacing: -0.04em;
  font-style: italic;
  pointer-events: none;
}

/* ── Animations ─────────────────────────────────────────────────── */
@keyframes fadein {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
