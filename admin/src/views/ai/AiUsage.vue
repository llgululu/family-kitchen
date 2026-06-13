<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { aiApi, type AiUsageStats, type AiUsageLog } from '@/api/ai';

const loading = ref(false);
const stats = ref<AiUsageStats | null>(null);
const logs = ref<AiUsageLog[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const days = ref(30);

async function loadStats() {
  try {
    stats.value = await aiApi.getUsageStats(days.value);
  } catch {
    ElMessage.error('加载统计失败');
  }
}

async function loadLogs() {
  loading.value = true;
  try {
    const res = await aiApi.getUsageLogs({ page: page.value, pageSize: pageSize.value });
    logs.value = res.items as AiUsageLog[];
    total.value = res.total;
  } catch {
    ElMessage.error('加载日志失败');
  } finally {
    loading.value = false;
  }
}

function onPageChange(p: number) {
  page.value = p;
  loadLogs();
}

onMounted(() => {
  loadStats();
  loadLogs();
});
</script>

<template>
  <div v-loading="loading" class="page">
    <header class="hero">
      <div class="hero-l">
        <div class="eyebrow">AI · USAGE · ANALYTICS</div>
        <h1 class="hero-title">AI 用量 — <em>统计与监控</em></h1>
      </div>
    </header>

    <!-- 统计卡片 -->
    <div v-if="stats" class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalCalls }}</div>
        <div class="stat-label">总调用次数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalTokens.toLocaleString() }}</div>
        <div class="stat-label">总 Token 消耗</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.avgLatencyMs }}ms</div>
        <div class="stat-label">平均延迟</div>
      </div>
    </div>

    <!-- 功能维度统计 -->
    <div v-if="stats" class="section">
      <h2 class="section-title">功能维度</h2>
      <el-table :data="Object.entries(stats.byFeature).map(([k, v]) => ({ feature: k, ...v }))" stripe>
        <el-table-column prop="feature" label="功能" />
        <el-table-column prop="calls" label="调用次数" width="120" />
        <el-table-column prop="tokens" label="Token 消耗" width="140">
          <template #default="{ row }">{{ row.tokens.toLocaleString() }}</template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 调用日志 -->
    <div class="section">
      <h2 class="section-title">调用日志</h2>
      <el-table :data="logs" stripe>
        <el-table-column prop="feature" label="功能" width="160" />
        <el-table-column prop="provider" label="Provider" width="100" />
        <el-table-column prop="model" label="模型" width="160" />
        <el-table-column prop="totalTokens" label="Token" width="100" />
        <el-table-column prop="latencyMs" label="延迟(ms)" width="100" />
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
      </el-table>
      <div class="pagination">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="onPageChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
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
  font-size: clamp(28px, 3.6vw, 40px);
  line-height: 1.05;
  margin: 0;
  color: var(--ink);
}
.hero-title em {
  font-style: italic;
  font-weight: 400;
  color: var(--persimmon);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.stat-card {
  background: var(--paper-2);
  border: 1px solid var(--rule);
  border-radius: 10px;
  padding: 22px 26px;
  text-align: center;
}
.stat-value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  color: var(--ink);
}
.stat-label {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 6px;
  font-family: var(--font-mono);
  letter-spacing: 0.06em;
}

.section {
  background: var(--paper-2);
  border: 1px solid var(--rule);
  border-radius: 10px;
  padding: 22px 26px;
}
.section-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 18px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 18px;
}
</style>
