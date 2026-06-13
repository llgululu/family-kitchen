<script setup lang="ts">
import { ref, watch } from 'vue';
import { businessConfigApi, type ChangeLogItem, type GroupKey } from '@/api/business-config';

const props = defineProps<{
  modelValue: boolean;
  groupKey: GroupKey | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
}>();

const loading = ref(false);
const items = ref<ChangeLogItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = props.groupKey
      ? await businessConfigApi.listGroupChanges(props.groupKey, page.value, pageSize)
      : await businessConfigApi.listAllChanges(page.value, pageSize);
    items.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.modelValue, props.groupKey] as const,
  ([open]) => {
    if (open) {
      page.value = 1;
      load();
    }
  },
);

function diffFields(item: ChangeLogItem): Array<{ key: string; oldV: unknown; newV: unknown }> {
  const out: Array<{ key: string; oldV: unknown; newV: unknown }> = [];
  const keys = new Set([...Object.keys(item.oldValue), ...Object.keys(item.newValue)]);
  for (const k of keys) {
    if (JSON.stringify(item.oldValue[k]) !== JSON.stringify(item.newValue[k])) {
      out.push({ key: k, oldV: item.oldValue[k], newV: item.newValue[k] });
    }
  }
  return out;
}

function onPageChange(p: number): void {
  page.value = p;
  load();
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :title="groupKey ? `${groupKey} 变更历史` : '全部变更历史'"
    size="600px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading">
      <el-empty v-if="!items.length" description="暂无变更" />
      <div v-for="it in items" :key="it.id" class="entry">
        <div class="meta">
          <el-tag size="small">{{ it.groupKey }}</el-tag>
          <span class="operator">{{ it.operator?.nickname ?? it.operatorId }}</span>
          <span class="time">{{ new Date(it.createdAt).toLocaleString() }}</span>
        </div>
        <div class="diff">
          <div v-for="d in diffFields(it)" :key="d.key" class="diff-row">
            <code>{{ d.key }}</code>
            :
            <span class="old">{{ JSON.stringify(d.oldV) }}</span>
            <span class="arrow"> → </span>
            <span class="new">{{ JSON.stringify(d.newV) }}</span>
          </div>
        </div>
      </div>
      <el-pagination
        v-if="total > pageSize"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="onPageChange"
      />
    </div>
  </el-drawer>
</template>

<style scoped>
.entry {
  border-bottom: 1px solid #ebeef5;
  padding: 12px 0;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}
.operator {
  font-weight: 500;
}
.time {
  color: #909399;
  margin-left: auto;
}
.diff {
  margin-top: 8px;
  font-size: 13px;
}
.diff-row {
  padding: 2px 0;
}
.diff-row code {
  background: #f5f7fa;
  padding: 1px 4px;
  border-radius: 2px;
}
.old {
  color: #f56c6c;
  text-decoration: line-through;
}
.new {
  color: #67c23a;
  font-weight: 500;
}
.arrow {
  margin: 0 4px;
  color: #909399;
}
</style>
