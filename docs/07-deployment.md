# 情侣厨房 —— 生产部署文档

> 把 mini-app + admin + backend 三端从开发环境推到正式可用的完整指引。
> 配合 [上线 Checklist](./08-go-live-checklist.md) 一起读。

---

## 1. 生产架构

```
                    ┌──────────────────┐
                    │   微信用户          │
                    └────────┬─────────┘
                             │ HTTPS
                             ▼
                ┌─────────────────────────┐
                │   微信小程序（mini-app）  │
                │   线上版本（已审核通过）  │
                └────────┬─────────────────┘
                         │ HTTPS · 域名必须 ICP 备案
                         ▼
                  ┌──────────────┐
                  │  Nginx       │  api.xxx.com  → backend:3000
                  │  反向代理     │  admin.xxx.com → 静态文件
                  └──────┬───────┘
                         │
        ┌────────────────┼────────────────────┐
        ▼                ▼                    ▼
  ┌────────────┐   ┌────────────┐      ┌─────────────┐
  │ backend    │   │ admin 静态  │      │ COS / OSS    │
  │ NestJS     │   │ Vue dist   │      │ 对象存储     │
  │ (PM2 ×N)   │   │            │      │（图片）      │
  └─────┬──────┘   └────────────┘      └─────────────┘
        │
        ▼
  ┌────────────┐         ┌────────────┐
  │ MySQL 8    │         │ Sentry     │
  │（主从可选）│         │（错误监控） │
  └────────────┘         └────────────┘
```

**轻量配置**（适合 MVP 上线初期，< 1000 用户）：

- 1 台云服务器：2C4G + 40GB SSD
- 1 个 MySQL 实例（云数据库或同机 Docker）
- 1 个对象存储桶（腾讯云 COS / 阿里云 OSS）

---

## 2. 资源清单

### 2.1 微信小程序

