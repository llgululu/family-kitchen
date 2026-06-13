<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi, type AdminOrderDetail, type AdminOrderMessage } from '@/api/admin';
import {
  ORDER_MESSAGE_TYPE_LABEL,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  formatDate,
} from '@/utils/labels';

const route = useRoute();
const router = useRouter();
const data = ref<AdminOrderDetail | null>(null);
const messages = ref<AdminOrderMessage[]>([]);
const loading = ref(false);

const activeStatuses = ['pending', 'accepted', 'prepping', 'cooking', 'served'];
const canFreeze = computed(() => data.value && activeStatuses.includes(data.value.status));

async function load(): Promise<void> {
  const id = route.params.id as string;
  loading.value = true;
  try {
    const [detail, msgs] = await Promise.all([
      adminApi.getOrder(id),
      adminApi.getOrderMessages(id),
    ]);
    data.value = detail;
    messages.value = msgs;
  } finally {
    loading.value = false;
  }
}

async function handleFreeze(): Promise<void> {
  if (!data.value) return;
  let reason = '';
  try {
    const result = await ElMessageBox.prompt('请填写冻结原因', '强制冻结订单', {
      confirmButtonText: '冻结',
      cancelButtonText: '取消',
      type: 'warning',
      inputValidator: (v) => (v && v.length >= 2) || '至少 2 个字符',
    });
    reason = result.value;
  } catch {
    return;
  }
  try {
    await adminApi.freezeOrder(data.value.id, reason);
    ElMessage.success('已冻结');
    void load();
  } catch {
    // ignore
  }
}

function recipeName(snapshot: Record<string, unknown>): string {
  return typeof snapshot.name === 'string' ? snapshot.name : '未命名';
}

function recipeDifficulty(snapshot: Record<string, unknown>): number {
  return typeof snapshot.difficulty === 'number' ? snapshot.difficulty : 0;
}

function messageBody(msg: AdminOrderMessage): string {
  const c = msg.content;
  switch (msg.type) {
    case 'text':
      return String(c.text ?? '');
    case 'emoji':
      return `😀 ${String(c.emojiKey ?? '')}`;
    case 'image':
      return String(c.imageUrl ?? '');
    case 'rush':
      return '催菜！';
    case 'tip':
      return `打赏 ${String(c.amount ?? '?')} 爱心币${c.title ? `（${c.title as string}）` : ''}`;
    case 'system':
      return JSON.stringify(c);
    default:
      return JSON.stringify(c);
  }
}

function senderLabel(msg: AdminOrderMessage): string {
  if (!msg.senderUserId) return '系统';
  if (!data.value) return msg.senderNickname ?? '?';
  const role = msg.senderUserId === data.value.customerUserId ? '食客' : '厨师';
  return `${msg.senderNickname ?? '?'}（${role}）`;
}

onMounted(load);
</script>

