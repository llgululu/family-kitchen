<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { chefLevelApi, type ChefLevelDefinition } from '@/api/chef-level';
import ChefLevelFormDrawer from './ChefLevelFormDrawer.vue';

const loading = ref(false);
const items = ref<ChefLevelDefinition[]>([]);
const total = ref(0);

const drawerVisible = ref(false);
const editingLevel = ref<ChefLevelDefinition | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await chefLevelApi.list();
    items.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function handleCreate(): void {
  editingLevel.value = null;
  drawerVisible.value = true;
}

function handleEdit(level: ChefLevelDefinition): void {
  editingLevel.value = level;
  drawerVisible.value = true;
}

async function handleToggle(level: ChefLevelDefinition): Promise<void> {
  try {
    await chefLevelApi.toggle(level.key);
    ElMessage.success(level.isActive ? '已停用' : '已启用');
    void load();
  } catch {
    // ignore
  }
}

async function handleDelete(level: ChefLevelDefinition): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除等级「${level.title}」？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await chefLevelApi.remove(level.key);
    ElMessage.success('已删除');
    void load();
  } catch {
    // ignore
  }
}

async function handleSeed(): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '确认重新初始化所有厨师等级种子数据？已修改的数据会被覆盖。',
      '种子数据',
      {
        confirmButtonText: '执行',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
    await chefLevelApi.seed();
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
    <el-card shadow="never">
      <div class="card-toolbar">
        <div class="toolbar-left">
          <span class="total-text">共 {{ total }} 个等级</span>
        </div>
        <div class="toolbar-right">
          <el-button @click="handleSeed">初始化种子数据</el-button>
          <el-button type="primary" @click="handleCreate">新增等级</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="items" stripe>
        <el-table-column label="Emoji" width="90" align="center">
          <template #default="{ row }">
            <span class="level-emoji">{{ row.emoji }}</span>
          </template>
        </el-table-column>
        <el-table-column label="名称 / Key" min-width="180">
          <template #default="{ row }">
            <div class="level-title">{{ row.title }}</div>
            <div class="level-key">{{ row.key }}</div>
          </template>
        </el-table-column>
        <el-table-column label="最低订单数" width="120" align="center">
          <template #default="{ row }">
            {{ row.minOrders }}
          </template>
        </el-table-column>
        <el-table-column label="最低评分" width="110" align="center">
          <template #default="{ row }">
            {{ row.minAvgRating }}
          </template>
        </el-table-column>
        <el-table-column label="排序" width="90" align="center" prop="sortOrder" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
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
    </el-card>

    <ChefLevelFormDrawer
      v-model:visible="drawerVisible"
      :level="editingLevel"
      @saved="onDrawerSaved"
    />
  </div>
</template>

<style scoped>
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
.level-emoji {
  font-size: 24px;
}
.level-title {
  font-weight: 600;
}
.level-key {
  font-size: 12px;
  color: #909399;
  font-family: monospace;
}
</style>
