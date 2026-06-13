# Mini-app · 微信小程序

uni-app + Vue 3 + JavaScript（Vite 模式），完整对接 backend 全套 API。

## 快速开始

```bash
# 1. 配置 API 地址（默认指向本地 http://localhost:3000/api/v1）
cp .env.example .env

# 2. 装依赖（仓库根目录）
pnpm install

# 3. 启动编译
pnpm --filter @family-kitchen/mini-app run dev:mp-weixin
# 产物输出到 dist/dev/mp-weixin/
```

然后用 **微信开发者工具** 打开 `dist/dev/mp-weixin/` 调试。

AppID 在 `src/manifest.json` → `mp-weixin.appid` 中配置，请替换为你自己的小程序 AppID。

## 完整页面结构

```
src/pages/
├── auth/login                登录（wx.login → /auth/wx-login）
│
├── tabbar/
│   ├── home/home             首页：活跃订单 + 4 个快捷入口
│   ├── menu/menu             菜单：搜索 + 标签筛选 + 收藏
│   ├── timeline/timeline     时间线瀑布流
│   └── profile/profile       我的：余额 + 成就 + 设置入口
│
├── family/
│   ├── setup                 创建/加入小厨房
│   └── settings              改名 + 邀请码分享 + 退出
│
├── recipe/
│   ├── detail                菜谱详情 + 收藏 + 点这道
│   └── edit                  新建/编辑（含图片上传）
│
├── order/
│   ├── create                选厨师 + 选菜 + 备注 + 时间
│   ├── detail                状态机 UI + 消息流 + 评价
│   └── history               历史订单（我点的 / 我做的）
│
├── timeline/
│   ├── monthly               月度回顾（含图表）
│   └── manual                手动补记
│
└── profile/
    ├── love-points           爱心币余额 + 流水 + 撤回打赏
    ├── achievements          成就墙（我的 / 家庭）
    ├── edit                  编辑资料（昵称/头像/签名）
    ├── feedback              意见反馈
    └── about                 关于 + 协议
```

## API / Store

```
src/api/
├── http.js          axios 风格 uni.request 封装
├── auth.js          wx-login
├── user.js          /users/me CRUD + 注销
├── family.js        家庭空间 + 邀请码
├── recipe.js        菜谱 CRUD + 收藏
├── order.js         订单 + 状态机 + 评价
├── message.js       订单消息 + 表情 + 催菜 + 打赏
├── love-point.js    余额 + 流水 + 撤回
├── timeline.js      时间线 + 月度回顾 + 手动补记
├── achievement.js   成就
├── storage.js       图片上传（uni.uploadFile）
└── feedback.js      反馈

src/stores/
├── auth.js          token + user
├── family.js        当前家庭
└── active-order.js  当前活跃订单
```

## 联调关键点

1. **后端先起**：`pnpm dev:backend`，确保 `http://localhost:3000/api/v1/docs` Swagger 可访问
2. **手机/模拟器访问 localhost**：微信开发者工具默认能访问 localhost；真机需要 ngrok 等内网穿透
3. **小程序 request 域名白名单**：开发期在工具里勾选「不校验合法域名」；正式上线前必须 ICP 备案 + HTTPS
4. **MinIO 公开域名**：本机 MinIO 跑在 `localhost:9000`，小程序也访问得到；上线时切到 COS/OSS
5. **首次登录**：wx.login 拿 code → 后端 jscode2session（需要 WX_APP_SECRET 已配置在 backend/.env）

## 设计风格

主色 `#ff6b9d`（情侣粉），卡片白底圆角 16rpx，背景 `#f7f8fa`。
所有状态色统一在 `src/utils/labels.js`。
