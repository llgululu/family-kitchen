<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { adminApi, type AdminFamilySummary, type FamilyQueryParams } from '@/api/admin';
import { FAMILY_STATUS_COLOR, FAMILY_STATUS_LABEL, formatDate } from '@/utils/labels';
import { downloadCsv, type CsvColumn } from '@/utils/export';

const router = useRouter();
const loading = ref(false);
const items = ref<AdminFamilySummary[]>([]);
const total = ref(0);

const query = ref<FamilyQueryParams>({
  page: 1,
  pageSize: 20,
  search: '',
  statuses: [],
});

const statusOptions = [
  { value: 'active', label: '正常' },
  { value: 'dissolving', label: '解散中' },
  { value: 'dissolved', label: '已解散' },
];

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await adminApi.listFamilies({
      page: query.value.page,
      pageSize: query.value.pageSize,
      search: query.value.search || undefined,
      statuses: query.value.statuses?.length ? query.value.statuses : undefined,
    });
    items.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function reset(): void {
  query.value = { page: 1, pageSize: 20, search: '', statuses: [] };
  void load();
}

function goToDetail(row: AdminFamilySummary): void {
  void router.push({ name: 'FamilyDetail', params: { id: row.id } });
}

const csvColumns: CsvColumn<AdminFamilySummary>[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '名称' },
  {
    key: 'status',
    label: '状态',
    formatter: (_r, v) => FAMILY_STATUS_LABEL[v as string] ?? String(v),
  },
  { key: 'memberCount', label: '成员数' },
  { key: 'orderCount', label: '订单数' },
  { key: 'createdAt', label: '创建时间', formatter: (_r, v) => formatDate(v as string) },
];

function handleExport(): void {
  if (items.value.length === 0) return;
  downloadCsv(`families-${Date.now()}.csv`, items.value, csvColumns);
}

onMounted(load);
</script>

<template>
  <div>
    <el-card shadow="never" class="filter-bar">
      <el-form inline @submit.prevent="load">
        <el-form-item label="搜索">
          <el-input
            v-model="query.search"
            placeholder="家庭名 / 邀请码"
            clearable
            style="width: 220px"
            @keyup.enter="load"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="query.statuses"
            multiple
            collapse-tags
            placeholder="全部状态"
            style="width: 220px"
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
      <el-table
        v-loading="loading"
        :data="items"
        stripe
        @row-click="goToDetail"
        style="cursor: pointer"
      >
        <el-table-column prop="id" label="ID" width="220" />
        <el-table-column prop="name" label="家庭名称" min-width="180" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="(FAMILY_STATUS_COLOR[row.status] as any) ?? 'info'" size="small">
              {{ FAMILY_STATUS_LABEL[row.status] ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="memberCount" label="成员数" width="100" align="center" />
        <el-table-column prop="orderCount" label="累计订单" width="100" align="center" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
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
</style>
