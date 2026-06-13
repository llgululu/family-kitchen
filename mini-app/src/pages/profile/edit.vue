<template>
  <view class="page">
    <view class="avatar-section">
      <view class="avatar-btn" @click="onAvatarTap">
        <image class="avatar" :src="form.avatarUrl || avatarFallback" mode="aspectFill" />
        <view class="avatar-edit-badge">
          <wd-icon name="camera" size="24rpx" color="#fff" />
        </view>
      </view>
      <text class="avatar-hint">点击更换头像</text>
    </view>

    <view class="form">
      <view class="field">
        <view class="label-row">
          <wd-icon name="edit" size="28rpx" color="#8E8580" />
          <text class="label">昵称</text>
        </view>
        <wd-input
          v-model="form.nickname"
          type="nickname"
          :maxlength="30"
          placeholder="请输入昵称"
          clearable
        />
      </view>

      <view class="field">
        <view class="label-row">
          <wd-icon name="chat" size="28rpx" color="#8E8580" />
          <text class="label">个性签名</text>
        </view>
        <wd-textarea
          v-model="form.signature"
          :maxlength="200"
          placeholder="写点什么..."
          :autosize="{ minHeight: 80, maxHeight: 200 }"
        />
        <text class="char-count">{{ form.signature.length }} / 200</text>
      </view>
    </view>

    <wd-button type="error" round block :loading="saving" @click="handleSave"> 保存修改 </wd-button>

    <!-- Default avatar picker popup -->
    <view v-if="showAvatarPicker" class="avatar-popup-mask" @click="showAvatarPicker = false">
      <view class="avatar-popup" @click.stop>
        <view class="popup-header">
          <text class="popup-title">选择默认头像</text>
          <view class="popup-close" @click="showAvatarPicker = false">
            <wd-icon name="close" size="36rpx" color="#8E8580" />
          </view>
        </view>
        <scroll-view scroll-y class="popup-body">
          <view v-for="group in avatarGroups" :key="group.style" class="avatar-group">
            <text class="group-label">{{ group.label }}</text>
            <view class="avatar-grid">
              <view
                v-for="url in group.avatars"
                :key="url"
                class="avatar-cell"
                :class="{ selected: form.avatarUrl === url }"
                @click="onPickAvatar(url)"
              >
                <image class="cell-img" :src="url" mode="aspectFill" />
                <view v-if="form.avatarUrl === url" class="cell-check">
                  <wd-icon name="check" size="20rpx" color="#fff" />
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import { useAuthStore } from '@/stores/auth.js';
import { useBusinessConfigStore } from '@/stores/business-config.js';
import { userApi } from '@/api/user.js';
import { uploadImage } from '@/api/storage.js';

const GENDER_AVATARS = ['/static/male.jpg', '/static/female.jpg']; // fallback

function getGenderAvatars() {
  const cfg = useBusinessConfigStore();
  return [cfg.avatarFallback('male'), cfg.avatarFallback('female')];
}

const DICE_BEAR_STYLES = [
  { style: 'adventurer', label: '冒险家' },
  { style: 'avataaars', label: '卡通风格' },
  { style: 'bottts-neutral', label: '机器人' },
  { style: 'fun-emoji', label: '趣味表情' },
  { style: 'lorelei', label: '精灵' },
  { style: 'notionists', label: '极简画' },
];

const SEEDS = ['Leo', 'Mia', 'Zoe', 'Kai'];

function buildAvatarGroups() {
  return [
    { style: 'gender', label: '默认形象', avatars: getGenderAvatars() },
    ...DICE_BEAR_STYLES.map(({ style, label }) => ({
      style,
      label,
      avatars: SEEDS.map((seed) => `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`),
    })),
  ];
}

