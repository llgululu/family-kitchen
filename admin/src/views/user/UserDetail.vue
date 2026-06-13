<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  adminApi,
  type AdminAchievement,
  type AdminOrderSummary,
  type AdminUserDetail,
  type AdminUserLovePointLog,
} from '@/api/admin';
import { useDefaultAvatar } from '@/composables/useDefaultAvatar';
import {
  BADGE_LABEL,
  LOVE_POINT_TYPE_LABEL,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  formatDate,
} from '@/utils/labels';

const route = useRoute();
const router = useRouter();
const { avatarUrl } = useDefaultAvatar();
const userId = route.params.id as string;

const data = ref<AdminUserDetail | null>(null);
const loading = ref(false);
const tab = ref('logs');

// logs
const logs = ref<AdminUserLovePointLog[]>([]);
const logsTotal = ref(0);
const logsLoading = ref(false);
const logsQuery = ref({ page: 1, pageSize: 20 });

// achievements
const achievements = ref<AdminAchievement[]>([]);
const achievementsLoading = ref(false);

// orders
const orders = ref<AdminOrderSummary[]>([]);
const ordersTotal = ref(0);
const ordersLoading = ref(false);
const ordersQuery = ref({ page: 1, pageSize: 20 });

async function loadDetail(): Promise<void> {
  loading.value = true;
  try {
    data.value = await adminApi.getUser(userId);
  } finally {
    loading.value = false;
  }
}

async function loadLogs(): Promise<void> {
  logsLoading.value = true;
  try {
    const res = await adminApi.getUserLovePointLogs(userId, logsQuery.value);
    logs.value = res.items;
    logsTotal.value = res.total;
  } finally {
    logsLoading.value = false;
  }
}

async function loadAchievements(): Promise<void> {
  achievementsLoading.value = true;
  try {
    achievements.value = await adminApi.getUserAchievements(userId);
  } finally {
    achievementsLoading.value = false;
  }
}

async function loadOrders(): Promise<void> {
  ordersLoading.value = true;
  try {
    const res = await adminApi.getUserOrders(userId, ordersQuery.value);
    orders.value = res.items;
    ordersTotal.value = res.total;
  } finally {
    ordersLoading.value = false;
  }
}

function onTabChange(name: string): void {
  if (name === 'logs' && !logs.value.length) void loadLogs();
  if (name === 'achievements' && !achievements.value.length) void loadAchievements();
  if (name === 'orders' && !orders.value.length) void loadOrders();
}

onMounted(async () => {
  await loadDetail();
  void loadLogs(); // 默认 tab 是 logs
});
</script>

