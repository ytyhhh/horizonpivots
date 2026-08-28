# Horizon Pivots 部署清单

## 共享配置

所有 Vercel 项目使用同一 Clerk instance，并配置：

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_PLATFORM_URL=https://horizonpivots.com`
- `NEXT_PUBLIC_JOBS_URL=https://jobs.horizonpivots.com`
- `NEXT_PUBLIC_PHD_URL=https://phd.horizonpivots.com`
- `NEXT_PUBLIC_CUHK_SZ_URL=https://cuhksz.horizonpivots.com`
- `NEXT_PUBLIC_DP_URL=https://dp.horizonpivots.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

jobs 和 PhD 还需要 `SUPABASE_SERVICE_ROLE_KEY`。DP 使用独立的服务端 `DP_DATABASE_ACCESS_KEY`，只授权 `dp_*` 数据；该变量绝不能加上 `NEXT_PUBLIC_` 前缀。PhD 导师搜索当前关闭，因此暂时不需要 `GITHUB_DISPATCH_TOKEN` 或搜索服务密钥。

在 Clerk Dashboard 中将五个 Origin 加入允许重定向列表，登录页面固定为 `https://horizonpivots.com/login`。同根域入口共享同一 Clerk 会话，不配置 satellite 模式。DP 仅使用 Clerk 识别房主，受邀朋友不注册账号，也不启用 Supabase Anonymous Auth。

## Supabase

1. 在现有 hiring 项目中启用 Clerk Third-Party Auth，并填入同一个 Clerk domain。
2. 备份生产数据库。
3. 从仓库根目录执行：

```bash
cd apps/jobs
npx supabase db push
```

4. 确认 `202608110001_horizon_platform_phd.sql` 已创建 `phd_*` 表和 `phd-resumes` 私有 bucket。
5. 确认 `202608130002_cuhksz_clerk_reviews.sql` 已创建 `cuhksz_*` 课程、食堂、评价与收藏表。
6. 确认 `20260823171846_dp_private_poker.sql` 已创建 `dp_*` 公共业务表、`private.dp_*` 私密状态表、原子 RPC、广播触发器和清理 cron。
7. 确认 `20260828074237_dp_scoped_server_access.sql` 已启用 DP 专用服务密钥校验，并修复清理 cron 的 pgcrypto 调用。

## Vercel

| Vercel 项目 | Root Directory | 域名 |
| --- | --- | --- |
| Portal | `apps/portal` | `horizonpivots.com`、`www.horizonpivots.com` |
| Jobs | `apps/jobs` | `jobs.horizonpivots.com` |
| PhD | `apps/phd` | `phd.horizonpivots.com` |
| 港中声 | `apps/cuhksz` | `cuhksz.horizonpivots.com` |
| 私密好友牌桌 | `apps/dp` | `dp.horizonpivots.com` |

根目录的 Build Command 使用 `npm run build --workspace=<workspace>`，或让 Vercel 在对应 Root Directory 执行 `npm run build`。jobs 项目的 `vercel.json` 继续负责现有的招聘 cron。

## 将来开启时：GitHub Actions 搜索 worker

PhD 搜索通过根目录的 `.github/workflows/phd-search.yml` 运行。功能默认关闭；未来将 `NEXT_PUBLIC_PHD_SEARCH_ENABLED` 设为 `true` 后，再创建一个仅限 `ytyhhh/horizonpivots` 仓库、`Contents: Read and write` 的 Fine-grained PAT，并将其作为 `GITHUB_DISPATCH_TOKEN` 配置到 PhD Vercel 项目。

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
- 在 portal 登录后打开港中声，确认同一账号可提交收藏与评价。
- 在 PhD 退出后确认 jobs 会话同步失效。
- 使用两个测试账号验证 `phd_search_jobs`、收藏、草稿和 `phd-resumes` 互相隔离。
- 发起一项 PhD 搜索，确认任务状态从 queued 更新到 complete、partial 或 failed。
- 检查 jobs 的画像、收藏、推荐、管理员页面和 cron 仍正常。
- 使用两个 Clerk 测试账号验证 `cuhksz_reviews` 和 `cuhksz_favorites` 互相隔离。
- 确认只有 `DP_OWNER_CLERK_USER_ID` 能创建和管理牌桌，其他 Horizon Pivots 账号只能像访客一样凭房间号加入。
- 从 Supabase Data API 不带正确 `X-DP-Server-Key` 访问 `dp_*` 表，确认全部被 RLS 拒绝。
- 用错误、过期和已重置房间号验证统一失败响应，并确认正确房间号能设置 HttpOnly 访客 Cookie 后恢复同一座位。
- 检查 DP 不在 Portal、产品切换器或 Sitemap 中，并确认所有 DP 页面响应 `X-Robots-Tag: noindex, nofollow, noarchive`。
