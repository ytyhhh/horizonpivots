# Horizon Pivots 项目配置指南

本仓库是 Horizon Pivots 的 npm workspaces 单仓库，GitHub 仓库为 `ytyhhh/horizonpivots`。

| 产品 | 代码目录 | 正式域名 | Vercel 项目 |
| --- | --- | --- | --- |
| 平台门户 | `apps/portal` | `horizonpivots.com` | `horizon-portal` |
| 校招雷达 | `apps/jobs` | `jobs.horizonpivots.com` | 保留现有 jobs 项目 |
| PhD Scope | `apps/phd` | `phd.horizonpivots.com` | `horizon-phd` |

> 不要将任何实际密钥提交到 GitHub。`.env.local` 已被忽略；生产密钥只配置在 Vercel 和 GitHub Actions Secrets。

## 1. GitHub

仓库地址：<https://github.com/ytyhhh/horizonpivots>

GitHub Actions 工作流必须位于仓库根目录 `.github/workflows/`。其中：

- 招聘采集工作流保留在根目录，脚本已改为从 `apps/jobs/scripts/` 运行。
- `phd-search.yml` 接收 PhD 网站发出的 `repository_dispatch` 事件，执行耗时导师搜索并回写 Supabase。

### 将来开启 PhD 搜索时：创建触发令牌

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**。
2. 创建 token，只选择仓库 `ytyhhh/horizonpivots`。
3. 在 **Repository permissions** 中将 `Contents` 设为 **Read and write**。
4. 将 token 保存到 PhD Vercel 项目的 `GITHUB_DISPATCH_TOKEN`。

此 token 只用于从 PhD 后端触发 GitHub Action，不能放入浏览器变量或 GitHub 代码。

### 将来开启 PhD 搜索时：配置 GitHub Actions Secrets

仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**。

必填：

```text
PHD_SUPABASE_URL
PHD_SUPABASE_SERVICE_ROLE_KEY
```

建议配置：

```text
PHD_SILICONFLOW_API_KEY
PHD_BRAVE_SEARCH_API_KEY
PHD_SEMANTIC_SCHOLAR_API_KEY
```

可选覆盖项：

```text
PHD_SILICONFLOW_BASE_URL
PHD_SILICONFLOW_MODEL
```

GitHub Action 只接收搜索任务 ID，再从 Supabase 读取用户查询内容，避免把研究描述放在 GitHub 事件载荷或日志中。

## 2. Supabase

三个应用共用现有 hiring Supabase 项目。

### 获取项目值

Supabase Dashboard → 项目 → **Settings** → **API Keys**：

```text
NEXT_PUBLIC_SUPABASE_URL = Project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = Publishable key
SUPABASE_SERVICE_ROLE_KEY = Secret key 或 legacy service_role key
```

`SUPABASE_SERVICE_ROLE_KEY` 仅可用于 Vercel 服务端和 GitHub Actions；它拥有绕过 RLS 的权限，绝不能使用 `NEXT_PUBLIC_` 前缀。

### 应用数据库迁移

先备份生产数据库，然后从仓库根目录执行：

```bash
cd apps/jobs
npx supabase link
npx supabase db push
```

需要确认迁移 `202608110001_horizon_platform_phd.sql` 已创建：

- `phd_profiles`
- `phd_search_jobs`
- `phd_faculty_recommendations`
- `phd_shortlist_entries`
- `phd_email_drafts`
- 私有 Storage bucket：`phd-resumes`

不要运行 `apps/phd/supabase/migrations/0001_initial.sql`，它仅作为原型历史留存。

### Clerk Third-Party Auth

Supabase Dashboard → **Authentication** → **Third-party Auth** → 启用 Clerk，并填写当前 Clerk instance 的信息。数据库 RLS 以 Clerk JWT 的 `sub` 作为用户 ID。

## 3. Clerk

三个应用必须使用同一个 Clerk Production instance。

在 Clerk Dashboard 的允许来源、重定向地址或域名配置中加入：

```text
https://horizonpivots.com
https://jobs.horizonpivots.com
https://phd.horizonpivots.com
```

统一登录入口：

```text
https://jobs.horizonpivots.com/login
```

