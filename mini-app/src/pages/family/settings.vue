<template>
  <view class="page">
    <view v-if="!family" class="empty">
      <wd-icon name="home" size="96rpx" color="#D5CEC8" />
      <text class="empty-text">暂无家庭信息</text>
      <wd-button size="small" type="error" @click="goSetup"> 创建 / 加入小厨房 </wd-button>
    </view>
    <view v-else class="content">
      <view class="card">
        <wd-cell title="名称" :value="family.name" is-link @click="renameDialog = true">
          <template #icon>
            <wd-icon name="home" size="36rpx" color="#8E8580" custom-style="margin-right:12rpx" />
          </template>
        </wd-cell>
        <wd-cell title="状态" :value="familyStatusLabel">
          <template #icon>
            <wd-icon
              name="info-circle"
              size="36rpx"
              color="#8E8580"
              custom-style="margin-right:12rpx"
            />
          </template>
        </wd-cell>
        <wd-cell title="创建时间" :value="formatDateTime(family.createdAt)">
          <template #icon>
            <wd-icon name="clock" size="36rpx" color="#8E8580" custom-style="margin-right:12rpx" />
          </template>
        </wd-cell>
      </view>

      <view class="card">
        <view class="card-title">
          <wd-icon name="user" size="28rpx" color="#6B6560" />
          成员（{{ family.members.length }} / 2）
        </view>
        <view v-for="m in family.members" :key="m.userId" class="member-row">
          <image
            class="avatar"
            :src="m.avatarUrl || getAvatarFallback(m.gender)"
            mode="aspectFill"
          />
          <view class="member-info">
            <text class="nickname">{{ m.nickname }}</text>
            <text class="role">
              <wd-icon
                :name="m.role === 'creator' ? 'medal' : 'user'"
                size="20rpx"
                color="#8E8580"
              />
              {{ m.role === 'creator' ? '创建者' : '成员' }}
            </text>
          </view>
          <text class="joined">{{ formatDateTime(m.joinedAt) }}</text>
        </view>
      </view>

      <wd-button
        v-if="family.members.length < 2"
        type="error"
        round
        block
        custom-style="margin-top:16rpx"
        @click="refreshInvite"
      >
        <wd-icon name="share" size="28rpx" color="#fff" custom-style="margin-right:8rpx" />
        生成邀请码邀请 TA
      </wd-button>

      <view v-if="inviteResult" class="card">
        <view class="card-title">
          <wd-icon name="key" size="28rpx" color="#6B6560" />
          邀请码
        </view>
        <text class="invite-code">{{ inviteResult.inviteCode }}</text>
        <text class="invite-expires">有效期至 {{ formatDateTime(inviteResult.expiresAt) }}</text>
        <view class="action-row">
          <wd-button size="small" @click="copyCode">
            <wd-icon name="copy" size="24rpx" custom-style="margin-right:4rpx" />
            复制
          </wd-button>
          <!-- #ifdef MP-WEIXIN -->
          <wd-button size="small" type="error" open-type="share">
            <wd-icon name="share" size="24rpx" color="#fff" custom-style="margin-right:4rpx" />
            分享
          </wd-button>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <wd-button size="small" type="error" @click="copyInvite">
            <wd-icon name="share" size="24rpx" color="#fff" custom-style="margin-right:4rpx" />
            复制邀请语
          </wd-button>
          <!-- #endif -->
        </view>
      </view>

      <!-- 通知设置 -->
      <view class="card">
        <view class="card-title">
          <wd-icon name="notification" size="28rpx" color="#6B6560" />
          通知设置
        </view>
        <view class="switch-row">
          <text class="switch-label">接单通知</text>
          <wd-switch
            v-model="notifyPrefs.orderAccepted"
            @change="(v) => onNotifyChange('orderAccepted', v.value)"
            size="40rpx"
          />
        </view>
        <view class="switch-row">
          <text class="switch-label">上菜通知</text>
          <wd-switch
            v-model="notifyPrefs.orderServed"
            @change="(v) => onNotifyChange('orderServed', v.value)"
            size="40rpx"
          />
        </view>
        <view class="switch-row">
          <text class="switch-label">催菜提醒</text>
          <wd-switch
            v-model="notifyPrefs.orderRushed"
            @change="(v) => onNotifyChange('orderRushed', v.value)"
            size="40rpx"
          />
        </view>
        <view class="switch-row">
          <text class="switch-label">成就解锁</text>
          <wd-switch
            v-model="notifyPrefs.achievementUnlocked"
            @change="(v) => onNotifyChange('achievementUnlocked', v.value)"
            size="40rpx"
          />
        </view>
      </view>

      <wd-button
        plain
        block
        custom-style="margin-top:24rpx"
        custom-class="danger-btn"
        @click="handleLeave"
      >
        退出小厨房
      </wd-button>
    </view>

    <!-- 改名弹窗 -->
    <wd-popup
      v-model="renameDialog"
      position="center"
      :close-on-click-modal="true"
      custom-style="border-radius:16rpx;width:600rpx"
    >
      <view class="dialog">
        <text class="dialog-title">改名</text>
        <wd-input v-model="newName" :maxlength="60" placeholder="输入新名称" />
        <view class="dialog-actions">
          <wd-button size="small" @click="renameDialog = false">取消</wd-button>
          <wd-button size="small" type="error" @click="handleRename">保存</wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script>