export default {
  computed: {
    avatarFallback() {
      return useBusinessConfigStore().avatarFallback(this.form.gender);
    },
  },
  data() {
    return {
      form: { nickname: '', avatarUrl: '', signature: '' },
      saving: false,
      showAvatarPicker: false,
      avatarGroups: buildAvatarGroups(),
    };
  },
  async onLoad() {
    const me = await userApi.me().catch(() => null);
    if (me) {
      this.form.nickname = me.nickname || '';
      this.form.avatarUrl = me.avatarUrl || '';
      this.form.signature = me.signature || '';
    }
  },
  methods: {
    onAvatarTap() {
      uni.showActionSheet({
        itemList: ['选择默认头像', '拍照/从相册选择'],
        success: ({ tapIndex }) => {
          if (tapIndex === 0) {
            this.showAvatarPicker = true;
          } else {
            this.onChangeAvatar();
          }
        },
      });
    },
    onPickAvatar(url) {
      this.form.avatarUrl = url;
      this.showAvatarPicker = false;
    },
    async onChooseAvatar(e) {
      const tempPath = e.detail.avatarUrl;
      if (!tempPath) return;
      try {
        const r = await uploadImage(tempPath, 'avatar');
        this.form.avatarUrl = r.url;
      } catch {
        uni.showToast({ title: '上传失败', icon: 'none' });
      }
    },
    async onChangeAvatar() {
      let res;
      try {
        res = await uni.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
        });
      } catch (e) {
        if (String(e?.errMsg || '').includes('cancel')) return;
        console.error('chooseImage fail', e);
        uni.showToast({ title: '选择图片失败', icon: 'none' });
        return;
      }
      const tempPath = res.tempFilePaths[0];
      try {
        const r = await uploadImage(tempPath, 'avatar');
        this.form.avatarUrl = r.url;
      } catch (e) {
        console.error('uploadImage fail', e);
      }
    },
    async handleSave() {
      this.saving = true;
      try {
        const updated = await userApi.updateMe({
          nickname: this.form.nickname || undefined,
          avatarUrl: this.form.avatarUrl || undefined,
          signature: this.form.signature || undefined,
        });
        useAuthStore().setUser(updated);
        uni.showToast({ title: '已保存', icon: 'success' });
        setTimeout(() => uni.navigateBack(), 600);
      } catch {
        // ignore
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0 32rpx;
}
.avatar-btn {
  position: relative;
  background: transparent;
  padding: 0;
  margin: 0;
  border: none;
  line-height: 1;
  &::after {
    border: none;
  }
}
.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  border: 4rpx solid #fddccc;
}
.avatar-edit-badge {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #e07a5f;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(224, 122, 95, 0.4);
}
.avatar-hint {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #8e8580;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 48rpx;
}
.field {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
}
.label-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}
.label {
  color: #2e2926;
  font-size: 28rpx;
  font-weight: 500;
}
.char-count {
  text-align: right;
  font-size: 22rpx;
  color: #b5aea8;
  margin-top: 8rpx;
}

/* Avatar picker popup */
.avatar-popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.avatar-popup {
  width: 100%;
  max-height: 80vh;
  background: $fk-bg-page;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 16rpx;
  border-bottom: 1rpx solid #eee;
}
.popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2e2926;
}
.popup-close {
  padding: 8rpx;
}
.popup-body {
  flex: 1;
  padding: 16rpx 32rpx 32rpx;
  max-height: 70vh;
}
.avatar-group {
  margin-bottom: 28rpx;
}
.group-label {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: #8e8580;
  margin-bottom: 16rpx;
}
.avatar-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}
.avatar-cell {
  position: relative;
  width: calc(25% - 15rpx);
  aspect-ratio: 1;
  border-radius: 20rpx;
  background: #fff;
  overflow: hidden;
  border: 4rpx solid transparent;
  transition: border-color 0.2s;

  &.selected {
    border-color: $fk-primary;
  }
}
.cell-img {
  width: 100%;
  height: 100%;
}
.cell-check {
  position: absolute;
  right: 4rpx;
  top: 4rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: $fk-primary;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
