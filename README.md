# 情侣厨房 Family Kitchen

让情侣"在家点菜、做菜、记录甜蜜"的微信小程序。Monorepo 仓库，使用 pnpm workspace。

> 产品 / 技术文档全部在 [`docs/`](./docs/README.md)。快速了解项目可先读 [01-prd-overview.md](./docs/01-prd-overview.md) 和 [06-tech-stack.md](./docs/06-tech-stack.md)。

## 仓库结构

```
family-kitchen/
├── backend/          NestJS API 服务（TypeScript + Prisma + MySQL）
├── admin/            管理后台（Vue 3 + Element Plus + TypeScript）
├── mini-app/         微信小程序（uni-app + Vue 3 + JavaScript）
├── packages/
│   └── shared/       跨端共享：OpenAPI 类型、枚举、常量
└── docs/             产品和技术文档
```

## 环境要求

- Node.js ≥ 20（建议用 `nvm use` 读取 `.nvmrc`）
- pnpm ≥ 9（`corepack enable && corepack prepare pnpm@9.12.0 --activate`）
- MySQL ≥ 8.0
- MinIO（本地用 Docker 起一个）

## 快速开始

```bash
# 1. 安装依赖（首次会比较慢）
pnpm install

# 2. 构建 shared 包（backend / admin 依赖它的编译产物 dist/，否则会报
#    "Cannot find module '@family-kitchen/shared'"。改动 shared 源码后需重新构建）
pnpm --filter @family-kitchen/shared build

# 3. 配置环境变量（每个子项目）
cp backend/.env.example backend/.env
cp admin/.env.example admin/.env
cp mini-app/.env.example mini-app/.env

# 4. 初始化数据库
pnpm --filter @family-kitchen/backend run db:migrate

# 5. 分别启动
pnpm dev:backend       # http://localhost:3000  (Swagger 在 /api/docs)
pnpm dev:admin         # http://localhost:5173
pnpm dev:mini-app      # 用 HBuilderX 或微信开发者工具打开 mini-app/
```

## 常用脚本

| 命令                                         | 作用                                    |
| -------------------------------------------- | --------------------------------------- |
| `pnpm lint`                                  | 全仓库 lint（并行）                     |
| `pnpm format`                                | Prettier 全仓库格式化                   |
| `pnpm typecheck`                             | 类型检查                                |
| `pnpm test`                                  | 跑所有子项目的测试                      |
| `pnpm build`                                 | 全仓库构建（按依赖顺序，先 shared）     |
| `pnpm --filter @family-kitchen/shared build` | 单独构建 shared 包（改完枚举/常量后跑） |
| `pnpm gen:api-types`                         | 从 backend OpenAPI 生成 shared 类型     |

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)。commitlint 会校验。

```
feat(order): 添加催菜限频校验
fix(love-point): 修复打赏后余额计算溢出
docs(prd): 更新 §8.1 爱心币机制说明
```

合法 type：`feat / fix / docs / style / refactor / perf / test / build / ci / chore / revert`
合法 scope：`backend / admin / mini-app / shared / docs / deps / release / root`

## Husky 提交钩子

- `pre-commit`：跑 lint-staged（仅对暂存文件做 prettier 校验）
- `commit-msg`：跑 commitlint 校验 message 格式

> 如果 hooks 文件没有可执行权限（某些挂载点不支持 chmod），执行 `chmod +x .husky/*` 或在 git 配置中 `git config core.fileMode false`。Husky v9+ 安装后会自动处理大多数情况。

## 文档索引

- [产品文档](./docs/README.md)
- [PRD](./docs/01-prd-overview.md)
- [技术栈](./docs/06-tech-stack.md)