<template>
  <div v-loading="loading">
    <el-page-header @back="router.back()">
      <template #content>
        <span v-if="data">{{ data.nickname }}</span>
      </template>
    </el-page-header>

    <el-descriptions v-if="data" title="用户信息" :column="3" border style="margin-top: 16px">
      <el-descriptions-item label="ID">
        <span class="mono">{{ data.id }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="昵称">
        <el-avatar :size="24" :src="avatarUrl(data.avatarUrl, data.gender)" />
        <span style="margin-left: 8px">{{ data.nickname }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="性别">
        <template v-if="data.gender">
          {{ data.gender === 'male' ? '男' : data.gender === 'female' ? '女' : data.gender }}
        </template>
        <span v-else class="muted">未设置</span>
      </el-descriptions-item>
      <el-descriptions-item label="手机号">
        <span v-if="data.phone" class="mono">{{ data.phone }}</span>
        <span v-else class="muted">未绑定</span>
      </el-descriptions-item>
      <el-descriptions-item label="个人签名">
        {{ data.signature || '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="所属家庭">
        <el-button
          v-if="data.currentFamilyId"
          link
          type="primary"
          @click="router.push({ name: 'FamilyDetail', params: { id: data.currentFamilyId } })"
        >
          {{ data.currentFamilyId }}
        </el-button>
        <span v-else class="muted">未加入</span>
      </el-descriptions-item>
      <el-descriptions-item label="爱心币余额">
        <span class="lp">{{ data.lovePointBalance }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="累计订单">{{ data.orderCount }}</el-descriptions-item>
      <el-descriptions-item label="解锁徽章数">{{ data.achievementCount }}</el-descriptions-item>
      <el-descriptions-item label="账号状态">
        <el-tag v-if="data.deletedAt" type="danger" size="small">已注销</el-tag>
        <el-tag v-else type="success" size="small">正常</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="注册时间" :span="2">
        {{ formatDate(data.createdAt) }}
      </el-descriptions-item>
    </el-descriptions>

    <el-card v-if="data" shadow="never" style="margin-top: 16px">
      <el-tabs v-model="tab" @tab-change="onTabChange">
        <el-tab-pane label="爱心币流水" name="logs">
          <el-table v-loading="logsLoading" :data="logs" stripe>
            <el-table-column label="类型" width="120">
              <template #default="{ row }">
                {{ LOVE_POINT_TYPE_LABEL[row.changeType] ?? row.changeType }}
              </template>
            </el-table-column>
            <el-table-column label="变动" width="100" align="right">
              <template #default="{ row }">
                <span :class="row.changeAmount >= 0 ? 'positive' : 'negative'">
                  {{ row.changeAmount >= 0 ? '+' : '' }}{{ row.changeAmount }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="balanceAfter" label="余额" width="100" align="right" />
            <el-table-column prop="description" label="描述" min-width="220" />
            <el-table-column label="关联订单" width="220">
              <template #default="{ row }">
                <el-button
                  v-if="row.sourceOrderId"
                  link
                  type="primary"
                  class="mono"
                  @click="router.push({ name: 'OrderDetail', params: { id: row.sourceOrderId } })"
                >
                  {{ row.sourceOrderId }}
                </el-button>
                <span v-else class="muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="撤回" width="80" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.isReversed" type="warning" size="small">已撤回</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="180">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="logsQuery.page"
            v-model:page-size="logsQuery.pageSize"
            :total="logsTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            background
            class="pagination"
            @current-change="loadLogs"
            @size-change="loadLogs"
          />
        </el-tab-pane>

        <el-tab-pane label="解锁徽章" name="achievements">
          <el-empty
            v-if="!achievementsLoading && !achievements.length"
            description="还没有解锁任何徽章"
          />
          <div v-else v-loading="achievementsLoading" class="badge-grid">
            <el-card v-for="a in achievements" :key="a.id" shadow="hover" class="badge-card">
              <div class="badge-title">{{ BADGE_LABEL[a.badgeKey]?.title ?? a.badgeKey }}</div>
              <div class="badge-desc">{{ BADGE_LABEL[a.badgeKey]?.description ?? '' }}</div>
              <div class="badge-time">{{ formatDate(a.unlockedAt) }}</div>
            </el-card>
          </div>
        </el-tab-pane>

        <el-tab-pane label="参与的订单" name="orders">
          <el-table v-loading="ordersLoading" :data="orders" stripe>
            <el-table-column prop="id" label="订单 ID" width="220">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  @click="router.push({ name: 'OrderDetail', params: { id: row.id } })"
                >
                  {{ row.id }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column label="角色" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="row.roleInOrder === 'chef' ? 'primary' : 'success'">
                  {{ row.roleInOrder === 'chef' ? '厨师' : '食客' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="(ORDER_STATUS_COLOR[row.status] as any) ?? 'info'" size="small">
                  {{ ORDER_STATUS_LABEL[row.status] ?? row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="totalLovePoints" label="爱心币" width="90" align="center" />
            <el-table-column label="创建时间" width="180">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="ordersQuery.page"
            v-model:page-size="ordersQuery.pageSize"
            :total="ordersTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            background
            class="pagination"
            @current-change="loadOrders"
            @size-change="loadOrders"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.mono {
  font-family: monospace;
  font-size: 12px;
}
.muted {
  color: #c0c4cc;
}
.lp {
  color: #ff6b9d;
  font-weight: 600;
}
.positive {
  color: #67c23a;
}
.negative {
  color: #f56c6c;
}
.pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.badge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.badge-card {
  padding: 4px;
}
.badge-title {
  font-size: 16px;
  font-weight: 600;
  color: #ff6b9d;
}
.badge-desc {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
}
.badge-time {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 8px;
}
</style>
