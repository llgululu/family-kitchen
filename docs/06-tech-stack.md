# 情侣厨房 —— 技术栈选型

> 本文档固化 MVP 阶段所有技术栈选型决策。每一项选型都附带"理由"和"替代方案"，便于后续回顾。
> 配合 [PRD](./01-prd-overview.md) 和 [数据模型](./05-data-model.md) 阅读。

---

## 1. 整体架构路线

**自建后端 + 独立数据库 + 云服务器** 部署。

```
┌─────────────────┐   HTTPS    ┌──────────────┐
│  小程序 mini-app  │ ─────────► │              │       ┌──────────────┐
└─────────────────┘            │   backend    │ ────► │   MySQL 8.x  │
                                │   NestJS     │       └──────────────┘
┌─────────────────┐   HTTPS    │              │
│  管理后台 admin/  │ ─────────► │              │ ────► ┌──────────────┐
└─────────────────┘            │              │       │   MinIO      │
                                └──────┬───────┘       │ (对象存储)   │
                                       │               └──────────────┘
                                       │ WebSocket + 微信订阅消息
                                       ▼
                                ┌──────────────┐
                                │  微信服务端    │
                                └──────────────┘
```

**为什么不用微信云开发**：

- 锁定腾讯生态，后续如做 H5 / App 迁移成本高
- 复杂查询、事务、定时任务的表达力弱于自建
- admin 后台访问云数据库需要额外集成 SDK，体验割裂

---

## 2. 仓库结构

**单仓库 monorepo + pnpm workspace**。

```
family-kitchen/                      # pnpm workspace 根
├── pnpm-workspace.yaml
├── package.json                     # 仅放 devDependencies（lint、husky 等）
├── packages/
│   └── shared/                      # 跨端共享：枚举、常量
│       ├── package.json
│       └── src/
│           ├── enums.ts             # OrderStatus / MessageType 等
│           └── constants.ts         # 爱心币公式系数等
├── backend/                         # NestJS API 服务
│   ├── package.json
│   └── ...
├── admin/                           # Vue 3 + Element Plus + TS
│   ├── package.json
│   └── ...
├── mini-app/                        # uni-app + Vue 3 + JS
│   ├── package.json
│   └── ...
└── docs/                            # 产品 + 技术文档
```

**约束**：

- 三个子项目内部依赖 `@family-kitchen/shared`
- `packages/shared/` 目前包含 `enums.ts` 和 `constants.ts`，`api-types.ts` 尚未通过 OpenAPI 自动生成，后续可补充
- 跨项目共享的常量、枚举（如订单状态、消息类型）放 `shared`，避免三份散落定义漂移

---

## 3. 后端 `backend/`

### 3.1 核心栈

| 维度     | 选型                          | 备注                                                        |
| -------- | ----------------------------- | ----------------------------------------------------------- |
| 运行时   | Node.js LTS（≥ 20）           |                                                             |
| 语言     | TypeScript（≥ 5.3）           | strict 模式                                                 |
| 框架     | **NestJS**                    | 装饰器风格、模块化、原生支持 Cron / WebSocket / Interceptor |
| ORM      | **Prisma**                    | schema-first、类型推导强、迁移工具优雅                      |
| 数据库   | **MySQL 8.x**                 | JSON 字段支持、事务隔离够用                                 |
| 认证     | **wx.login + JWT**            | 服务端签发 JWT，sessionkey 缓存服务端                       |
| API 契约 | **OpenAPI / Swagger**         | NestJS `@nestjs/swagger` 装饰器自动生成                     |
| 日志     | **pino**（via `nestjs-pino`） | JSON 输出，便于后续接 ELK / Loki                            |
| 错误监控 | **Sentry**                    | `@sentry/node`                                              |
| 测试     | **Jest**                      | NestJS 默认                                                 |
| 包管理   | **pnpm**                      | 与根 workspace 一致                                         |

### 3.2 关键依赖（参考列表）

