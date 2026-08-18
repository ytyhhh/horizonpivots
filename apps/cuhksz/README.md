# 港中声

Horizon Pivots 的课程与食堂评价产品。它是一个 Next.js 应用：页面和 API 都由 Vercel 的 Next.js 运行时处理；登录、收藏和匿名评价使用平台共用的 Clerk 账号与现有 Supabase 项目。

## 本地运行

```bash
npm run dev --workspace=@horizon/cuhksz
```

打开 `http://127.0.0.1:3000`。本地未配置环境变量时不会加载线上课程目录，也不会模拟登录或写入数据。

## Supabase

生产数据库迁移位于：

[`apps/jobs/supabase/migrations/202608130002_cuhksz_clerk_reviews.sql`](../jobs/supabase/migrations/202608130002_cuhksz_clerk_reviews.sql)

在当前 Horizon Pivots Supabase 项目中执行这一个增量迁移。它会创建以下独立数据表：

- `cuhksz_courses`
- `cuhksz_course_offerings`
- `cuhksz_dining_halls`
- `cuhksz_dishes`
- `cuhksz_reviews`
- `cuhksz_favorites`

个人数据列使用 Clerk `user_…` ID 的 `text` 类型。RLS 通过 `auth.jwt()->>'sub'` 隔离收藏、草稿评价和待审核评价，不使用 Supabase Auth 或 `auth.users`。

[`supabase/seed.sql`](supabase/seed.sql) 不会写入演示数据。生产数据导入应使用服务端受控脚本或 Supabase SQL Editor，不能向浏览器暴露 Service Role key。

如需导入仓库内已有的课程和开课教师目录，在本地终端运行：

```bash
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<secret-key> \
npm run import:catalog --workspace=@horizon/cuhksz
```

该脚本只写入公开课程与开课目录，不导入旧评价内容，也不会把 Service Role key 上传到 Vercel。

### 官方课程目录

官网默认课程页不是全量结果。[`scripts/crawl_official_courses.py`](scripts/crawl_official_courses.py) 使用 Scrapling 遍历官网全部 `major` 筛选项、去重课程详情页，并带请求延时抓取课程描述。运行它前请安装 `scrapling[all]`；抓取结果必须经过服务端受控导入流程写入数据库。

## Clerk

本应用没有独立注册或 Supabase OTP。未登录用户会前往：

```text
https://horizonpivots.com/login?redirect_url=<原始页面>
```

登录完成后会返回本产品。前端将 Clerk session token 交给 Supabase JS 客户端的 `accessToken()`，以便由现有 Third-Party Auth 集成验证 RLS。

在 Clerk Production 实例中：

1. 使用与 portal、jobs、phd 相同的 `pk_live` / `sk_live` 实例。
2. 将 `cuhksz.horizonpivots.com` 加入 Allowed Subdomains。
3. 若要仅限校园成员，请在 Clerk 的注册策略或组织成员流程中限制 `link.cuhk.edu.cn`。不能仅靠浏览器端邮箱校验实现权限限制。

## Vercel

新建一个 Vercel 项目并连接 `ytyhhh/horizonpivots`：

```text
Root Directory: apps/cuhksz
Framework Preset: Next.js
Build Command: npm run build
```

添加以下环境变量到 Production 和 Preview：

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_PLATFORM_URL=https://horizonpivots.com
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

绑定建议域名 `cuhksz.horizonpivots.com`。部署后先打开 `/api/health`，确认返回 `ok: true`，再测试登录、收藏和评价提交。
