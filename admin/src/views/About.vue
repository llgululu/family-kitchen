<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { adminApi } from '@/api/admin';

const dbHealth = ref<{ status: string; latencyMs?: number } | null>(null);
const dbLoading = ref(false);

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const swaggerUrl = `${apiBaseUrl}/api/v1/docs`;

async function checkDb(): Promise<void> {
  dbLoading.value = true;
  try {
    dbHealth.value = await adminApi.healthDb();
  } catch {
    dbHealth.value = { status: 'error' };
  } finally {
    dbLoading.value = false;
  }
}

const dbBadge = computed(() => {
  if (!dbHealth.value) return { text: '检测中', tone: 'muted' };
  if (dbHealth.value.status === 'ok')
    return { text: `正常 · ${dbHealth.value.latencyMs} ms`, tone: 'ok' };
  return { text: '异常', tone: 'err' };
});

onMounted(checkDb);
</script>

<template>
  <div class="about">
    <header class="hero">
      <div class="eyebrow">COLOPHON · 关于</div>
      <h1 class="title">这本备忘录的<em>来由</em>。</h1>
    </header>

    <div class="rule"><span class="rule-no">№ 99</span><span class="rule-mid">SYSTEM</span></div>

    <dl class="meta">
      <div class="row">
        <dt>项目</dt>
        <dd>情侣厨房 · 管理后台</dd>
      </div>
      <div class="row">
        <dt>版本</dt>
        <dd class="mono">MVP v0.1.0</dd>
      </div>
      <div class="row">
        <dt>后端地址</dt>
        <dd class="mono">{{ apiBaseUrl }}</dd>
      </div>
      <div class="row">
        <dt>Swagger</dt>
        <dd><a :href="swaggerUrl" target="_blank">{{ swaggerUrl }} ↗</a></dd>
      </div>
      <div class="row">
        <dt>数据库连接</dt>
        <dd v-loading="dbLoading" class="db-row">
          <span class="badge" :data-tone="dbBadge.tone">{{ dbBadge.text }}</span>
          <button class="link" @click="checkDb">重新检测</button>
        </dd>
      </div>
    </dl>

    <div class="rule"><span class="rule-no">№ 100</span><span class="rule-mid">LIENS · 常用链接</span></div>

    <ul class="links">
      <li>
        <a :href="swaggerUrl" target="_blank">Swagger 接口文档</a>
        <span class="muted">/ API 调试</span>
      </li>
      <li>
        <a href="https://mp.weixin.qq.com/" target="_blank">微信公众平台</a>
        <span class="muted">/ 小程序后台</span>
      </li>
      <li>
        <a href="http://localhost:9001" target="_blank">MinIO 控制台</a>
        <span class="muted">/ 本地对象存储</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.about {
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.hero { display: flex; flex-direction: column; gap: 10px; }
.eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.26em;
  color: var(--persimmon);
  font-weight: 600;
}
.title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(28px, 3.6vw, 40px);
  line-height: 1.05;
  letter-spacing: -0.025em;
  margin: 0;
  color: var(--ink);
}
.title em { font-style: italic; font-weight: 400; color: var(--persimmon); }

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
.rule::before, .rule::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--ink);
  opacity: 0.18;
}
.rule-no { color: var(--persimmon); font-weight: 600; }
.rule-mid { color: var(--ink); font-weight: 600; letter-spacing: 0.22em; }

.meta { margin: 0; padding: 0; display: flex; flex-direction: column; }
.row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 24px;
  padding: 14px 0;
  border-bottom: 1px dotted var(--rule);
}
.row:last-child { border-bottom: none; }
dt {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--ink-3);
  text-transform: uppercase;
  font-weight: 600;
  padding-top: 2px;
}
dd { margin: 0; color: var(--ink); font-size: 14.5px; }
.mono { font-family: var(--font-mono); font-size: 13.5px; color: var(--ink-2); }
.db-row { display: flex; gap: 12px; align-items: center; }
.badge {
  display: inline-block;
  padding: 3px 10px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.05em;
  border-radius: 999px;
  border: 1px solid;
}
.badge[data-tone='ok'] { color: var(--olive); background: var(--olive-bg); border-color: #C9D0A6; }
.badge[data-tone='err'] { color: var(--ember); background: var(--ember-bg); border-color: #E1B2A4; }
.badge[data-tone='muted'] { color: var(--ink-3); background: var(--paper-2); border-color: var(--rule); }
.link {
  background: none;
  border: none;
  color: var(--persimmon);
  font-family: var(--font-body);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}
.link:hover { color: var(--persimmon-2); text-decoration: underline; }

.links {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.links li {
  padding: 10px 14px;
  background: var(--paper-2);
  border: 1px solid var(--rule);
  border-radius: var(--r-sm);
  display: flex;
  gap: 10px;
  align-items: baseline;
  transition: border-color 0.18s ease;
}
.links li:hover { border-color: var(--persimmon); }
.links a { color: var(--ink); font-weight: 500; }
.links a:hover { color: var(--persimmon); }
.muted { color: var(--ink-3); font-size: 13px; font-style: italic; font-family: var(--font-display); }
</style>
