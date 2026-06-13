<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi, type AdminFeedback, type FeedbackQueryParams } from '@/api/admin';
import { FEEDBACK_STATUS_COLOR, FEEDBACK_STATUS_LABEL, formatDate } from '@/utils/labels';
import { downloadCsv, type CsvColumn } from '@/utils/export';

const loading = ref(false);
const items = ref<AdminFeedback[]>([]);
const total = ref(0);

const query = ref<FeedbackQueryParams>({
  page: 1,
  pageSize: 20,
  statuses: [],
});

const statusOptions = Object.entries(FEEDBACK_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}));

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await adminApi.listFeedback({
      page: query.value.page,
      pageSize: query.value.pageSize,
      statuses: query.value.statuses?.length ? query.value.statuses : undefined,
    });
    items.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function reset(): void {
  query.value = { page: 1, pageSize: 20, statuses: [] };
  void load();
}

async function updateStatus(item: AdminFeedback, status: string): Promise<void> {
  try {
    await adminApi.updateFeedbackStatus(item.id, status);
    ElMessage.success('状态已更新');
    void load();
  } catch {
    // ignore
  }
}

const csvColumns: CsvColumn<AdminFeedback>[] = [
  { key: 'id', label: 'ID' },
  {
    key: 'status',
    label: '状态',
    formatter: (_r, v) => FEEDBACK_STATUS_LABEL[v as string] ?? String(v),
  },
  { key: 'content', label: '内容' },
  { key: 'contact', label: '联系方式' },
  { key: 'platform', label: '平台' },
  { key: 'appVersion', label: '版本' },
  { key: 'userId', label: '用户' },
  { key: 'createdAt', label: '提交时间', formatter: (_r, v) => formatDate(v as string) },
];

function handleExport(): void {
  if (items.value.length === 0) return;
  downloadCsv(`feedback-${Date.now()}.csv`, items.value, csvColumns);
}

onMounted(load);
</script>

<template>
  <div>
    <el-card shadow="never" class="filter-bar">
      <el-form inline @submit.prevent="load">
        <el-form-item label="状态">
          <el-select
            v-model="query.statuses"
            multiple
            collapse-tags
            placeholder="全部状态"
            style="width: 240px"
          >
            <el-option
              v-for="o in statusOptions"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
          <el-button @click="reset">重置</el-button>
          <el-button :disabled="!items.length" @click="handleExport"> 导出 CSV </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="items" stripe>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="(FEEDBACK_STATUS_COLOR[row.status] as any) ?? 'info'" size="small">
              {{ FEEDBACK_STATUS_LABEL[row.status] ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="320" show-overflow-tooltip />
        <el-table-column prop="contact" label="联系方式" width="200">
          <template #default="{ row }">
            <span v-if="row.contact">{{ row.contact }}</span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="platform" label="平台" width="120">
          <template #default="{ row }">
            {{ row.platform ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="appVersion" label="版本" width="100">
          <template #default="{ row }">
            {{ row.appVersion ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="userId" label="用户" min-width="200">
          <template #default="{ row }">
            <span v-if="row.userId" class="mono">{{ row.userId }}</span>
            <span v-else class="muted">匿名</span>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-dropdown @command="(cmd: string) => updateStatus(row, cmd)">
              <el-button link type="primary">
                改状态<el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="pending" :disabled="row.status === 'pending'">
                    待处理
                  </el-dropdown-item>
                  <el-dropdown-item command="processed" :disabled="row.status === 'processed'">
                    已处理
                  </el-dropdown-item>
                  <el-dropdown-item command="closed" :disabled="row.status === 'closed'">
                    已关闭
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        class="pagination"
        @current-change="load"
        @size-change="load"
      />
    </el-card>
  </div>
</template>

<style scoped>
.filter-bar {
  margin-bottom: 16px;
}
.filter-bar :deep(.el-form-item) {
  margin-bottom: 0;
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.mono {
  font-family: monospace;
  font-size: 12px;
  color: #606266;
}
.muted {
  color: #c0c4cc;
}
</style>
