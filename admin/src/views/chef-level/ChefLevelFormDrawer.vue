<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { chefLevelApi, type ChefLevelDefinition } from '@/api/chef-level';

const props = defineProps<{
  visible: boolean;
  level: ChefLevelDefinition | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'saved'): void;
}>();

const isEdit = computed(() => !!props.level);
const saving = ref(false);
const showEmojiPicker = ref(false);

const EMOJI_LIST = [
  '🧑',
  '👨‍🍳',
  '👩‍🍳',
  '🧑‍🍳',
  '🍳',
  '🥘',
  '🍲',
  '🫕',
  '🥇',
  '🥈',
  '🥉',
  '🏆',
  '👑',
  '🎖️',
  '🏅',
  '⭐',
  '🌟',
  '✨',
  '🔥',
  '💪',
  '💎',
  '🎯',
  '🎪',
  '🌈',
  '👨‍👩‍👧',
  '👨‍👩‍👦',
  '💑',
  '👫',
  '❤️',
  '💕',
  '💖',
  '💗',
];

const form = ref({
  key: '',
  title: '',
  emoji: '',
  minOrders: 0,
  minAvgRating: 0,
  sortOrder: 0,
});

watch(
  () => props.visible,
  (val) => {
    if (!val) {
      showEmojiPicker.value = false;
    }
    if (val) {
      if (props.level) {
        form.value = {
          key: props.level.key,
          title: props.level.title,
          emoji: props.level.emoji,
          minOrders: props.level.minOrders,
          minAvgRating: props.level.minAvgRating,
          sortOrder: props.level.sortOrder,
        };
      } else {
        form.value = {
          key: '',
          title: '',
          emoji: '',
          minOrders: 0,
          minAvgRating: 0,
          sortOrder: 0,
        };
      }
    }
  },
);

async function handleSave(): Promise<void> {
  if (!isEdit.value && !form.value.key) {
    ElMessage.warning('请填写等级 Key');
    return;
  }
  if (!form.value.title) {
    ElMessage.warning('请填写名称');
    return;
  }

  saving.value = true;
  try {
    if (isEdit.value) {
      await chefLevelApi.update(props.level!.key, {
        title: form.value.title,
        emoji: form.value.emoji,
        minOrders: form.value.minOrders,
        minAvgRating: form.value.minAvgRating,
        sortOrder: form.value.sortOrder,
      });
      ElMessage.success('更新成功');
    } else {
      await chefLevelApi.create({
        key: form.value.key,
        title: form.value.title,
        emoji: form.value.emoji,
        minOrders: form.value.minOrders,
        minAvgRating: form.value.minAvgRating,
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
    :title="isEdit ? '编辑等级' : '新增等级'"
    direction="rtl"
    size="480px"
    @close="handleClose"
  >
    <el-form label-position="top" class="level-form">
      <el-form-item label="等级 Key" v-if="!isEdit">
        <el-input v-model="form.key" placeholder="如 head_chef（唯一标识，创建后不可修改）" />
      </el-form-item>
      <el-form-item v-else label="等级 Key">
        <el-input :model-value="form.key" disabled />
      </el-form-item>

      <el-form-item label="名称">
        <el-input v-model="form.title" placeholder="如 主厨" maxlength="20" />
      </el-form-item>

      <el-form-item label="Emoji">
        <el-popover
          :visible="showEmojiPicker"
          placement="bottom-start"
          :width="360"
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

      <el-form-item label="最低订单数">
        <el-input-number v-model="form.minOrders" :min="0" :step="1" />
      </el-form-item>

      <el-form-item label="最低平均评分">
        <el-input-number v-model="form.minAvgRating" :min="0" :max="5" :step="0.1" :precision="1" />
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
.level-form {
  padding: 0 8px;
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
