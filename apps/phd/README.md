# PhD Scope

PhD Scope 是 Horizon Pivots 的博士申请工作区，部署于 `phd.horizonpivots.com`。用户先选择学校，再在选定院校范围内搜索、核验和比较潜在导师。

## 认证与数据

- 使用与校招雷达相同的 Clerk 账号和会话。
- 院校浏览公开；发起搜索、保存导师、生成邮件、上传简历均要求登录。
- 数据写入共享 Supabase 项目的 `phd_*` 表；表级 RLS 用 Clerk JWT 的 `sub` 作为用户 ID。
- 搜索任务由 Trigger.dev 执行并持久化，不依赖单个 Next.js 实例内存。

## 本地运行

从仓库根目录执行：

```bash
npm run dev:phd
```

复制 `.env.example` 为 `.env.local`，并填写与其他 Horizon Pivots 应用相同的 Clerk 和 Supabase 环境变量。PhD 专属搜索密钥和 `TRIGGER_SECRET_KEY` 也必须配置。

## 数据库

迁移位于 `apps/jobs/supabase/migrations/202608110001_horizon_platform_phd.sql`，在共享 hiring Supabase 项目中执行。不要运行旧的 `apps/phd/supabase/0001_initial.sql`，该文件只保留作原型历史参考。
