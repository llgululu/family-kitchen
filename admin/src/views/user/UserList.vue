<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { adminApi, type AdminUserSummary, type UserQueryParams } from '@/api/admin';
import { formatDate } from '@/utils/labels';
import { useDefaultAvatar } from '@/composables/useDefaultAvatar';
import { downloadCsv, type CsvColumn } from '@/utils/export';

const router = useRouter();
const { avatarUrl } = useDefaultAvatar();
const loading = ref(false);
const items = ref<AdminUserSummary[]>([]);
const total = ref(0);

const query = ref<UserQueryParams>({
  page: 1,
  pageSize: 20,
  search: '',
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await adminApi.listUsers({
      page: query.value.page,
      pageSize: query.value.pageSize,
      search: query.value.search || undefined,
    });
    items.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function reset(): void {
  query.value = { page: 1, pageSize: 20, search: '' };
  void load();
}

function goToDetail(row: AdminUserSummary): void {
  void router.push({ name: 'UserDetail', params: { id: row.id } });
}

const csvColumns: CsvColumn<AdminUserSummary>[] = [
  { key: 'id', label: 'ID' },
  { key: 'nickname', label: '昵称' },
  { key: 'currentFamilyId', label: '所属家庭' },
  { key: 'orderCount', label: '订单数' },
  { key: 'createdAt', label: '注册时间', formatter: (_r, v) => formatDate(v as string) },
];

function handleExport(): void {
  if (items.value.length === 0) return;
  downloadCsv(`users-${Date.now()}.csv`, items.value, csvColumns);
}

onMounted(load);
</script>

<template>
  <div>
    <el-card shadow="never" class="filter-bar">
      <el-form inline @submit.prevent="load">
        <el-form-item label="昵称">
          <el-input
            v-model="query.search"
            placeholder="按昵称搜索"
            clearable
            style="width: 220px"
            @keyup.enter="load"
          />
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
        <el-table-column label="昵称">
          <template #default="{ row }">
            <el-avatar :size="24" :src="avatarUrl(row.avatarUrl, row.gender)" />
            <span style="margin-left: 8px">{{ row.nickname }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="currentFamilyId" label="所属家庭" min-width="220">
          <template #default="{ row }">
            <span v-if="row.currentFamilyId" class="mono">{{ row.currentFamilyId }}</span>
            <span v-else class="muted">未加入</span>
          </template>
        </el-table-column>
        <el-table-column prop="orderCount" label="累计订单" width="100" align="center" />
        <el-table-column label="注册时间" width="180">
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
.mono {
  font-family: monospace;
  font-size: 12px;
  color: #606266;
}
.muted {
  color: #c0c4cc;
}
</style>
