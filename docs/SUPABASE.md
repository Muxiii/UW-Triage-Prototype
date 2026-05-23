# Supabase 数据存储

原型默认使用 `data/db.json`。配置 Supabase 后，API 会改为读写 Postgres，便于在 **Render（后端）** 与 **Vercel（静态前端）** 之间共享同一份数据。

## 架构

```
Vercel（admin / researcher 静态页）
    │  fetch(PUBLIC_API_BASE/…)
    ▼
Render（node server.mjs + AI）
    │  service role
    ▼
Supabase（flows + published_snapshots）
```

前端仍通过 REST API 访问数据（`/api/flows` 等），**不要**把 `SUPABASE_SERVICE_ROLE_KEY` 放到浏览器。

## 1. 创建 Supabase 项目

1. [supabase.com](https://supabase.com) 新建项目。
2. **SQL Editor** 中执行 `supabase/migrations/001_initial.sql`。
3. **Project Settings → API** 复制：
   - Project URL → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`（仅服务器、仅 `.env`）

## 2. 本地 / Render 环境变量

在 `.env` 或 Render 环境变量中增加：

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 可选：前端在别的域名时，API 完整前缀（含 /api）
PUBLIC_API_BASE=https://your-api.onrender.com/api
```

未设置 Supabase 变量时，自动回退到 `data/db.json`。

## 3. 迁移现有 db.json

```bash
npm run db:migrate
```

会读取 `data/db.json` 并 upsert 到 Supabase。

## 4. 部署

### Render（推荐跑 API + AI）

- Build: `npm install`
- Start: `npm start`
- 环境变量（**必填**）：`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`AI_PROVIDER`、`AI_API_KEY`
- 启动日志应出现：`[store] using supabase backend`。若为 `file backend` 或报错 `EROFS ... db.json`，说明 Supabase 变量未生效。
- `PUBLIC_API_BASE`（仅 Render 同时托管前端时可选）

### Vercel（仅静态前端）

**Vercel 不要跑 `server.mjs`。** API 只在 Render 上运行；Supabase 变量配在 **Render**，不是 Vercel。若 Vercel Logs 出现 `/var/task` 或 `getStore` 报错，说明误把后端部署到了 Vercel——检查项目 **不要** 设置 Start Command / `npm start`，并确保仓库含 `.vercelignore`。

1. **Root Directory 必须留空**（仓库根目录）。若设成 `public`，会变成 `public/public` 输出，整站 **404**。
2. 首页 `/` 会跳转到 `/admin.html`；也可直接访问 `/admin.html`、`/researcher.html`。
3. **Settings → Environment Variables** 添加（与 Vite 项目相同）：

   `VITE_API_BASE` = `https://your-api.onrender.com/api`

   部署时会运行 `npm run vercel:build`，把该值写入 `public/js/runtime-config.js`。

4. 确保 Render API 已开启 CORS（服务端已设置 `Access-Control-Allow-Origin: *`）。

### 同域部署

前后端都在同一 Render 服务时，无需改 `PUBLIC_API_BASE`，默认 `/api` 即可。

## 表结构

| 表 | 说明 |
|----|------|
| `flows` | `id` + `document`（完整 flow JSON） |
| `published_snapshots` | 发布快照，`publish_scope` 为 `PUBLIC` / `INTERNAL` |

## 安全说明

- **service_role** 绕过 RLS，只放在服务器。
- 当前迁移里的 RLS 允许匿名 `SELECT`（便于以后直连 Supabase 读公开 KB）；写操作仍应只走 API + service role。
- 生产环境建议收紧 RLS、加认证后再对公网开放。
