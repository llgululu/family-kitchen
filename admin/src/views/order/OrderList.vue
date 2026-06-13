<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi, type AdminOrderSummary, type OrderQueryParams } from '@/api/admin';
import { ORDER_STATUS_COLOR, ORDER_STATUS_LABEL, formatDate } from '@/utils/labels';
import { downloadCsv, type CsvColumn } from '@/utils/export';
import { useDefaultAvatar } from '@/composables/useDefaultAvatar';

const router = useRouter();
const { avatarUrl } = useDefaultAvatar();
const loading = ref(false);
const items = ref<AdminOrderSummary[]>([]);
const total = ref(0);

const query = ref<OrderQueryParams>({
  page: 1,
  pageSize: 20,
  statuses: [],
  familyId: '',
});

const statusOptions = Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const activeStatuses = ['pending', 'accepted', 'prepping', 'cooking', 'served'];

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await adminApi.listOrders({
      page: query.value.page,
      pageSize: query.value.pageSize,
      statuses: query.value.statuses?.length ? query.value.statuses : undefined,
      familyId: query.value.familyId || undefined,
    });
    items.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function reset(): void {
  query.value = { page: 1, pageSize: 20, statuses: [], familyId: '' };
  void load();
}

function goToDetail(row: AdminOrderSummary): void {
  void router.push({ name: 'OrderDetail', params: { id: row.id } });
}

async function handleFreeze(row: AdminOrderSummary): Promise<void> {
  let reason = '';
  try {
    const result = await ElMessageBox.prompt('请填写冻结原因', '强制冻结订单', {
      confirmButtonText: '冻结',
      cancelButtonText: '取消',
      type: 'warning',
      inputPlaceholder: '会写入订单 rejectReason，对双方可见',
      inputValidator: (v) => (v && v.length >= 2) || '至少 2 个字符',
    });
    reason = result.value;
  } catch {
    return;
  }
  try {
    await adminApi.freezeOrder(row.id, reason);
    ElMessage.success(`订单 ${row.id} 已冻结`);
    void load();
  } catch {
    // 拦截器已提示
  }
}

function canFreeze(status: string): boolean {
  return activeStatuses.includes(status);
}

const csvColumns: CsvColumn<AdminOrderSummary>[] = [
  { key: 'id', label: 'ID' },
  {
    key: 'status',
    label: '状态',
    formatter: (_r, v) => ORDER_STATUS_LABEL[v as string] ?? String(v),
  },
  { key: 'familyId', label: '家庭 ID' },
  { key: 'customer.nickname', label: '食客' },
  { key: 'chef.nickname', label: '厨师' },
  { key: 'totalLovePoints', label: '爱心币' },
  { key: 'createdAt', label: '创建时间', formatter: (_r, v) => formatDate(v as string) },
  { key: 'completedAt', label: '完成时间', formatter: (_r, v) => formatDate(v as string) },
];

function handleExport(): void {
  if (items.value.length === 0) return;
  downloadCsv(`orders-${Date.now()}.csv`, items.value, csvColumns);
}

onMounted(load);
</script>

<template>
  <div>
    <el-card shadow="never" class="filter-bar">
      <el-form inline @submit.prevent="load">
        <el-form-item label="家庭 ID">
          <el-input
            v-model="query.familyId"
            placeholder="精确匹配 family_id"
            clearable
            style="width: 240px"
            @keyup.enter="load"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="query.statuses"
            multiple
            collapse-tags
            placeholder="全部状态"
            style="width: 280px"
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
        <el-table-column prop="id" label="订单 ID" width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="goToDetail(row)">{{ row.id }}</el-button>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="(ORDER_STATUS_COLOR[row.status] as any) ?? 'info'" size="small">
              {{ ORDER_STATUS_LABEL[row.status] ?? row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="familyId" label="家庭" min-width="200">
          <template #default="{ row }">
            <span class="mono">{{ row.familyId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="食客" min-width="160">
          <template #default="{ row }">
            <el-avatar :size="20" :src="avatarUrl(row.customer?.avatarUrl, row.customer?.gender)" />
            <span style="margin-left: 8px">{{ row.customer?.nickname ?? row.customerUserId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="厨师" min-width="160">
          <template #default="{ row }">
            <el-avatar :size="20" :src="avatarUrl(row.chef?.avatarUrl, row.chef?.gender)" />
            <span style="margin-left: 8px">{{ row.chef?.nickname ?? row.chefUserId }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalLovePoints" label="爱心币" width="90" align="center" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canFreeze(row.status)" link type="danger" @click="handleFreeze(row)">
              冻结
            </el-button>
            <span v-else class="muted">-</span>
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
