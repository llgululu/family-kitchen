<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import {
  badgeApi,
  BADGE_CATEGORIES,
  TRIGGER_TYPES,
  EVALUATOR_TYPES,
  OWNER_TYPES,
  type BadgeDefinition,
} from '@/api/badge';

const props = defineProps<{
  visible: boolean;
  badge: BadgeDefinition | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'saved'): void;
}>();

const isEdit = computed(() => !!props.badge);
const saving = ref(false);

const showEmojiPicker = ref(false);

const EMOJI_LIST = [
  // 烹饪 & 厨师
  '👨‍🍳',
  '👩‍🍳',
  '🧑‍🍳',
  '🍳',
  '🥘',
  '🍲',
  '🫕',
  '🥣',
  '🍳',
  '🔪',
  '🥢',
  '🍽️',
  '🍴',
  '🧂',
  '🫙',
  '🥡',
  // 食物
  '🍚',
  '🍜',
  '🍝',
  '🥟',
  '🥠',
  '🥮',
  '🥧',
  '🍰',
  '🎂',
  '🧁',
  '🥞',
  '🧇',
  '🍖',
  '🍗',
  '🥩',
  '🦐',
  '🥗',
  '🥑',
  '🧁',
  '🍩',
  '🍪',
  '🍡',
  '🍧',
  '🍨',
  '🍦',
  '🥤',
  // 爱心 & 情侣
  '❤️',
  '💕',
  '💖',
  '💗',
  '💘',
  '💝',
  '💞',
  '💓',
  '💟',
  '😍',
  '🥰',
  '😘',
  '💑',
  '👫',
  '👩‍❤️‍👨',
  '💏',
  // 奖杯 & 勋章
  '🏆',
  '🥇',
  '🥈',
  '🥉',
  '🏅',
  '🎖️',
  '👑',
  '👑',
  '🎯',
  '🎪',
  '🌟',
  '⭐',
  '✨',
  '💫',
  '🌈',
  '🔥',
  // 家庭 & 家
  '🏠',
  '🏡',
  '💕',
  '👨‍👩‍👧',
  '👨‍👩‍👦',
  '👨‍👧',
  '👩‍👧',
  '💍',
  '🎎',
  '🎈',
  '🎁',
  '🎀',
  '🎊',
  '🎉',
  '🧧',
  '🏮',
  // 自然 & 时间
  '☀️',
  '🌅',
  '🌙',
  '🌛',
  '🌕',
  '⭐',
  '🌸',
  '🌺',
  '🌹',
  '🌻',
  '🍀',
  '🍁',
  '❄️',
  '⚡',
  '💧',
  '🔥',
  '💪',
  // 物品 & 工具
  '📝',
  '📖',
  '📚',
  '📋',
  '💬',
  '🗨️',
  '📸',
  '🔔',
  '⏰',
  '📅',
  '🗓️',
  '💰',
  '🏦',
  '💎',
  '🎁',
  '🍬',
  '📮',
  '💌',
  '📮',
  // 手势 & 表情
  '👍',
  '👏',
  '🙌',
  '🤝',
  '🤗',
  '🥳',
  '😎',
  '🧐',
  '😋',
  '🤤',
  '😅',
  '😆',
  '😇',
  '🤩',
  '✍️',
  '🧘',
  // 节日
  '🎄',
  '🎅',
  '🎃',
  '🥚',
  '🌸',
  '🎋',
  '🎑',
  '🐉',
  '🧨',
];

const form = ref({
  key: '',
  title: '',
  description: '',
  emoji: '',
  category: 'chef',
  ownerType: 'user',
  triggerType: 'order_rated',
  evaluatorType: 'count',
  evaluatorConfig: '{}',
  hidden: false,
  progressTarget: null as number | null,
  sortOrder: 0,
});

watch(
  () => props.visible,
  (val) => {
    if (!val) {
      showEmojiPicker.value = false;
    }
    if (val) {
      if (props.badge) {
        form.value = {
          key: props.badge.key,
          title: props.badge.title,
          description: props.badge.description,
          emoji: props.badge.emoji,
          category: props.badge.category,
          ownerType: props.badge.ownerType,
          triggerType: props.badge.triggerType,
          evaluatorType: props.badge.evaluatorType,
          evaluatorConfig: JSON.stringify(props.badge.evaluatorConfig, null, 2),
          hidden: props.badge.hidden,
          progressTarget: props.badge.progressTarget,
          sortOrder: props.badge.sortOrder,
        };
      } else {
        form.value = {
          key: '',
          title: '',
          description: '',
          emoji: '',
          category: 'chef',
          ownerType: 'user',
          triggerType: 'order_rated',
          evaluatorType: 'count',
          evaluatorConfig: '{}',
          hidden: false,
          progressTarget: null,
          sortOrder: 0,
        };
      }
    }
  },
);