```jsonc
{
  // 核心
  "@nestjs/common": "^10",
  "@nestjs/core": "^10",
  "@nestjs/platform-fastify": "^10", // 用 fastify 适配器，性能更好
  "@nestjs/config": "^3",
  "@nestjs/schedule": "^4", // 定时任务（爱心币结算、月度报告）
  "@nestjs/jwt": "^10",
  "@nestjs/swagger": "^7",
  "@nestjs/throttler": "^5", // 限流（催菜限频）

  // 数据
  "prisma": "^5",
  "@prisma/client": "^5",

  // 第三方
  "axios": "^1", // 调用微信开放接口
  "minio": "^8", // MinIO SDK（开发期）
  "ws": "^8", // WebSocket 服务（实时通信）
  "nestjs-pino": "^4",
  "pino": "^9",
  "pino-pretty": "^11", // 仅开发环境
  "@sentry/node": "^8",
  "class-validator": "^0.14",
  "class-transformer": "^0.5",

  // 共享
  "@family-kitchen/shared": "workspace:*",
}
```

### 3.3 后端模块拆分

```
backend/src/
├── main.ts
├── app.module.ts
├── common/                    # 通用：拦截器、过滤器、守卫、装饰器
├── prisma/                    # PrismaService
├── modules/
│   ├── auth/                  # wx.login + JWT + H5 手机号密码登录
│   ├── user/                  # 用户、个人资料
│   ├── family/                # 家庭空间、邀请码、成员管理
│   ├── recipe/                # 菜谱 CRUD
│   ├── order/                 # 订单状态机、OrderItem、Message
│   ├── love-point/            # 爱心币流水、双账本
│   ├── achievement/           # 徽章引擎 + EvaluatorRegistry
│   ├── timeline/              # 时间线条目
│   ├── notification/          # 微信订阅消息
│   ├── storage/               # MinIO / OSS 抽象层
│   ├── admin/                 # 管理后台 API（用户/家庭/订单/徽章/厨师等级/反馈/业务配置）
│   ├── feedback/              # 用户反馈收集
│   ├── business-config/       # 运行时业务配置管理
│   ├── ws/                    # WebSocket 实时通信
│   └── cron/                  # 定时任务（家庭解散清理等）
└── config/                    # env 校验、Swagger 配置
```

---

## 4. 小程序 `mini-app/`

### 4.1 核心栈

| 维度        | 选型                                        |
| ----------- | ------------------------------------------- |
| 框架        | **uni-app + Vue 3**                         |
| 语言        | **JavaScript**（Composition API）           |
| 编译目标    | 仅微信小程序（先不开多端）                  |
| 状态管理    | Pinia                                       |
| HTTP 客户端 | uni.request 封装 + OpenAPI 生成的 JS client |
| 实时更新    | WebSocket + 微信订阅消息 + 进入页面/下拉刷新轮询兜底 |
| 错误监控    | Sentry uni-app SDK                          |
| 构建        | HBuilderX 或 `vite + @dcloudio/uni-app` CLI |

### 4.2 关键考虑点

- **JS + IDE 类型感知**：在 `mini-app/jsconfig.json` 启用 `checkJs: true`，导入 `packages/shared/api-types.ts` 时仍能享受 IDE 推断
- **状态持久化**：登录 JWT 用 `uni.setStorageSync` 持久化；启动时校验有效期，过期则重新走 wx.login
- **订阅消息授权**：每个关键节点（接单、上菜）触发前请求一次性订阅授权（微信限制：一次授权用一次）
- **图片上传**：通过 backend 中转，不直接对接对象存储。`uni.uploadFile` → backend `/upload` → backend 写 MinIO/OSS → 返回 URL

### 4.3 目录约定

```
mini-app/src/
├── pages/                      # uni-app 约定页面目录
│   ├── tabbar/                 # 4 个 Tab 入口页
│   │   ├── home/
│   │   ├── menu/
│   │   ├── timeline/
│   │   └── profile/
│   ├── order/                  # 订单相关
│   ├── recipe/                 # 菜谱相关
│   ├── family/                 # 家庭空间相关
│   └── auth/                   # 登录、引导
├── components/                 # 全局组件
├── composables/                # 组合式函数（useOrder / useLovePoint 等）
├── stores/                     # Pinia stores
├── api/                        # 由 OpenAPI 生成 + 手写封装
├── utils/
├── static/                     # 图片、字体
└── main.js
```

---

## 5. 管理后台 `admin/`

### 5.1 核心栈

