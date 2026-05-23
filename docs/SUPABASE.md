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
- 环境变量：`SUPABASE_*`、`AI_*`、`PUBLIC_API_BASE`（若需要）

### Vercel（仅静态前端）

1. Root Directory 指向 `public`，或把 `public/` 作为站点根目录。
2. 在 `public/js/runtime-config.js` 中设置 API 地址，或在构建时生成：

```javascript
window.__RUNTIME_CONFIG__ = { apiBase: 'https://your-api.onrender.com/api' };
```

3. 确保 Render API 已开启 CORS（服务端已设置 `Access-Control-Allow-Origin: *`）。

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