三个 Vercel 项目使用相同的：

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
```

同一根域的子域默认共享 Clerk 会话，无需 satellite 模式。

## 4. Vercel

### 校招雷达 jobs

保留现有 Vercel 项目，不要新建。

1. **Settings** → **Git**：确认仓库为 `ytyhhh/horizonpivots`。
2. **Settings** → **General** → **Root Directory**：设为 `apps/jobs`。
3. 开启构建时读取 Root Directory 外源文件的选项，以便引用 `packages/platform`。
4. 保留 `jobs.horizonpivots.com`、原有 cron 和招聘环境变量。

生产变量：

```text
NEXT_PUBLIC_SITE_URL=https://jobs.horizonpivots.com
NEXT_PUBLIC_PLATFORM_URL=https://horizonpivots.com
NEXT_PUBLIC_JOBS_URL=https://jobs.horizonpivots.com
NEXT_PUBLIC_PHD_URL=https://phd.horizonpivots.com

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SILICONFLOW_API_KEY=
CRON_SECRET=
```

现有 `apps/jobs/vercel.json` 只属于 jobs 项目，保留招聘 cron。

### PhD Scope

Vercel → **Add New** → **Project** → 导入 `ytyhhh/horizonpivots`：

```text
Project Name: horizon-phd
Root Directory: apps/phd
Domain: phd.horizonpivots.com
```

生产变量：

```text
NEXT_PUBLIC_PLATFORM_URL=https://horizonpivots.com
NEXT_PUBLIC_JOBS_URL=https://jobs.horizonpivots.com
NEXT_PUBLIC_PHD_URL=https://phd.horizonpivots.com

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GITHUB_DISPATCH_TOKEN=
GITHUB_DISPATCH_REPOSITORY=ytyhhh/horizonpivots
NEXT_PUBLIC_PHD_SEARCH_ENABLED=false

SILICONFLOW_API_KEY=
SILICONFLOW_BASE_URL=https://api.siliconflow.com/v1
SILICONFLOW_MODEL=Qwen/Qwen3-32B
BRAVE_SEARCH_API_KEY=
SEMANTIC_SCHOLAR_API_KEY=
```

导师搜索当前未上线，保持 `NEXT_PUBLIC_PHD_SEARCH_ENABLED=false`，且不需要配置 `GITHUB_DISPATCH_TOKEN`、GitHub Actions Secrets、Brave 或 Semantic Scholar。未来开启时再将该变量改为 `true` 并完成前述 GitHub 配置。仍然不配置 `TRIGGER_SECRET_KEY` 或任何 `TRIGGER_*` 变量。

### 平台门户 portal

再导入同一仓库：

```text
Project Name: horizon-portal
Root Directory: apps/portal
Domains: horizonpivots.com, www.horizonpivots.com
```

生产变量：

```text
NEXT_PUBLIC_PLATFORM_URL=https://horizonpivots.com
NEXT_PUBLIC_JOBS_URL=https://jobs.horizonpivots.com
NEXT_PUBLIC_PHD_URL=https://phd.horizonpivots.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

将 `horizonpivots.com` 设为主域名，`www.horizonpivots.com` 将由门户跳转到根域。

## 5. Porkbun DNS

先在 Vercel 对应项目添加域名，再复制 Vercel 展示的精确 DNS 值到 Porkbun。通常为：

| 类型 | Host | 指向 |
| --- | --- | --- |
| A | `@` | Vercel 要求的根域 IP，通常为 `76.76.21.21` |
| CNAME | `www` | portal 项目给出的 Vercel CNAME |
| CNAME | `jobs` | jobs 项目给出的 Vercel CNAME |
| CNAME | `phd` | PhD 项目给出的 Vercel CNAME |

在 Porkbun 的 **Domain Management** → 域名 → **DNS** 中填写。`Host` 只填写 `@`、`www`、`jobs`、`phd`，不要填写完整域名。删除同名冲突的 A、AAAA 或 CNAME 记录，但不要删除 MX、TXT 等邮件记录。

## 6. 将来开启时：PhD 搜索工作流验证

1. 完成 Supabase 迁移、GitHub Actions Secrets 和 PhD Vercel 变量。
2. 部署 `horizon-phd`。
3. 使用 Clerk 登录，发起导师搜索。
4. 在 GitHub 仓库 **Actions** 中确认出现 `Run PhD faculty search`。
5. 在 PhD 页面轮询搜索状态，确认其从 `queued` → `running` → `complete`、`partial` 或 `failed`。
6. 使用第二个 Clerk 测试账号确认无法读取第一个账号的搜索、收藏、草稿和简历。

## 7. 发布顺序

1. 备份 Supabase 并应用增量迁移。
2. 配置 Clerk；PhD 搜索相关的 GitHub Actions Secrets 可待功能开启时再配置。
3. 更新已有 jobs Vercel 项目的 Root Directory 并部署。
4. 创建并部署 PhD Vercel 项目，先验证院校浏览和统一登录。
5. 创建并部署 portal Vercel 项目，绑定根域与 `www`。
6. 完成 Porkbun DNS 后，确认三个 HTTPS 域名和跨子域登录。