| 维度        | 选型                                     |
| ----------- | ---------------------------------------- |
| 框架        | **Vue 3 + Element Plus**                 |
| 语言        | **TypeScript**（strict 模式）            |
| 构建        | Vite                                     |
| 状态管理    | Pinia                                    |
| 路由        | Vue Router 4                             |
| HTTP 客户端 | axios + OpenAPI 生成 TS client           |
| 表格 / 表单 | Element Plus + `@element-plus/icons-vue` |
| 测试        | Vitest + @vue/test-utils                 |
| 错误监控    | Sentry Vue SDK                           |

### 5.2 后台页面

- 登录页（H5 手机号/密码登录）
- 家庭空间列表 + 详情（查、不允许编辑业务数据）
- 用户列表 + 详情
- 订单列表 + 详情（查、可冻结）
- 徽章定义管理（CRUD + 启用/停用）
- 厨师等级定义管理
- 反馈列表
- 业务配置管理（爱心币公式系数等运行时参数）
- 数据看板（DAU、订单完成率等）

> 后台是**只读 / 运营辅助**为主，不暴露危险操作。所有写操作都走审计日志。

---

## 6. 共享包 `packages/shared/`

### 6.1 用途

| 内容                    | 说明                                                          |
| ----------------------- | ------------------------------------------------------------- |
| `enums.ts`              | OrderStatus / MessageType / BadgeKey / LovePointChangeType 等 |
| `constants.ts`          | 爱心币公式系数、订单状态机转换表、徽章触发阈值                |

### 6.2 类型生成流程（规划）

`api-types.ts` 尚未通过 OpenAPI 自动生成，后续可通过以下流程补充：

```bash
# 1. backend 启动后导出 OpenAPI JSON
cd backend && pnpm run openapi:export      # 输出到 packages/shared/openapi.json

# 2. shared 包根据 JSON 生成 TS 类型
cd packages/shared && pnpm run gen:types   # openapi-typescript 命令
```

---

## 7. 基础设施 & 工程规范

### 7.1 代码规范

| 工具         | 用途                                                                                  |
| ------------ | ------------------------------------------------------------------------------------- |
| ESLint       | 各模块独立 config，规则继承根 `.eslintrc`                                             |
| Prettier     | 根目录统一 `.prettierrc`                                                              |
| husky        | git hook 容器                                                                         |
| lint-staged  | 提交前只 lint 改动文件                                                                |
| commitlint   | 强制 Conventional Commits（feat / fix / chore / docs / refactor / test / build / ci） |
| editorconfig | 跨编辑器一致性                                                                        |

**Conventional Commits 范例**：

```
feat(order): 添加催菜限频校验
fix(love-point): 修复打赏后余额计算溢出
docs: 更新 PRD §8.1 爱心币机制
```

### 7.2 CI/CD

**MVP 阶段**：GitHub Actions 仅做 PR / push 触发的 lint + test，**不做部署**。

```yaml
# .github/workflows/ci.yml（草案）
name: CI
on: [push, pull_request]
jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r run lint
      - run: pnpm -r run test
      - run: pnpm -r run build
```

部署相关流水线**等服务器选定后再补**。

### 7.3 环境变量

- 各子项目根目录的 `.env`（不提交）+ `.env.example`（提交）
- backend 用 `@nestjs/config` + `class-validator` 启动时校验
- 敏感凭据（微信 AppSecret、JWT secret、MinIO accessKey）通过环境变量注入，**严禁写死**

---

## 8. 对象存储

### 8.1 开发期：MinIO

- Docker 一键起 MinIO，端口 9000（S3 API）+ 9001（Console）
- 通过 `minio` Node SDK 上传 / 删除 / 签名 URL
- backend 通过 storage abstraction 层调用

### 8.2 生产期：待定

部署服务器选定后，可平滑切换到腾讯云 COS / 阿里云 OSS。**关键**：backend 已经做了 storage abstraction，不要让业务代码直接 import `minio`。

```typescript
// backend/src/modules/storage/storage.module.ts（示意）
export interface StorageService {
  upload(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}
// 实现切换通过 NestJS DI 完成：MinioStorageService / CosStorageService
```

---

## 9. 实时通信策略