import { useFamilyStore } from '@/stores/family.js';
import { useBusinessConfigStore } from '@/stores/business-config.js';
import { familyApi } from '@/api/family.js';
import { userApi } from '@/api/user.js';
import { formatDateTime } from '@/utils/labels.js';

const STATUS_LABEL = {
  active: '正常',
  dissolving: '解散中',
  dissolved: '已解散',
};

export default {
  data() {
    return {
      renameDialog: false,
      newName: '',
      inviteResult: null,
      notifyPrefs: {
        orderAccepted: true,
        orderServed: true,
        orderRushed: true,
        achievementUnlocked: true,
      },
    };
  },
  computed: {
    family() {
      return useFamilyStore().family;
    },
    isCreator() {
      return useFamilyStore().isCreator;
    },
    familyStatusLabel() {
      return STATUS_LABEL[this.family?.status] || '-';
    },
  },
  onShow() {
    useFamilyStore().refresh();
    this.loadNotifyPrefs();
  },
  watch: {
    renameDialog(v) {
      if (v) this.newName = this.family?.name || '';
    },
  },
  methods: {
    formatDateTime,
    getAvatarFallback(gender) {
      return useBusinessConfigStore().avatarFallback(gender);
    },

    goSetup() {
      uni.navigateTo({ url: '/pages/family/setup' });
    },

    async handleRename() {
      const name = this.newName.trim();
      if (!name) return;
      try {
        await useFamilyStore().updateMine({ name });
        this.renameDialog = false;
        uni.showToast({ title: '已更新', icon: 'success' });
      } catch (err) {
        // ignore
      }
    },

    async refreshInvite() {
      try {
        this.inviteResult = await familyApi.refreshInviteCode();
      } catch {
        // ignore
      }
    },

    copyCode() {
      if (!this.inviteResult?.inviteCode) return;
      uni.setClipboardData({
        data: this.inviteResult.inviteCode,
        success: () => uni.showToast({ title: '已复制', icon: 'success' }),
      });
    },

    // #ifndef MP-WEIXIN
    copyInvite() {
      if (!this.inviteResult?.inviteCode) return;
      uni.setClipboardData({
        data: `加入我的小厨房，邀请码 ${this.inviteResult.inviteCode}`,
        success: () => uni.showToast({ title: '邀请语已复制', icon: 'success' }),
      });
    },
    // #endif

    async handleLeave() {
      const res = await new Promise((resolve) => {
        uni.showModal({
          title: '退出小厨房',
          content: '退出后数据将无法恢复，确定退出吗？',
          confirmText: '退出',
          confirmColor: '#C75B5B',
          success: (r) => resolve(r.confirm),
        });
      });
      if (!res) return;
      try {
        await useFamilyStore().leave();
        uni.showToast({ title: '已退出', icon: 'success' });
        setTimeout(() => uni.reLaunch({ url: '/pages/family/setup' }), 600);
      } catch {
        // ignore
      }
    },
    async loadNotifyPrefs() {
      try {
        const prefs = await userApi.getNotificationPrefs();
        // Merge defaults with stored prefs (true by default)
        this.notifyPrefs = {
          orderAccepted: prefs.orderAccepted !== false,
          orderServed: prefs.orderServed !== false,
          orderRushed: prefs.orderRushed !== false,
          achievementUnlocked: prefs.achievementUnlocked !== false,
        };
      } catch {
        // ignore
      }
    },
    async onNotifyChange(key, value) {
      try {
        await userApi.updateNotificationPrefs({ [key]: value });
      } catch {
        // revert on failure
        this.notifyPrefs[key] = !value;
      }
    },
  },
  // #ifdef MP-WEIXIN
  onShareAppMessage() {
    return {
      title: `加入我的小厨房，邀请码 ${this.inviteResult?.inviteCode || ''}`,
      path: '/pages/auth/login',
    };
  },
  // #endif
};
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}
.empty-text {
  margin: 24rpx 0 32rpx;
  color: #8e8580;
  font-size: 28rpx;
}
.content {
  display: flex;
  flex-direction: column;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx 0;
  margin-bottom: 24rpx;
  overflow: hidden;
}
.card-title {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-weight: 600;
  padding: 24rpx 32rpx 8rpx;
}
.member-row {
  display: flex;
  align-items: center;
  padding: 16rpx 32rpx;
}
.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f0ebe7;
}
.member-info {
  flex: 1;
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
}
.nickname {
  font-weight: 500;
}
.role {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: #8e8580;
  margin-top: 4rpx;
}
.joined {
  font-size: 22rpx;
  color: #b5aea8;
}
.action-row {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
  padding: 0 32rpx;
}
.invite-code {
  display: block;
  text-align: center;
  font-size: 56rpx;
  font-weight: 700;
  letter-spacing: 12rpx;
  color: #e07a5f;
  padding: 16rpx 0;
}
.invite-expires {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #8e8580;
}
.dialog {
  padding: 32rpx;
}
.dialog-title {
  font-weight: 600;
  font-size: 32rpx;
  margin-bottom: 24rpx;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 24rpx;
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 32rpx;
}
.switch-label {
  font-size: 28rpx;
  color: #3a3632;
}
</style>
<style lang="scss">
.danger-btn {
  color: #c75b5b !important;
  border-color: #c75b5b !important;
}
</style>
