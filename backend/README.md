# Backend · NestJS API

情侣厨房后端 API 服务。

## 技术栈

- Node.js 20+ · TypeScript 5+
- NestJS 10 · Fastify adapter
- Prisma 5 · MySQL 8
- JWT 认证 · OpenAPI (Swagger)
- pino 日志 · Sentry 监控

## 快速开始

```bash
# 安装依赖（在仓库根目录执行）
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，至少填好 DATABASE_URL、JWT_SECRET、WX_APPID、WX_APP_SECRET

# 生成 Prisma client
pnpm run db:generate

# 跑数据库迁移（首次会创建 family_kitchen 库）
pnpm run db:migrate

# 启动开发服务
pnpm run dev
```

打开 [http://localhost:3000/api/v1/docs](http://localhost:3000/api/v1/docs) 查看 Swagger UI。

## 常用脚本

| 命令                  | 作用                                                            |
| --------------------- | --------------------------------------------------------------- |
| `pnpm dev`            | 开发模式（监听文件变化）                                        |
| `pnpm build`          | 编译到 `dist/`                                                  |
| `pnpm start`          | 生产启动（先 build）                                            |
| `pnpm test`           | 运行 Jest 单测                                                  |
| `pnpm lint`           | ESLint 校验                                                     |
| `pnpm db:migrate`     | 跑迁移（开发）                                                  |
| `pnpm db:studio`      | Prisma Studio 可视化数据库                                      |
| `pnpm openapi:export` | 导出 OpenAPI JSON 到 `packages/shared/openapi.json`（先 build） |

## 目录约定

```
backend/src/
├── main.ts                    # 入口
├── app.module.ts              # 根模块
├── common/                    # 通用：过滤器、拦截器、守卫、装饰器
├── config/                    # 环境变量校验
├── prisma/                    # Prisma 服务
└── modules/                   # 业务模块（每模块自管 controller/service/dto）
    ├── auth/
    ├── user/
    ├── family/
    ├── recipe/
    ├── order/
    ├── love-point/
    ├── achievement/
    ├── timeline/
    ├── notification/
    ├── storage/
    └── health/
```

## OpenAPI 类型生成给前端用

```bash
# 编译并导出最新 OpenAPI
pnpm run build && pnpm run openapi:export

# 让 shared 根据 openapi.json 生成 TS 类型
pnpm --filter @family-kitchen/shared run gen:types
```

前端（admin / mini-app）随后 `import` 共享包即可。