| 场景             | 实现                                                  |
| ---------------- | ----------------------------------------------------- |
| 订单状态变化通知 | WebSocket 实时推送 + 微信订阅消息（最强提醒）          |
| 订单消息流刷新   | WebSocket 推送 + 进入订单详情页 + 下拉刷新轮询兜底     |
| 催菜动效         | 客户端立即发起 HTTP 请求 + WebSocket 推给对方          |

**实际实现：已包含 WebSocket 模块**。

后端已实现 `ws/` 模块，用于订单消息的即时推送。当前架构为 **WebSocket + 微信订阅消息 + 轮询兜底** 三层保障。

**历史决策记录（为什么 MVP 阶段曾考虑不用 WebSocket）**：

- 微信小程序前台保活差，进入后台 5s 后断连
- 重连 / 心跳 / 断线重发的复杂度高
- 订阅消息已能满足"关键节点提醒"的核心诉求

实际开发中，为了更好的用户体验（特别是订单内消息流的实时性），还是实现了 WebSocket。

---

## 10. 关键依赖之外的工程约定

| 约定         | 内容                                                        |
| ------------ | ----------------------------------------------------------- |
| Node 版本    | 锁定到 LTS（用 `engines` 字段 + `.nvmrc`）                  |
| 包版本       | 通过 pnpm lockfile 锁定，不接受 `^` 隐式更新                |
| 数据库迁移   | 必须通过 `prisma migrate dev/deploy`，禁止线上手动改表      |
| API 版本     | URL 前缀 `/api/v1/`，破坏性变更升 v2                        |
| 错误响应格式 | 统一 `{ code: string, message: string, details?: any }`     |
| 时区         | 服务端存 UTC，前端展示按用户系统时区                        |
| 主键         | 业务表用 `cuid`（or `nanoid`），不使用自增 ID（避免被遍历） |

---

## 11. 已决策的技术权衡（速查）

| 议题               | 选择                 | 主要替代方案（被否决）                                     |
| ------------------ | -------------------- | ---------------------------------------------------------- |
| 整体架构           | 自建后端             | 微信云开发（被锁生态）                                     |
| 后端框架           | NestJS               | Fastify 裸用（缺结构）/ FastAPI（语言割裂）/ Gin（生态薄） |
| ORM                | Prisma               | TypeORM（推断弱）/ Drizzle（NestJS 实践少）                |
| 数据库             | MySQL                | PostgreSQL（团队选型偏好）                                 |
| 小程序框架         | uni-app + Vue 3 + JS | 原生（不利于跨端）/ Taro（团队 Vue 偏好）                  |
| 后台框架           | Vue 3 + Element Plus | React + Antd（团队 Vue 偏好）                              |
| 实时通信           | WebSocket + 订阅消息 | 纯轮询（体验差）/ 纯 WebSocket（小程序保活差）             |
| 包管理             | pnpm                 | npm（workspace 体验差）/ yarn berry（学习成本）            |
| 仓库结构           | monorepo             | polyrepo（共享代码不便）                                   |
| 认证               | JWT                  | Session（需额外 Redis）                                    |
| API 契约           | OpenAPI              | GraphQL（小程序生态不主流）                                |
| 对象存储（开发期） | MinIO                | 直接对接 COS / OSS（开发环境繁琐）                         |

---

## 12. 后续待补技术决策

> 不阻塞 MVP 开发的项目，列在这里以免遗忘：

- 部署服务器：腾讯云 CVM / 阿里云 ECS / 自有服务器（与备案、域名、HTTPS 一并决定）
- 域名 & ICP 备案：上线前必须完成，预留 2–4 周
- 生产对象存储：上线前从 MinIO 切到 COS / OSS
- 日志中心化：Loki / ELK / 云厂商日志服务
- APM：Sentry Performance / Datadog / 自建 OpenTelemetry
- 数据库备份策略 & 灾备方案
- 微信内容安全 / 图片审核接入（用户上传内容合规）

---

## 13. 维护

| 字段     | 内容       |
| -------- | ---------- |
| 当前版本 | MVP v0.1   |
| 最近更新 | 2026-05-13 |
| 维护者   | 技术团队   |

调整选型流程：

- 小升级（次要版本）：直接 PR
- 替换核心栈（框架、ORM、数据库）：先开 RFC，更新本文档 §11 表格的"主要替代方案"
