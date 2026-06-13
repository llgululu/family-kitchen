<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  adminApi,
  type AdminAchievement,
  type AdminFamilyDetail,
  type AdminFamilyLedgerLog,
  type AdminFamilyRecipe,
} from '@/api/admin';
import { useDefaultAvatar } from '@/composables/useDefaultAvatar';
import {
  BADGE_LABEL,
  FAMILY_STATUS_COLOR,
  FAMILY_STATUS_LABEL,
  LOVE_POINT_TYPE_LABEL,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  formatDate,
} from '@/utils/labels';

const route = useRoute();
const router = useRouter();
const { avatarUrl } = useDefaultAvatar();
const familyId = route.params.id as string;

const data = ref<AdminFamilyDetail | null>(null);
const loading = ref(false);
const tab = ref('orders');

const ledger = ref<AdminFamilyLedgerLog[]>([]);
const ledgerTotal = ref(0);
const ledgerLoading = ref(false);
const ledgerQuery = ref({ page: 1, pageSize: 20 });

const recipes = ref<AdminFamilyRecipe[]>([]);
const recipesTotal = ref(0);
const recipesLoading = ref(false);
const recipesQuery = ref({ page: 1, pageSize: 20 });

const achievements = ref<AdminAchievement[]>([]);
const achievementsLoading = ref(false);

async function loadDetail(): Promise<void> {
  loading.value = true;
  try {
    data.value = await adminApi.getFamily(familyId);
  } finally {
    loading.value = false;
  }
}

async function loadLedger(): Promise<void> {
  ledgerLoading.value = true;
  try {
    const res = await adminApi.getFamilyLedger(familyId, ledgerQuery.value);
    ledger.value = res.items;
    ledgerTotal.value = res.total;
  } finally {
    ledgerLoading.value = false;
  }
}

async function loadRecipes(): Promise<void> {
  recipesLoading.value = true;
  try {
    const res = await adminApi.getFamilyRecipes(familyId, recipesQuery.value);
    recipes.value = res.items;
    recipesTotal.value = res.total;
  } finally {
    recipesLoading.value = false;
  }
}

async function loadAchievements(): Promise<void> {
  achievementsLoading.value = true;
  try {
    achievements.value = await adminApi.getFamilyAchievements(familyId);
  } finally {
    achievementsLoading.value = false;
  }
}

function onTabChange(name: string): void {
  if (name === 'ledger' && !ledger.value.length) void loadLedger();
  if (name === 'recipes' && !recipes.value.length) void loadRecipes();
  if (name === 'achievements' && !achievements.value.length) void loadAchievements();
}

function goToOrder(orderId: string): void {
  void router.push({ name: 'OrderDetail', params: { id: orderId } });
}

onMounted(loadDetail);
</script>

<template>
  <div v-loading="loading">
    <el-page-header @back="router.back()">
      <template #content>
        <span v-if="data">{{ data.name }}</span>
      </template>
    </el-page-header>

    <el-descriptions v-if="data" title="基本信息" :column="3" border style="margin-top: 16px">
      <el-descriptions-item label="ID">
        <span class="mono">{{ data.id }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="名称">{{ data.name }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="(FAMILY_STATUS_COLOR[data.status] as any) ?? 'info'" size="small">
          {{ FAMILY_STATUS_LABEL[data.status] ?? data.status }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="成员数">{{ data.memberCount }}</el-descriptions-item>
      <el-descriptions-item label="累计订单">{{ data.orderCount }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">
        {{ formatDate(data.createdAt) }}
      </el-descriptions-item>
    </el-descriptions>

    <el-card v-if="data" shadow="never" style="margin-top: 16px">
      <template #header>成员（{{ data.members.length }}）</template>
      <el-table :data="data.members" stripe>
        <el-table-column label="User ID" width="220">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              class="mono"
              @click="router.push({ name: 'UserDetail', params: { id: row.userId } })"
            >
              {{ row.userId }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="昵称">
          <template #default="{ row }">
            <el-avatar :size="24" :src="avatarUrl(row.avatarUrl, row.gender)" />
            <span style="margin-left: 8px">{{ row.nickname }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'creator' ? 'primary' : 'info'" size="small">
              {{ row.role === 'creator' ? '创建者' : '成员' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="加入时间">
          <template #default="{ row }">{{ formatDate(row.joinedAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="data" shadow="never" style="margin-top: 16px">
      <el-tabs v-model="tab" @tab-change="onTabChange">
        <el-tab-pane label="最近 10 单" name="orders">
          <el-empty v-if="!data.recentOrders.length" description="暂无订单" />
          <el-table
            v-else
            :data="data.recentOrders"
            stripe
            style="cursor: pointer"
            @row-click="(row) => goToOrder(row.id)"
          >
            <el-table-column prop="id" label="订单 ID" width="220" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="(ORDER_STATUS_COLOR[row.status] as any) ?? 'info'" size="small">
                  {{ ORDER_STATUS_LABEL[row.status] ?? row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="爱心币账本" name="ledger">
          <el-table v-loading="ledgerLoading" :data="ledger" stripe>
            <el-table-column label="成员" width="120">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  @click="router.push({ name: 'UserDetail', params: { id: row.userId } })"
                >
                  {{ row.userNickname }}
                </el-button>
              </template>
            </el-table-column>
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
            <el-table-column prop="description" label="描述" min-width="220" />
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
            v-model:current-page="ledgerQuery.page"
            v-model:page-size="ledgerQuery.pageSize"
            :total="ledgerTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            background
            class="pagination"
            @current-change="loadLedger"
            @size-change="loadLedger"
          />
        </el-tab-pane>

        <el-tab-pane label="家庭菜谱" name="recipes">
          <el-table v-loading="recipesLoading" :data="recipes" stripe>
            <el-table-column prop="name" label="菜名" min-width="180">
              <template #default="{ row }">
                <span :class="row.isDeleted ? 'muted' : ''">{{ row.name }}</span>
                <el-tag v-if="row.isDeleted" type="info" size="small" style="margin-left: 8px">
                  已删
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="难度" width="170" align="center">
              <template #default="{ row }">
                <el-rate :model-value="row.difficulty" disabled />
              </template>
            </el-table-column>
            <el-table-column prop="orderCount" label="被点过" width="80" align="center" />
            <el-table-column label="平均分" width="80" align="center">
              <template #default="{ row }">
                {{ row.avgRating != null ? row.avgRating.toFixed(2) : '-' }}
              </template>
            </el-table-column>
            <el-table-column label="更新时间" width="180">
              <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="recipesQuery.page"
            v-model:page-size="recipesQuery.pageSize"
            :total="recipesTotal"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            background
            class="pagination"
            @current-change="loadRecipes"
            @size-change="loadRecipes"
          />
        </el-tab-pane>

        <el-tab-pane label="家庭成就" name="achievements">
          <el-empty
            v-if="!achievementsLoading && !achievements.length"
            description="还没有解锁家庭成就"
          />
          <div v-else v-loading="achievementsLoading" class="badge-grid">
            <el-card v-for="a in achievements" :key="a.id" shadow="hover" class="badge-card">
              <div class="badge-title">{{ BADGE_LABEL[a.badgeKey]?.title ?? a.badgeKey }}</div>
              <div class="badge-desc">{{ BADGE_LABEL[a.badgeKey]?.description ?? '' }}</div>
              <div class="badge-time">{{ formatDate(a.unlockedAt) }}</div>
            </el-card>
          </div>
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
