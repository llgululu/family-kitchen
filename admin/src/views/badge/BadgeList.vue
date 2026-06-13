<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  badgeApi,
  BADGE_CATEGORIES,
  TRIGGER_TYPES,
  EVALUATOR_TYPES,
  type BadgeDefinition,
} from '@/api/badge';
import { formatDate } from '@/utils/labels';
import BadgeFormDrawer from './BadgeFormDrawer.vue';

const loading = ref(false);
const items = ref<BadgeDefinition[]>([]);
const total = ref(0);

const query = ref({
  page: 1,
  pageSize: 20,
  category: '' as string,
  isActive: undefined as boolean | undefined,
  search: '',
});

const drawerVisible = ref(false);
const editingBadge = ref<BadgeDefinition | null>(null);

const categoryMap = Object.fromEntries(BADGE_CATEGORIES.map((c) => [c.value, c.label]));
const triggerMap = Object.fromEntries(TRIGGER_TYPES.map((t) => [t.value, t.label]));
const evaluatorMap = Object.fromEntries(EVALUATOR_TYPES.map((e) => [e.value, e.label]));

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await badgeApi.list({
      page: query.value.page,
      pageSize: query.value.pageSize,
      category: query.value.category || undefined,
      isActive: query.value.isActive,
      search: query.value.search || undefined,
    });
    items.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function reset(): void {
  query.value = { page: 1, pageSize: 20, category: '', isActive: undefined, search: '' };
  void load();
}

function handleCreate(): void {
  editingBadge.value = null;
  drawerVisible.value = true;
}

function handleEdit(badge: BadgeDefinition): void {
  editingBadge.value = badge;
  drawerVisible.value = true;
}

async function handleToggle(badge: BadgeDefinition): Promise<void> {
  try {
    await badgeApi.toggle(badge.key);
    ElMessage.success(badge.isActive ? '已停用' : '已启用');
    void load();
  } catch {
    // ignore
  }
}

async function handleDelete(badge: BadgeDefinition): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除徽章「${badge.title}」？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await badgeApi.remove(badge.key);
    ElMessage.success('已删除');
    void load();
  } catch {
    // ignore
  }
}

async function handleSeed(): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '确认重新初始化所有徽章种子数据？已修改的数据会被覆盖。',
      '种子数据',
      {
        confirmButtonText: '执行',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
    await badgeApi.seed();
    ElMessage.success('种子数据初始化完成');
    void load();
  } catch {
    // ignore
  }
}

function onDrawerSaved(): void {
  drawerVisible.value = false;
  void load();
}

onMounted(load);
</script>

<template>
  <div>
    <el-card shadow="never" class="filter-bar">
      <el-form inline @submit.prevent="load">
        <el-form-item label="分类">
          <el-select v-model="query.category" placeholder="全部分类" clearable style="width: 150px">
            <el-option
              v-for="c in BADGE_CATEGORIES"
              :key="c.value"
              :label="c.label"
              :value="c.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.isActive" placeholder="全部" clearable style="width: 120px">
            <el-option label="启用" :value="true" />
            <el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="搜索">
          <el-input v-model="query.search" placeholder="名称/Key" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <div class="card-toolbar">
        <div class="toolbar-left">
          <span class="total-text">共 {{ total }} 个徽章</span>
        </div>
        <div class="toolbar-right">
          <el-button @click="handleSeed">初始化种子数据</el-button>
          <el-button type="primary" @click="handleCreate">新增成就</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="items" stripe>
        <el-table-column label="Emoji" width="90" align="center">
          <template #default="{ row }">
            <span class="badge-emoji">{{ row.emoji }}</span>
          </template>
        </el-table-column>
        <el-table-column label="名称 / Key" min-width="180">
          <template #default="{ row }">
            <div class="badge-title">{{ row.title }}</div>
            <div class="badge-key">{{ row.key }}</div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            {{ categoryMap[row.category] ?? row.category }}
          </template>
        </el-table-column>
        <el-table-column label="触发类型" width="130">
          <template #default="{ row }">
            {{ triggerMap[row.triggerType] ?? row.triggerType }}
          </template>
        </el-table-column>
        <el-table-column label="评估器" width="110">
          <template #default="{ row }">
            {{ evaluatorMap[row.evaluatorType] ?? row.evaluatorType }}
          </template>
        </el-table-column>
        <el-table-column label="维度" width="90" align="center">
          <template #default="{ row }">
            {{ row.ownerType === 'user' ? '用户' : '家庭' }}
          </template>
        </el-table-column>
        <el-table-column label="隐藏" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.hidden" type="warning" size="small">彩蛋</el-tag>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="解锁数" width="100" align="center">
          <template #default="{ row }">
            <span :class="{ muted: row.unlockCount === 0 }">{{ row.unlockCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="排序" width="90" align="center" prop="sortOrder" />
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link :type="row.isActive ? 'warning' : 'success'" @click="handleToggle(row)">
              {{ row.isActive ? '停用' : '启用' }}
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
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

    <BadgeFormDrawer v-model:visible="drawerVisible" :badge="editingBadge" @saved="onDrawerSaved" />
  </div>
</template>

<style scoped>
.filter-bar {
  margin-bottom: 16px;
}
.filter-bar :deep(.el-form-item) {
  margin-bottom: 0;
}
.card-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.total-text {
  font-size: 13px;
  color: #909399;
}
.badge-emoji {
  font-size: 24px;
}
.badge-title {
  font-weight: 600;
}
.badge-key {
  font-size: 12px;
  color: #909399;
  font-family: monospace;
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.muted {
  color: #c0c4cc;
}
</style>