async function handleSave(): Promise<void> {
  if (!form.value.key && !isEdit.value) {
    ElMessage.warning('请填写 Badge Key');
    return;
  }
  if (!form.value.title) {
    ElMessage.warning('请填写名称');
    return;
  }

  let configObj: Record<string, unknown>;
  try {
    configObj = JSON.parse(form.value.evaluatorConfig || '{}');
  } catch {
    ElMessage.error('评估器配置 JSON 格式错误');
    return;
  }

  saving.value = true;
  try {
    if (isEdit.value) {
      await badgeApi.update(props.badge!.key, {
        title: form.value.title,
        description: form.value.description,
        emoji: form.value.emoji,
        category: form.value.category,
        ownerType: form.value.ownerType,
        triggerType: form.value.triggerType,
        evaluatorType: form.value.evaluatorType,
        evaluatorConfig: configObj,
        hidden: form.value.hidden,
        progressTarget: form.value.progressTarget,
        sortOrder: form.value.sortOrder,
      });
      ElMessage.success('更新成功');
    } else {
      await badgeApi.create({
        key: form.value.key,
        title: form.value.title,
        description: form.value.description,
        emoji: form.value.emoji,
        category: form.value.category,
        ownerType: form.value.ownerType,
        triggerType: form.value.triggerType,
        evaluatorType: form.value.evaluatorType,
        evaluatorConfig: configObj,
        hidden: form.value.hidden,
        progressTarget: form.value.progressTarget,
        sortOrder: form.value.sortOrder,
      });
      ElMessage.success('创建成功');
    }
    emit('saved');
  } finally {
    saving.value = false;
  }
}

function handleClose(): void {
  emit('update:visible', false);
}
</script>

<template>
  <el-drawer
    :model-value="visible"
    :title="isEdit ? '编辑成就' : '新增成就'"
    direction="rtl"
    size="560px"
    @close="handleClose"
  >
    <el-form label-position="top" class="badge-form">
      <div class="form-section">基础信息</div>

      <el-form-item label="Badge Key" v-if="!isEdit">
        <el-input v-model="form.key" placeholder="如 chef_first_dish（唯一标识，创建后不可修改）" />
      </el-form-item>
      <el-form-item v-else label="Badge Key">
        <el-input :model-value="form.key" disabled />
      </el-form-item>

      <el-form-item label="名称">
        <el-input v-model="form.title" placeholder="如 厨师初体验" maxlength="30" />
      </el-form-item>

      <el-form-item label="描述">
        <el-input v-model="form.description" placeholder="如 做出人生第一道菜" maxlength="100" />
      </el-form-item>

      <el-form-item label="Emoji">
        <el-popover
          :visible="showEmojiPicker"
          placement="bottom-start"
          :width="420"
          trigger="click"
        >
          <template #reference>
            <div class="emoji-trigger" @click="showEmojiPicker = !showEmojiPicker">
              <span v-if="form.emoji" class="emoji-preview">{{ form.emoji }}</span>
              <span v-else class="emoji-placeholder">点击选择</span>
              <el-icon class="emoji-arrow"><arrow-down /></el-icon>
            </div>
          </template>
          <div class="emoji-picker">
            <div class="emoji-grid">
              <span
                v-for="e in EMOJI_LIST"
                :key="e"
                class="emoji-item"
                :class="{ active: form.emoji === e }"
                @click="
                  form.emoji = e;
                  showEmojiPicker = false;
                "
                >{{ e }}</span
              >
            </div>
          </div>
        </el-popover>
      </el-form-item>

      <el-form-item label="分类">
        <el-select v-model="form.category">
          <el-option
            v-for="c in BADGE_CATEGORIES"
            :key="c.value"
            :label="c.label"
            :value="c.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Owner 维度">
        <el-select v-model="form.ownerType">
          <el-option v-for="o in OWNER_TYPES" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="是否隐藏彩蛋">
        <el-switch v-model="form.hidden" />
      </el-form-item>

      <div class="form-section">规则配置</div>

      <el-form-item label="触发类型">
        <el-select v-model="form.triggerType">
          <el-option v-for="t in TRIGGER_TYPES" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="评估器类型">
        <el-select v-model="form.evaluatorType">
          <el-option
            v-for="e in EVALUATOR_TYPES"
            :key="e.value"
            :label="e.label"
            :value="e.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="评估器参数 (JSON)">
        <el-input
          v-model="form.evaluatorConfig"
          type="textarea"
          :rows="8"
          placeholder='如 { "model": "order", "scopeBy": "chefUserId", "threshold": 10 }'
        />
      </el-form-item>

      <div class="form-section">展示设置</div>

      <el-form-item label="进度目标值（null 表示无进度条）">
        <el-input-number v-model="form.progressTarget" :min="1" :step="1" clearable />
      </el-form-item>

      <el-form-item label="排序权重">
        <el-input-number v-model="form.sortOrder" :min="0" :step="10" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>
  </el-drawer>
</template>

<style scoped>
.badge-form {
  padding: 0 8px;
}
.form-section {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  margin: 20px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
.form-section:first-child {
  margin-top: 0;
}

/* Emoji Picker */
.emoji-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  min-width: 120px;
  height: 32px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.emoji-trigger:hover {
  border-color: #409eff;
}
.emoji-preview {
  font-size: 20px;
  line-height: 1;
}
.emoji-placeholder {
  font-size: 13px;
  color: #a8abb2;
}
.emoji-arrow {
  margin-left: auto;
  color: #a8abb2;
  font-size: 12px;
}
.emoji-picker {
  max-height: 260px;
  overflow-y: auto;
}
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}
.emoji-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.emoji-item:hover {
  background: #f0f2f5;
}
.emoji-item.active {
  background: #ecf5ff;
  box-shadow: 0 0 0 2px #409eff;
}
</style>
