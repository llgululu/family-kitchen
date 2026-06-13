<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { Edit, Clock } from '@element-plus/icons-vue';
import type { GroupMeta } from './field-meta';
import { businessConfigApi, type BusinessConfigGroup } from '@/api/business-config';

const props = defineProps<{
  meta: GroupMeta;
  data: BusinessConfigGroup;
}>();

const emit = defineEmits<{
  (e: 'updated', value: BusinessConfigGroup): void;
  (e: 'open-history', groupKey: string): void;
}>();

const editing = ref(false);
const saving = ref(false);
const form = reactive<Record<string, unknown>>({});

function startEdit(): void {
  for (const f of props.meta.fields) {
    form[f.key] = (props.data.value as Record<string, unknown>)[f.key];
  }
  editing.value = true;
}

function cancelEdit(): void {
  editing.value = false;
}

async function save(): Promise<void> {
  for (const f of props.meta.fields) {
    const v = form[f.key];
    if (f.type === 'int') {
      if (typeof v !== 'number' || !Number.isInteger(v)) {
        ElMessage.error(`${f.label} 必须为整数`);
        return;
      }
      if (f.min !== undefined && v < f.min) {
        ElMessage.error(`${f.label} 不能小于 ${f.min}`);
        return;
      }
      if (f.max !== undefined && v > f.max) {
        ElMessage.error(`${f.label} 不能大于 ${f.max}`);
        return;
      }
    } else {
      if (typeof v !== 'string' || !v) {
        ElMessage.error(`${f.label} 不能为空`);
        return;
      }
      if (f.pattern && !f.pattern.test(v)) {
        ElMessage.error(`${f.label} 格式不正确`);
        return;
      }
    }
  }

  saving.value = true;
  try {
    const res = await businessConfigApi.update(props.meta.groupKey, { ...form });
    ElMessage.success('保存成功，已即时生效');
    emit('updated', { ...props.data, value: res.value, updatedAt: new Date().toISOString() });
    editing.value = false;
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data
      ?.message;
    ElMessage.error(Array.isArray(msg) ? msg.join('; ') : msg ?? '保存失败');
  } finally {
    saving.value = false;
  }
}

const displayValue = computed(() => props.data.value as Record<string, unknown>);
</script>

<template>
  <el-card shadow="never" class="group-card">
    <template #header>
      <div class="header">
        <span class="title">{{ meta.title }}</span>
        <div class="actions">
          <el-button text :icon="Clock" size="small" @click="emit('open-history', meta.groupKey)">
            历史
          </el-button>
          <el-button v-if="!editing" text :icon="Edit" size="small" @click="startEdit">编辑</el-button>
          <template v-else>
            <el-button size="small" @click="cancelEdit">取消</el-button>
            <el-button type="primary" size="small" :loading="saving" @click="save">保存</el-button>
          </template>
        </div>
      </div>
    </template>

    <p v-if="meta.crossNote" class="cross-note">{{ meta.crossNote }}</p>

    <el-form v-if="editing" label-width="160px" label-position="right">
      <el-form-item v-for="f in meta.fields" :key="f.key" :label="f.label">
        <el-input-number
          v-if="f.type === 'int'"
          v-model="(form[f.key] as number)"
          :disabled="f.readonly"
          :min="f.min"
          :max="f.max"
          controls-position="right"
          style="width: 200px"
        />
        <el-input
          v-else
          v-model="(form[f.key] as string)"
          :disabled="f.readonly"
          maxlength="128"
          show-word-limit
          style="width: 320px"
        />
        <span v-if="f.unit" class="unit">{{ f.unit }}</span>
        <span v-if="f.hint" class="hint">（{{ f.hint }}）</span>
      </el-form-item>
    </el-form>

    <el-descriptions v-else :column="1" border>
      <el-descriptions-item v-for="f in meta.fields" :key="f.key" :label="f.label">
        <span class="value">
          {{ displayValue[f.key] ?? '—' }}
          <template v-if="f.unit"> {{ f.unit }}</template>
        </span>
        <span v-if="f.type === 'string' && !displayValue[f.key]" class="missing">未配置</span>
        <span v-if="f.hint" class="hint">（{{ f.hint }}）</span>
        <el-tag v-if="f.readonly" size="small" type="info" style="margin-left: 8px">锁定</el-tag>
      </el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<style scoped>
.group-card {
  margin-bottom: 16px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title {
  font-weight: 600;
}
.cross-note {
  color: #909399;
  font-size: 12px;
  margin: 0 0 12px 0;
}
.value {
  font-weight: 600;
  color: #303133;
}
.hint {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}
.unit {
  color: #606266;
  font-size: 13px;
  margin-left: 4px;
}
.missing {
  color: #f56c6c;
  margin-left: 8px;
  font-size: 12px;
}
</style>
