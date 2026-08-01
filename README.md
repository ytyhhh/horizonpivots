# 校招雷达

面向 2027 届秋招与全年级实习的公开招聘信息聚合和简历匹配 MVP。

项目在没有云服务密钥时可以完整运行演示模式；配置 Supabase 和 OpenAI 后，会自动启用邮箱验证码、私有临时简历存储、结构化解析、用户画像、收藏、真实数据同步和公开网页发现。

## 技术栈

- Next.js 16.2.11 Active LTS、React 19、TypeScript、Tailwind CSS v4
- Supabase PostgreSQL、Auth、Storage、RLS、pgvector、pg_cron、pg_net
- OpenAI Responses API、`gpt-5.6-luna`、`text-embedding-3-small`
- Vitest、Playwright

## 本地启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。空环境变量会启用演示模式。

## 启用真实后端

1. 创建 Supabase 项目，使用 Supabase CLI 关联项目。
2. 执行 `supabase db push` 应用 `supabase/migrations`。
3. 在 Supabase 邮件模板中将 OTP 显示为六位验证码。
4. 在 `.env.local` 填写：

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
CRON_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY`、`OPENAI_API_KEY` 和 `CRON_SECRET` 仅允许在服务端使用，禁止添加 `NEXT_PUBLIC_` 前缀。

## 数据同步

先在无数据库模式验证远端格式：

```bash
npm run ingest:xixicc
```

配置 Supabase 后，同一命令会将岗位幂等写入 `jobs`。线上定时入口：

- `GET /api/cron/ingest`：每 6 小时同步 `xixicc2027`
- `GET /api/cron/discover`：每天搜索新的企业官方招聘页面，候选只进入审核队列

两个入口都要求 `Authorization: Bearer $CRON_SECRET`。Vercel Cron 已在 `vercel.json` 配置；如果使用 Supabase Cron，先把生产域名和任务密钥放入 Vault，再执行 `supabase/cron.example.sql`。

### 港中深专属岗位

仓库内的 GitHub Action 每日抓取香港中文大学（深圳）职业规划与发展处公开岗位页的前七页（当前每页 20 条），再发送到生产接口。只有 Clerk 主邮箱为 `@link.cuhk.edu.cn` 的账号会得到这些岗位；服务端和 Supabase RLS 都不会向其他账号返回它们。

抓取过程分为两个可恢复阶段：

1. 抓完七页列表后，立即幂等写入基础岗位信息。
2. 使用最多 4 个并发请求读取公开详情页，将纯文本“工作内容描述”分批（每 25 条）补写到 `jobs.description`。

因此，若详情页抓取被网络错误或任务时限打断，已经发现的岗位仍会保留在数据库中；下次任务会继续补全描述。描述字段最长 12,000 个字符，不保存原始 HTML、图片或附件。

应用 `202608010003_cuhksz_exclusive_jobs.sql` 和 `202608010004_job_descriptions.sql` 后，在 GitHub 仓库 **Settings → Secrets and variables → Actions** 添加：

```dotenv
CAMPUS_RADAR_INGEST_URL=https://jobs.horizonpivots.com
CAMPUS_RADAR_CRON_SECRET=<与 Vercel 的 CRON_SECRET 相同>
```

随后在 Actions 中手动运行一次 **Ingest CUHK-Shenzhen jobs**。手动运行时选择 `main` 分支，确保使用最新脚本；可在运行详情中确认提交 SHA。工作流每天 09:19（中国标准时间）自动执行。

也可用 GitHub CLI 触发并查看最新任务：

```bash
gh workflow run cuhksz-jobs.yml --repo ytyhhh/hiring --ref main
gh run list --repo ytyhhh/hiring --workflow cuhksz-jobs.yml
```

## 简历隐私

- 仅接受 PDF、DOCX，最大 5 MB。
- 真实模式下文件先进入按用户隔离的私有 `resume-temp` 桶。
- 模型请求设置 `store: false`，附件被视为不可信数据，不允许改变系统指令。
- 原文件在成功或失败路径的 `finally` 中删除。
- 结构化画像不包含姓名、电话、邮箱、照片、性别、年龄、民族和详细地址。

## 质量检查

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Playwright 首次运行前可能需要：

```bash
npx playwright install chromium
```

## 部署

1. 将仓库导入 Vercel。
2. 在 Vercel 添加 `.env.example` 中的变量。
3. 将 `NEXT_PUBLIC_SITE_URL` 改为正式域名。
4. 在 Supabase Auth 添加正式域名和 `/auth/callback` 回调地址。
5. 应用数据库迁移并运行一次 `/api/cron/ingest`。
6. 为管理员用户设置 `user_metadata.role = admin`。

岗位描述、截止日期和申请资格可能变化，产品始终回链原始招聘页面；港中深来源仅保留长度受限的纯文本岗位描述，不保存原始 HTML、图片或附件。
