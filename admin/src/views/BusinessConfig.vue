<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { GROUP_METAS, CONFIG_TABS } from './business-config/field-meta';
import type { GroupMeta } from './business-config/field-meta';
import GroupCard from './business-config/GroupCard.vue';
import ChangeHistoryDrawer from './business-config/ChangeHistoryDrawer.vue';
import { businessConfigApi, type BusinessConfigGroup, type GroupKey } from '@/api/business-config';

const loading = ref(false);
const groups = ref<Record<string, BusinessConfigGroup>>({});
const drawerOpen = ref(false);
const drawerGroupKey = ref<GroupKey | null>(null);
const activeTab = ref('core');

const groupMap = computed(() => {
  const map = new Map<string, GroupMeta>();
  for (const m of GROUP_METAS) map.set(m.groupKey, m);
  return map;
});

const currentMetas = computed<GroupMeta[]>(() => {
  const tab = CONFIG_TABS.find((t) => t.key === activeTab.value);
  if (!tab || tab.key === 'all') return GROUP_METAS;
  return tab.groupKeys.map((k) => groupMap.value.get(k)).filter((m): m is GroupMeta => !!m);
});

const isAllTab = computed(() => activeTab.value === 'all');

async function load(): Promise<void> {
  loading.value = true;
  try {
    const rows = await businessConfigApi.listAll();
    groups.value = Object.fromEntries(rows.map((r) => [r.groupKey, r]));
  } catch {
    ElMessage.error('加载配置失败');
  } finally {
    loading.value = false;
  }
}

function onUpdated(g: BusinessConfigGroup): void {
  groups.value[g.groupKey] = g;
}

function openHistory(g: string): void {
  drawerGroupKey.value = g as GroupKey;
  drawerOpen.value = true;
}

function openAllHistory(): void {
  drawerGroupKey.value = null;
  drawerOpen.value = true;
}

const loadedCount = computed(() => Object.keys(groups.value).length);

onMounted(load);
</script>

<template>
  <div v-loading="loading" class="page">
    <header class="hero">
      <div class="hero-l">
        <div class="eyebrow">CONFIG · 业务配置 · LIVE</div>
        <h1 class="hero-title">运营参数 — <em>随手可调</em></h1>
        <p class="hero-sub">保存即生效，无需重启。所有改动留痕，可在「全部变更历史」复查。</p>
      </div>
      <div class="hero-r">
        <button class="ghost-btn" @click="openAllHistory">全部变更历史 →</button>
      </div>
    </header>

    <div class="rule">
      <span class="rule-no">№ 02</span>
      <span class="rule-mid">GROUPS · 配置组</span>
      <span class="rule-cnt">{{ loadedCount }} / {{ GROUP_METAS.length }}</span>
    </div>

    <el-tabs v-model="activeTab" class="config-tabs">
      <el-tab-pane v-for="tab in CONFIG_TABS" :key="tab.key" :label="tab.label" :name="tab.key">
        <div :class="isAllTab ? 'grid' : 'list'">
          <template v-for="(m, i) in currentMetas" :key="m.groupKey">
            <div
              v-if="groups[m.groupKey]"
              class="card-shell"
              :style="{ animationDelay: `${i * 50}ms` }"
            >
              <GroupCard
                :meta="m"
                :data="groups[m.groupKey]"
                @updated="onUpdated"
                @open-history="openHistory"
              />
            </div>
          </template>
        </div>
      </el-tab-pane>
    </el-tabs>

    <ChangeHistoryDrawer v-model="drawerOpen" :group-key="drawerGroupKey" />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Hero (matches Dashboard) */
.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 32px;
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
  font-size: clamp(28px, 3.6vw, 40px);
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

.ghost-btn {
  background: transparent;
  border: 1px solid var(--rule);
  color: var(--ink-2);
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 12.5px;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.18s ease;
}
.ghost-btn:hover {
  border-color: var(--persimmon);
  color: var(--persimmon);
}

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
  font-family: var(--font-mono);
}

.config-tabs {
  --el-tabs-header-height: 44px;
}
.config-tabs :deep(.el-tabs__nav-wrap::after) {
  background: var(--ink);
  opacity: 0.08;
}
.config-tabs :deep(.el-tabs__item) {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink-2);
}
.config-tabs :deep(.el-tabs__item.is-active) {
  color: var(--persimmon);
  font-weight: 600;
}
.config-tabs :deep(.el-tabs__active-bar) {
  background-color: var(--persimmon);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 14px;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.card-shell {
  animation: fadein 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

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