<template>
  <div v-loading="loading">
    <el-page-header @back="router.back()">
      <template #content>订单详情</template>
      <template #extra>
        <el-button v-if="canFreeze" type="danger" @click="handleFreeze"> 强制冻结 </el-button>
      </template>
    </el-page-header>

    <el-descriptions v-if="data" title="基本信息" :column="3" border style="margin-top: 16px">
      <el-descriptions-item label="订单 ID">
        <span class="mono">{{ data.id }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="(ORDER_STATUS_COLOR[data.status] as any) ?? 'info'" size="small">
          {{ ORDER_STATUS_LABEL[data.status] ?? data.status }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="爱心币">{{ data.totalLovePoints }}</el-descriptions-item>
      <el-descriptions-item label="家庭">
        <el-button
          link
          type="primary"
          @click="router.push({ name: 'FamilyDetail', params: { id: data.familyId } })"
        >
          {{ data.familyId }}
        </el-button>
      </el-descriptions-item>
      <el-descriptions-item label="食客">
        <el-button
          link
          type="primary"
          @click="router.push({ name: 'UserDetail', params: { id: data.customerUserId } })"
        >
          {{ data.customer?.nickname ?? data.customerUserId }}
        </el-button>
      </el-descriptions-item>
      <el-descriptions-item label="厨师">
        <el-button
          link
          type="primary"
          @click="router.push({ name: 'UserDetail', params: { id: data.chefUserId } })"
        >
          {{ data.chef?.nickname ?? data.chefUserId }}
        </el-button>
      </el-descriptions-item>
      <el-descriptions-item label="食客备注">
        {{ data.customerNotes || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="拒绝/取消原因">
        {{ data.rejectReason || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="期望上菜时间">
        {{ formatDate(data.expectedServeAt) }}
      </el-descriptions-item>
      <el-descriptions-item label="上菜时间">
        {{ formatDate(data.servedAt) }}
      </el-descriptions-item>
      <el-descriptions-item label="完成时间">
        {{ formatDate(data.completedAt) }}
      </el-descriptions-item>
      <el-descriptions-item label="创建时间">
        {{ formatDate(data.createdAt) }}
      </el-descriptions-item>
    </el-descriptions>

    <el-card v-if="data" shadow="never" style="margin-top: 16px">
      <template #header>菜品（{{ data.items.length }}）</template>
      <el-table :data="data.items" stripe>
        <el-table-column label="菜名" min-width="180">
          <template #default="{ row }">
            {{ recipeName(row.recipeSnapshot) }}
          </template>
        </el-table-column>
        <el-table-column label="难度" width="170" align="center">
          <template #default="{ row }">
            <el-rate :model-value="recipeDifficulty(row.recipeSnapshot)" disabled />
          </template>
        </el-table-column>
        <el-table-column prop="customNotes" label="定制备注" min-width="180">
          <template #default="{ row }">
            {{ row.customNotes || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="recipeId" label="菜谱引用" min-width="220">
          <template #default="{ row }">
            <span v-if="row.recipeId" class="mono">{{ row.recipeId }}</span>
            <span v-else class="muted">已删除</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="data && data.servedImageUrls.length" shadow="never" style="margin-top: 16px">
      <template #header>上菜成品图（{{ data.servedImageUrls.length }}）</template>
      <div class="image-grid">
        <el-image
          v-for="url in data.servedImageUrls"
          :key="url"
          :src="url"
          :preview-src-list="data.servedImageUrls"
          fit="cover"
          class="served-image"
        />
      </div>
    </el-card>

    <el-card v-if="data?.rating" shadow="never" style="margin-top: 16px">
      <template #header>食客评价</template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="评分">
          <el-rate :model-value="data.rating.stars" disabled show-score />
        </el-descriptions-item>
        <el-descriptions-item label="评价时间">
          {{ formatDate(data.rating.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="文字评价" :span="2">
          {{ data.rating.comment || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="是否自动评价">
          <el-tag v-if="data.rating.isAutoGenerated" type="warning" size="small">
            超时自动 5 星
          </el-tag>
          <span v-else>否</span>
        </el-descriptions-item>
        <el-descriptions-item label="图片">
          <span v-if="!data.rating.imageUrls.length" class="muted">无</span>
          <div v-else class="image-grid">
            <el-image
              v-for="url in data.rating.imageUrls"
              :key="url"
              :src="url"
              :preview-src-list="data.rating.imageUrls"
              fit="cover"
              class="served-image small"
            />
          </div>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" style="margin-top: 16px">
      <template #header>消息流（{{ messages.length }}）</template>
      <el-empty v-if="!messages.length" description="暂无消息" />
      <div v-else class="message-list">
        <div v-for="msg in messages" :key="msg.id" class="message-row">
          <div class="message-meta">
            <el-tag size="small" type="info">
              {{ ORDER_MESSAGE_TYPE_LABEL[msg.type] ?? msg.type }}
            </el-tag>
            <span class="sender">{{ senderLabel(msg) }}</span>
            <span class="muted">{{ formatDate(msg.createdAt) }}</span>
          </div>
          <div class="message-body">
            <el-image
              v-if="msg.type === 'image'"
              :src="messageBody(msg)"
              :preview-src-list="[messageBody(msg)]"
              fit="cover"
              class="served-image small"
            />
            <span v-else>{{ messageBody(msg) }}</span>
          </div>
        </div>
      </div>
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
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.served-image {
  width: 160px;
  height: 160px;
  border-radius: 8px;
}
.served-image.small {
  width: 80px;
  height: 80px;
}
.message-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.message-row {
  padding: 8px 12px;
  border-radius: 6px;
  background: #f5f7fa;
}
.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.sender {
  font-weight: 500;
  color: #303133;
}
.message-body {
  margin-top: 4px;
  color: #303133;
  word-break: break-all;
}
</style>
