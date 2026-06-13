# Admin · 管理后台

Vue 3 + Element Plus + TypeScript + Vite。

## 快速开始

```bash
cp .env.example .env
pnpm install         # 在仓库根目录
pnpm dev             # 启动开发，默认 http://localhost:5173
```

## 目录约定

```
admin/src/
├── main.ts                  # 入口
├── App.vue                  # 根组件（ConfigProvider 包裹）
├── router/                  # vue-router 配置 + 守卫
├── layouts/                 # 布局组件（侧边栏、顶栏）
├── views/                   # 页面，按业务模块分子目录
├── components/              # 全局可复用组件
├── composables/             # 组合式函数（useXxx）
├── stores/                  # Pinia stores
├── api/                     # API 客户端，按模块拆分
├── utils/                   # 工具函数
└── assets/                  # 静态资源
```

## API 类型

API 类型来自 `@family-kitchen/shared`，由 backend 启动后导出 OpenAPI JSON 自动生成。生成命令：

```bash
pnpm --filter @family-kitchen/backend run openapi:export
pnpm --filter @family-kitchen/shared run gen:types
```

## 自动导入

`unplugin-auto-import` + `unplugin-vue-components` 已配置：

- Vue / Pinia / Vue Router 的 API 无需 import
- Element Plus 组件按需引入，不用手动 import + use

类型声明输出到 `src/auto-imports.d.ts` 和 `src/components.d.ts`，已在 `.gitignore`/`tsconfig` 中正确处理。
