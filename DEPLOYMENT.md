# Horizon Pivots 部署清单

## 共享配置

所有 Vercel 项目使用同一 Clerk instance，并配置：

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_PLATFORM_URL=https://horizonpivots.com`
- `NEXT_PUBLIC_JOBS_URL=https://jobs.horizonpivots.com`
- `NEXT_PUBLIC_PHD_URL=https://phd.horizonpivots.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

jobs 和 PhD 还需要 `SUPABASE_SERVICE_ROLE_KEY`。PhD 在 Vercel 额外需要 `GITHUB_DISPATCH_TOKEN`，以及其搜索服务密钥。

在 Clerk Dashboard 中将三个 Origin 加入允许重定向列表，登录页面固定为 `https://jobs.horizonpivots.com/login`。三个同根域入口共享同一 Clerk 会话，不配置 satellite 模式。

## Supabase

1. 在现有 hiring 项目中启用 Clerk Third-Party Auth，并填入同一个 Clerk domain。
2. 备份生产数据库。
3. 从仓库根目录执行：

```bash
cd apps/jobs
npx supabase db push
```

4. 确认 `202608110001_horizon_platform_phd.sql` 已创建 `phd_*` 表和 `phd-resumes` 私有 bucket。

## Vercel

| Vercel 项目 | Root Directory | 域名 |
| --- | --- | --- |
| Portal | `apps/portal` | `horizonpivots.com`、`www.horizonpivots.com` |
| Jobs | `apps/jobs` | `jobs.horizonpivots.com` |
| PhD | `apps/phd` | `phd.horizonpivots.com` |

根目录的 Build Command 使用 `npm run build --workspace=<workspace>`，或让 Vercel 在对应 Root Directory 执行 `npm run build`。jobs 项目的 `vercel.json` 继续负责现有的招聘 cron。

## GitHub Actions 搜索 worker

PhD 搜索通过根目录的 `.github/workflows/phd-search.yml` 运行。创建一个仅限 `ytyhhh/horizonpivots` 仓库、`Contents: Read and write` 的 Fine-grained PAT，并将其作为 `GITHUB_DISPATCH_TOKEN` 配置到 PhD Vercel 项目。

在 GitHub 仓库的 Actions Secrets 中配置：

- `PHD_SUPABASE_URL`
- `PHD_SUPABASE_SERVICE_ROLE_KEY`
- `PHD_SILICONFLOW_API_KEY`
- `PHD_SILICONFLOW_BASE_URL`（可选）
- `PHD_SILICONFLOW_MODEL`（可选）
- `PHD_BRAVE_SEARCH_API_KEY`（可选）
- `PHD_SEMANTIC_SCHOLAR_API_KEY`（可选）

工作流只收到搜索任务 ID，再从 Supabase 读取查询内容，避免将用户的研究资料放进 GitHub 事件载荷。

## 发布后检查

- 在 jobs 登录后打开 PhD，确认同一账号自动可用。
- 在 PhD 退出后确认 jobs 会话同步失效。
- 使用两个测试账号验证 `phd_search_jobs`、收藏、草稿和 `phd-resumes` 互相隔离。
- 发起一项 PhD 搜索，确认任务状态从 queued 更新到 complete、partial 或 failed。
- 检查 jobs 的画像、收藏、推荐、管理员页面和 cron 仍正常。