| 项           | 说明                                                               | 操作位置                                 |
| ------------ | ------------------------------------------------------------------ | ---------------------------------------- |
| 小程序 AppID | 在微信公众平台获取后填入 `backend/.env` 和 `mini-app/src/manifest.json` | [微信公众平台](https://mp.weixin.qq.com) |
| AppSecret    | 已在 `backend/.env` 配置                                           | 同上 → 开发管理 → 开发设置               |
| 主体认证     | 个人 / 企业（决定能否开放支付等）                                  | 公众平台 → 设置 → 基本设置               |
| 服务类目     | 推荐选「工具 / 实用工具」或「社交 / 社区」                         | 同上                                     |
| 业务域名     | request 合法域名（必须 HTTPS + ICP 备案）                          | 开发管理 → 服务器域名                    |
| 订阅消息模板 | 4 个：order_accepted / served / rushed / achievement | 功能 → 订阅消息                          |

### 2.2 服务器 & 域名

| 项         | 推荐                                             | 备注                        |
| ---------- | ------------------------------------------------ | --------------------------- |
| 云服务器   | 腾讯云 CVM 2C4G（约 ¥80/月）或轻量               | Ubuntu 22.04 LTS            |
| 域名       | 一个一级域名 + 两个子域名                        | api.xxx.com / admin.xxx.com |
| ICP 备案   | **必须**（中国大陆服务器 + 小程序 request 域名） | 7-20 天，提前办             |
| HTTPS 证书 | Let's Encrypt（免费）或云厂商免费证书            | 90 天自动续期               |
| 对象存储   | 腾讯云 COS（约 ¥0.099/GB/月）                    | 与服务器同区域省流量        |

### 2.3 第三方服务（可选）

| 服务             | 用途                            | 月成本估算               |
| ---------------- | ------------------------------- | ------------------------ |
| Sentry           | 错误监控                        | 免费额度足够 MVP         |
| 微信内容安全 API | 用户 UGC 图文审核               | 免费，每天有调用次数限额 |
| 短信服务         | 暂未用到（如做 admin 密码找回） | 按条计费                 |

---

## 3. 服务器初始化

### 3.1 系统基础

```bash
# 以 ubuntu 用户（或新建一个非 root 用户）登录后
sudo apt update && sudo apt upgrade -y

# 时区
sudo timedatectl set-timezone Asia/Shanghai

# 防火墙：仅开放 22 / 80 / 443
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3.2 Node + pnpm

```bash
# Node 20 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# pnpm
corepack enable
corepack prepare pnpm@9.12.0 --activate
```

### 3.3 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 3.4 MySQL 8（同机 Docker 方式）

```bash
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo usermod -aG docker $USER
# 重新登录使权限生效

# 启动 MySQL
docker run -d --restart=always --name mysql \
  -e MYSQL_ROOT_PASSWORD='【请用强密码替换】' \
  -e MYSQL_DATABASE=family_kitchen \
  -e TZ=Asia/Shanghai \
  -p 127.0.0.1:3306:3306 \
  -v ~/data/mysql:/var/lib/mysql \
  mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci
```

> 生产建议改用云数据库（自动备份、读写分离、慢查询分析）。

### 3.5 PM2（进程管理）

```bash
npm install -g pm2
pm2 startup  # 设置开机自启
```

---

## 4. 部署 backend

### 4.1 拉代码 + 构建

```bash
mkdir -p ~/apps && cd ~/apps
git clone <你的仓库 URL> family-kitchen
cd family-kitchen

pnpm install --frozen-lockfile

# 后端
pnpm --filter @family-kitchen/backend run db:generate
pnpm --filter @family-kitchen/backend run build
```

### 4.2 生产 `backend/.env`

```env
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# 数据库
DATABASE_URL="mysql://root:【强密码】@127.0.0.1:3306/family_kitchen?charset=utf8mb4"

# JWT —— 重新生成一个 64+ 字节随机串
JWT_SECRET=【请用 openssl rand -base64 48 重新生成】
JWT_EXPIRES_IN=30d

# 微信
WX_APPID=your-appid
WX_APP_SECRET=【从微信公众平台获取，建议先轮换一次】

# 订阅消息模板（每个上线前在公众平台申请）
WX_TMPL_ORDER_ACCEPTED=
WX_TMPL_ORDER_SERVED=
WX_TMPL_ORDER_RUSHED=
WX_TMPL_ACHIEVEMENT=

# 对象存储：切到 COS（仍走 S3 协议兼容层即可）
STORAGE_DRIVER=minio
MINIO_ENDPOINT=cos.ap-shanghai.myqcloud.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=【COS SecretId】
MINIO_SECRET_KEY=【COS SecretKey】
MINIO_BUCKET=family-kitchen-prod-1234567890
MINIO_PUBLIC_BASE_URL=https://family-kitchen-prod-1234567890.cos.ap-shanghai.myqcloud.com

# Sentry
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX
SENTRY_ENVIRONMENT=production

LOG_LEVEL=info

# CORS（生产 admin 域名）
CORS_ORIGINS=https://admin.xxx.com

# 后台账号 —— 上线前换强密码
ADMIN_USERNAME=admin
ADMIN_PASSWORD=【强密码】
```

### 4.3 数据库迁移

```bash
cd ~/apps/family-kitchen
pnpm --filter @family-kitchen/backend run db:migrate:deploy
```

### 4.4 PM2 启动

```bash
cd ~/apps/family-kitchen/backend
pm2 start dist/main.js --name backend -i max --max-memory-restart 1G
pm2 save
```

`-i max` 启用集群模式（每个 CPU 核一个进程）；如机器只有 2 核可写 `-i 2`。

### 4.5 健康检查

```bash
curl http://127.0.0.1:3000/api/v1/health
curl http://127.0.0.1:3000/api/v1/health/db
```

---

## 5. 部署 admin

### 5.1 构建

本地（或服务器上）执行：

```bash
# 修改 admin/.env.production
VITE_API_BASE_URL=https://api.xxx.com
VITE_SENTRY_DSN=https://yyy@oYYY.ingest.sentry.io/YYY
VITE_APP_TITLE=情侣厨房 · 管理后台
```

```bash
pnpm --filter @family-kitchen/admin run build
# 产物：admin/dist/
```

### 5.2 上传到服务器

```bash
# 在服务器上
sudo mkdir -p /var/www/admin
# 从本地 rsync 或 scp 上传 admin/dist/* 到 /var/www/admin/
sudo chown -R www-data:www-data /var/www/admin
```

---

## 6. Nginx 配置

### 6.1 反代 backend：`api.xxx.com`

```nginx
# /etc/nginx/sites-available/api.xxx.com
server {
    listen 80;
    server_name api.xxx.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.xxx.com;

    ssl_certificate /etc/letsencrypt/live/api.xxx.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.xxx.com/privkey.pem;

    client_max_body_size 20m;  # 图片上传 10MB 留余量

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # 健康检查不写访问日志
    location = /api/v1/health {
        proxy_pass http://127.0.0.1:3000;
        access_log off;
    }
}
```

### 6.2 admin 静态：`admin.xxx.com`

```nginx
# /etc/nginx/sites-available/admin.xxx.com
server {
    listen 80;
    server_name admin.xxx.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.xxx.com;

    ssl_certificate /etc/letsencrypt/live/admin.xxx.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.xxx.com/privkey.pem;

    root /var/www/admin;
    index index.html;

    # Vue Router history 模式
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6.3 启用 + HTTPS

```bash
sudo ln -s /etc/nginx/sites-available/api.xxx.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.xxx.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.xxx.com -d admin.xxx.com
# 自动续期已经由 systemd timer 处理
```

---

## 7. 对象存储：MinIO → 腾讯云 COS

代码无需改动（StorageService 抽象层走 S3 兼容协议），只需改 `.env`：

1. 在腾讯云 COS 控制台建桶：`family-kitchen-prod-{appid}`，区域选与服务器同区
2. 桶权限改 `公有读私有写`（便于小程序直接展示图片 URL）
3. 跨域规则：允许小程序 / admin 域名 GET
4. 生成子账号 / 临时 keys，最小权限：`cos:GetObject / PutObject / DeleteObject`
5. 把 keys 填进 `backend/.env`（见 §4.2）

> 想要更安全：bucket 改 `私有`，backend 在返回 URL 前用 SDK 生成签名 URL。
> 这套代码已经预留 `StorageService.getSignedUrl()` 接口，前端拿到 url 时无差别使用。

---

## 8. 微信小程序发布

### 8.1 域名白名单

公众平台 → 开发管理 → 服务器域名，**request 合法域名** 加 `https://api.xxx.com`，**uploadFile 合法域名** 加同一域名。如果用 COS，**downloadFile 合法域名** 加 COS 域名。

### 8.2 订阅消息模板

公众平台 → 功能 → 订阅消息 → 我的模板 → 在公共模板库添加 4 个：

| 业务节点 | 推荐模板（公共库关键字） | 字段约束                                |
| -------- | ------------------------ | --------------------------------------- |
| 接单通知 | "订单接单提醒"           | `thing1`=菜品 + `time2`=期望时间        |
| 上菜通知 | "订单完成提醒"           | `thing1`=菜品 + `time2`=上菜时间        |
| 催菜提醒 | "提醒事项"               | `thing1` + `number2`=次数               |
| 成就解锁 | "祝贺通知" / "解锁提醒"  | `thing1`=徽章 + `thing2`=说明 + `time3` |

把 4 个 `tmpl_id` 填到 `backend/.env` 的 `WX_TMPL_*` 字段。

### 8.3 构建上传

```bash
# 在本地或 CI 上
pnpm --filter @family-kitchen/mini-app run build:mp-weixin
# 产物：mini-app/dist/build/mp-weixin/
```

用 **微信开发者工具** 打开该目录 → 「上传」按钮 → 填版本号和备注。
然后在公众平台 → 版本管理 → 提交审核。

### 8.4 隐私协议

在 `mini-app/src/manifest.json` → `mp-weixin.__usePrivacyCheck__` 启用，并在公众平台 → 设置 → 用户隐私保护指引中填好。
小程序若使用 wx.login、wx.getUserProfile、wx.chooseImage 等 API，**2023 年后必须有隐私协议**否则无法发布。

---

## 9. 备份策略

### 9.1 MySQL 每日全量

```bash
# 加入 crontab：每天凌晨 2 点备份，保留 14 天
0 2 * * * docker exec mysql mysqldump -uroot -p'【密码】' family_kitchen | gzip > ~/backups/family_kitchen_$(date +\%Y\%m\%d).sql.gz && find ~/backups -name '*.sql.gz' -mtime +14 -delete
```

### 9.2 对象存储

腾讯云 COS 自带版本控制 + 跨区域复制，控制台开启即可。

---

## 10. 监控与日志

### 10.1 应用日志

PM2 默认把日志写到 `~/.pm2/logs/backend-out.log` 和 `backend-error.log`。轮转：

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 10.2 Sentry

backend 和 mini-app 都已经接 Sentry，DSN 填上即可生效。
默认 `tracesSampleRate: 0.1`，10% 请求做性能追踪。

### 10.3 健康检查

任何监控系统（UptimeRobot / 云监控）拉 `https://api.xxx.com/api/v1/health/db` 即可。HTTP 200 + JSON `{"status":"ok"}` 表示正常。

---

## 11. 升级 / 回滚流程

```bash
cd ~/apps/family-kitchen
git fetch && git checkout <new-tag>
pnpm install --frozen-lockfile
pnpm --filter @family-kitchen/backend run db:migrate:deploy
pnpm --filter @family-kitchen/backend run build
pm2 reload backend  # 零停机滚动重启

# admin 重新构建上传
pnpm --filter @family-kitchen/admin run build
rsync -av admin/dist/ user@server:/var/www/admin/
```

回滚：

```bash
git checkout <previous-tag>
# 数据库迁移基本不能自动回滚，需要看具体改动；预防优于回滚
pm2 reload backend
```

---

## 12. 安全清单

| 项            | 操作                                                       |
| ------------- | ---------------------------------------------------------- |
| MySQL 端口    | 仅 127.0.0.1 监听，禁止公网                                |
| `.env` 文件   | 仅服务器本地，**永不提交 git**                             |
| JWT secret    | 生产单独生成、与开发不同                                   |
| WX_APP_SECRET | 已经在聊天里暴露过的话务必轮换                             |
| 微信内容安全  | 用户上传图片应调微信 `imgSecCheck` API 异步审核            |
| 防 SQL 注入   | Prisma 已经参数化，业务层别拼 SQL                          |
| 速率限制      | ThrottlerModule 默认每分钟 60 次/IP，关键接口可单独调高/低 |
| ICP 备案信息  | 网站底部显示备案号（admin 已留位置）                       |
| 隐私协议      | 必须在小程序内可访问                                       |

---

## 13. 成本估算（MVP 单实例）

| 项              | 月成本（¥）        |
| --------------- | ------------------ |
| CVM 2C4G        | ~80                |
| 域名            | ~5（年付摊月）     |
| HTTPS 证书      | 0（Let's Encrypt） |
| COS 存储 + 流量 | ~10（< 100GB）     |
| Sentry          | 0（免费版）        |
| 微信小程序      | 0                  |
| **合计**        | **~95**            |

如果走云数据库（替代 Docker MySQL）+ CDN 加速，月成本约 ¥200-300。
