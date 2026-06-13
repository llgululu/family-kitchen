import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '数据看板' },
      },
      {
        path: 'analytics',
        name: 'Analytics',
        component: () => import('@/views/Analytics.vue'),
        meta: { title: '数据分析' },
      },
      {
        path: 'families',
        name: 'FamilyList',
        component: () => import('@/views/family/FamilyList.vue'),
        meta: { title: '家庭空间' },
      },
      {
        path: 'families/:id',
        name: 'FamilyDetail',
        component: () => import('@/views/family/FamilyDetail.vue'),
        meta: { title: '家庭详情' },
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('@/views/user/UserList.vue'),
        meta: { title: '用户列表' },
      },
      {
        path: 'users/:id',
        name: 'UserDetail',
        component: () => import('@/views/user/UserDetail.vue'),
        meta: { title: '用户详情' },
      },
      {
        path: 'orders',
        name: 'OrderList',
        component: () => import('@/views/order/OrderList.vue'),
        meta: { title: '订单列表' },
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('@/views/order/OrderDetail.vue'),
        meta: { title: '订单详情' },
      },
      {
        path: 'badges',
        name: 'BadgeList',
        component: () => import('@/views/badge/BadgeList.vue'),
        meta: { title: '成就管理' },
      },
      {
        path: 'chef-levels',
        name: 'ChefLevelList',
        component: () => import('@/views/chef-level/ChefLevelList.vue'),
        meta: { title: '厨师等级' },
      },
      {
        path: 'feedback',
        name: 'FeedbackList',
        component: () => import('@/views/feedback/FeedbackList.vue'),
        meta: { title: '意见反馈' },
      },
      {
        path: 'business-config',
        name: 'BusinessConfig',
        component: () => import('@/views/BusinessConfig.vue'),
        meta: { title: '业务配置' },
      },
      {
        path: 'ai/config',
        name: 'AiConfig',
        component: () => import('@/views/ai/AiConfig.vue'),
        meta: { title: 'AI 配置' },
      },
      {
        path: 'ai/usage',
        name: 'AiUsage',
        component: () => import('@/views/ai/AiUsage.vue'),
        meta: { title: 'AI 用量' },
      },
      {
        path: 'settings',
        redirect: '/business-config',
      },
      {
        path: 'help-manual',
        name: 'HelpManual',
        component: () => import('@/views/HelpManual.vue'),
        meta: { title: '帮助手册' },
      },
      {
        path: 'about',
        name: 'About',
        component: () => import('@/views/About.vue'),
        meta: { title: '关于' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { public: true, title: '404' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.meta.public) return true;
  const auth = useAuthStore();
  if (!auth.isLoggedIn) {
    return { name: 'Login', query: { redirect: to.fullPath } };
  }
  return true;
});

router.afterEach((to) => {
  const title = (to.meta.title as string | undefined) ?? '管理后台';
  document.title = `${title} · 情侣厨房`;
});

export default router;
