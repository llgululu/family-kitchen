<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const activeMenu = computed(() => {
  if (route.path.startsWith('/families')) return '/families';
  if (route.path.startsWith('/users')) return '/users';
  if (route.path.startsWith('/orders')) return '/orders';
  if (route.path.startsWith('/badges')) return '/badges';
  if (route.path.startsWith('/chef-levels')) return '/chef-levels';
  if (route.path.startsWith('/feedback')) return '/feedback';
  if (route.path.startsWith('/ai')) return '/ai/config';
  if (route.path === '/settings') return '/business-config';
  return route.path;
});

const today = computed(() => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()} · ${m} · ${day}`;
});

async function handleLogout(): Promise<void> {
  try {
    await ElMessageBox.confirm('确认退出登录？', '退出', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  auth.logout();
  await router.replace('/login');
}
</script>

<template>
  <el-container class="layout">
    <el-aside width="248px" class="aside">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path
              d="M5 24 L20 12 L23 9 Q26 7 28 7 L27 8 Q24 11 21 15 L7 27 Z"
              fill="currentColor"
            />
            <line
              x1="21"
              y1="15"
              x2="27"
              y2="8"
              stroke="#C04A2C"
              stroke-width="1.2"
              stroke-linecap="round"
            />
            <circle cx="27" cy="27" r="1.5" fill="#C04A2C" />
          </svg>
        </div>
        <div class="brand-text">
          <div class="brand-name">情侣厨房</div>
          <div class="brand-sub">Mémoire · 备忘录</div>
        </div>
      </div>

      <div class="aside-rule" />

      <nav class="nav-scroll">
        <el-menu :default-active="activeMenu" router>
          <div class="menu-section">概览 · OVERVIEW</div>
          <el-menu-item index="/dashboard">数据看板</el-menu-item>
          <el-menu-item index="/analytics">数据分析</el-menu-item>

          <div class="menu-section">业务 · OPERATIONS</div>
          <el-menu-item index="/families">家庭空间</el-menu-item>
          <el-menu-item index="/users">用户列表</el-menu-item>
          <el-menu-item index="/orders">订单列表</el-menu-item>

          <div class="menu-section">运营 · DESK</div>
          <el-menu-item index="/badges">成就管理</el-menu-item>
          <el-menu-item index="/chef-levels">厨师等级</el-menu-item>
          <el-menu-item index="/feedback">意见反馈</el-menu-item>

          <div class="menu-section">系统 · SYSTEM</div>
          <el-menu-item index="/business-config">业务配置</el-menu-item>
          <el-menu-item index="/ai/config">AI 配置</el-menu-item>
          <el-menu-item index="/ai/usage">AI 用量</el-menu-item>
          <el-menu-item index="/help-manual">帮助手册</el-menu-item>
          <el-menu-item index="/about">关于</el-menu-item>
        </el-menu>
      </nav>

      <div class="aside-foot">
        <div class="foot-date">{{ today }}</div>
        <div class="foot-meta">Édition Limitée</div>
      </div>
    </el-aside>

    <el-container class="main">
      <el-header class="header" height="68px">
        <div class="header-l">
          <div class="header-eyebrow">{{ activeMenu.replace('/', '') || 'index' }}</div>
          <h1 class="header-title">{{ route.meta.title ?? '管理后台' }}</h1>
        </div>
        <div class="header-r">
          <div class="user-block">
            <span class="user-greet">登录身份</span>
            <span class="user-name">{{ auth.username }}</span>
          </div>
          <button class="logout-btn" type="button" @click="handleLogout">退出</button>
        </div>
      </el-header>

      <el-main class="content">
        <RouterView v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
  background: var(--paper);
}

/* ── Sidebar ───────────────────────────────────────────────────── */
.aside {
  background: var(--paper-2);
  border-right: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  position: relative;
}

.brand {
  padding: 20px 22px 16px;
  display: flex;
  gap: 12px;
  align-items: center;
}
.brand-mark {
  width: 38px;
  height: 38px;
  background: var(--ink);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--paper);
}
.brand-mark svg {
  width: 24px;
  height: 24px;
}
.brand-text {
  display: flex;
  flex-direction: column;
}
.brand-name {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--ink);
  line-height: 1.1;
}
.brand-sub {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 11.5px;
  color: var(--persimmon);
  margin-top: 2px;
  letter-spacing: 0.02em;
}

.aside-rule {
  margin: 0 22px 8px;
  height: 1px;
  background: linear-gradient(
    to right,
    var(--rule) 0%,
    var(--rule) 30%,
    transparent 30%,
    transparent 33%,
    var(--rule) 33%,
    var(--rule) 100%
  );
}

.nav-scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 16px;
}

.menu-section {
  font-family: var(--font-body);
  font-size: 10px;
  letter-spacing: 0.22em;
  color: var(--ink-4);
  font-weight: 600;
  padding: 22px 22px 8px;
  text-transform: uppercase;
}

.aside-foot {
  border-top: 1px solid var(--rule-2);
  padding: 14px 22px 18px;
  background: var(--paper-2);
}
.foot-date {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.05em;
}
.foot-meta {
  font-family: var(--font-display);
  font-style: italic;
  font-size: 11px;
  color: var(--persimmon);
  margin-top: 2px;
}

/* ── Header ────────────────────────────────────────────────────── */
.main {
  background: var(--paper);
}
.header {
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}
.header::after {
  content: '';
  position: absolute;
  left: 32px;
  right: 32px;
  bottom: -1px;
  height: 1px;
  background: var(--ink);
  opacity: 0.08;
}
.header-l {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.header-eyebrow {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  color: var(--ink-4);
  text-transform: uppercase;
}
.header-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 22px;
  margin: 0;
  color: var(--ink);
  letter-spacing: -0.015em;
}
.header-r {
  display: flex;
  align-items: center;
  gap: 22px;
}
.user-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.15;
}
.user-greet {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--ink-4);
  text-transform: uppercase;
}
.user-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 15px;
  color: var(--ink);
  margin-top: 1px;
}
.logout-btn {
  border: 1px solid var(--rule);
  background: var(--paper-2);
  color: var(--ink-2);
  font-family: var(--font-body);
  font-size: 12.5px;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: all 0.18s ease;
}
.logout-btn:hover {
  border-color: var(--persimmon);
  color: var(--persimmon);
}

/* ── Content ───────────────────────────────────────────────────── */
.content {
  padding: 28px 32px 40px;
  background: var(--paper);
}

/* ── Transition ────────────────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.fade-leave-to {
  opacity: 0;
}
</style>
