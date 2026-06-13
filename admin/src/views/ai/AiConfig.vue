<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { aiApi, type AiConfig } from '@/api/ai';

const loading = ref(false);
const saving = ref(false);
const testing = ref(false);
const config = ref<AiConfig>({
  PROVIDER: 'deepseek',
  DEEPSEEK_MODEL: 'deepseek-chat',
  OPENAI_MODEL: 'gpt-4o-mini',
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  CLAUDE_MODEL: 'claude-sonnet-4-6-20250514',
  TEMPERATURE: 0.7,
  MAX_TOKENS: 2048,
  FEATURE_RECIPE_GENERATION_ENABLED: true,
  FEATURE_SMART_RECOMMEND_ENABLED: true,
  FEATURE_COOKING_ASSISTANT_ENABLED: true,
  FEATURE_NUTRITION_ANALYSIS_ENABLED: true,
  FEATURE_WEEKLY_PLAN_ENABLED: true,
  RATE_LIMIT_RECIPE_GENERATION_PER_DAY: 50,
  RATE_LIMIT_SMART_RECOMMEND_PER_DAY: 50,
  RATE_LIMIT_COOKING_ASSISTANT_PER_DAY: 100,
  RATE_LIMIT_NUTRITION_ANALYSIS_PER_DAY: 50,
  RATE_LIMIT_WEEKLY_PLAN_PER_DAY: 20,
});

const providerOptions = [
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Claude' },
];

const testResult = ref<{ ok: boolean; model: string } | null>(null);

async function load() {
  loading.value = true;
  try {
    config.value = await aiApi.getConfig();
  } catch {
    ElMessage.error('加载 AI 配置失败');
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    await aiApi.updateConfig(config.value, 'admin');
    ElMessage.success('AI 配置已保存');
  } catch {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function testConnection() {
  testing.value = true;
  testResult.value = null;
  try {
    testResult.value = await aiApi.testConnection(config.value.PROVIDER);
    if (testResult.value.ok) {
      ElMessage.success(`连接成功！模型: ${testResult.value.model}`);
    } else {
      ElMessage.error('连接失败，请检查 API Key 配置');
    }
  } catch {
    ElMessage.error('连接测试失败');
  } finally {
    testing.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div v-loading="loading" class="page">
    <header class="hero">
      <div class="hero-l">
        <div class="eyebrow">AI · 智能配置 · LIVE</div>
        <h1 class="hero-title">AI 参数 — <em>模型与开关</em></h1>
        <p class="hero-sub">配置 AI Provider、API Key（环境变量）、功能开关与速率限制。</p>
      </div>
      <div class="hero-r">
        <button class="ghost-btn" :disabled="testing" @click="testConnection">
          {{ testing ? '测试中...' : '测试连接' }}
        </button>
      </div>
    </header>

    <div v-if="testResult" class="test-result" :class="{ success: testResult.ok, fail: !testResult.ok }">
      {{ testResult.ok ? `连接成功 · 模型: ${testResult.model}` : '连接失败 · 请检查 API Key 环境变量' }}
    </div>

    <!-- Provider 配置 -->
    <section class="section">
      <h2 class="section-title">Provider 配置</h2>
      <div class="form-grid">
        <div class="form-item">
          <label>当前 Provider</label>
          <el-select v-model="config.PROVIDER">
            <el-option v-for="p in providerOptions" :key="p.value" :value="p.value" :label="p.label" />
          </el-select>
        </div>
        <div class="form-item">
          <label>DeepSeek 模型</label>
          <el-input v-model="config.DEEPSEEK_MODEL" />
        </div>
        <div class="form-item">
          <label>OpenAI 模型</label>
          <el-input v-model="config.OPENAI_MODEL" />
        </div>
        <div class="form-item">
          <label>OpenAI Base URL</label>
          <el-input v-model="config.OPENAI_BASE_URL" />
        </div>
        <div class="form-item">
          <label>Claude 模型</label>
          <el-input v-model="config.CLAUDE_MODEL" />
        </div>
        <div class="form-item">
          <label>温度 (0-2)</label>
          <el-input-number v-model="config.TEMPERATURE" :min="0" :max="2" :step="0.1" />
        </div>
        <div class="form-item">
          <label>最大 Token</label>
          <el-input-number v-model="config.MAX_TOKENS" :min="100" :max="8192" :step="100" />
        </div>
      </div>
      <p class="hint">API Key 通过环境变量 DEEPSEEK_API_KEY / OPENAI_API_KEY / CLAUDE_API_KEY 配置，此处不可查看。</p>
    </section>

    <!-- 功能开关 -->
    <section class="section">
      <h2 class="section-title">功能开关</h2>
      <div class="switch-grid">
        <div class="switch-item">
          <el-switch v-model="config.FEATURE_RECIPE_GENERATION_ENABLED" />
          <span>菜谱生成</span>
        </div>
        <div class="switch-item">
          <el-switch v-model="config.FEATURE_SMART_RECOMMEND_ENABLED" />
          <span>智能推荐</span>
        </div>
        <div class="switch-item">
          <el-switch v-model="config.FEATURE_COOKING_ASSISTANT_ENABLED" />
          <span>厨艺助手</span>
        </div>
        <div class="switch-item">
          <el-switch v-model="config.FEATURE_NUTRITION_ANALYSIS_ENABLED" />
          <span>营养分析</span>
        </div>
        <div class="switch-item">
          <el-switch v-model="config.FEATURE_WEEKLY_PLAN_ENABLED" />
          <span>一周菜单</span>
        </div>
      </div>
    </section>

    <!-- 速率限制 -->
    <section class="section">
      <h2 class="section-title">速率限制（每日上限）</h2>
      <div class="form-grid">
        <div class="form-item">
          <label>菜谱生成</label>
          <el-input-number v-model="config.RATE_LIMIT_RECIPE_GENERATION_PER_DAY" :min="1" :max="1000" />
        </div>
        <div class="form-item">
          <label>智能推荐</label>
          <el-input-number v-model="config.RATE_LIMIT_SMART_RECOMMEND_PER_DAY" :min="1" :max="1000" />
        </div>
        <div class="form-item">
          <label>厨艺助手</label>
          <el-input-number v-model="config.RATE_LIMIT_COOKING_ASSISTANT_PER_DAY" :min="1" :max="1000" />
        </div>
        <div class="form-item">
          <label>营养分析</label>
          <el-input-number v-model="config.RATE_LIMIT_NUTRITION_ANALYSIS_PER_DAY" :min="1" :max="1000" />
        </div>
        <div class="form-item">
          <label>一周菜单</label>
          <el-input-number v-model="config.RATE_LIMIT_WEEKLY_PLAN_PER_DAY" :min="1" :max="1000" />
        </div>
      </div>
    </section>

    <div class="actions">
      <el-button type="primary" :loading="saving" @click="save">保存配置</el-button>
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
  gap: 32px;
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
.ghost-btn:hover { border-color: var(--persimmon); color: var(--persimmon); }
.ghost-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.test-result {
  padding: 12px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-family: var(--font-mono);
}
.test-result.success { background: #f0f9eb; color: #67c23a; border: 1px solid #e1f3d8; }
.test-result.fail { background: #fef0f0; color: #f56c6c; border: 1px solid #fde2e2; }

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

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-item label {
  font-size: 12px;
  color: var(--ink-3);
  font-family: var(--font-mono);
  letter-spacing: 0.06em;
}

.switch-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.switch-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--ink);
}

.hint {
  margin-top: 14px;
  font-size: 12px;
  color: var(--ink-3);
  font-style: italic;
}

.actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}
</style>
