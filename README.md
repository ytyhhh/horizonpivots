# Horizon Pivots

Horizon Pivots 将校招机会和博士申请工作区放在一个账号体系中。

| 应用 | 正式地址 | 职责 |
| --- | --- | --- |
| `apps/portal` | `horizonpivots.com` | 平台门户与产品分流 |
| `apps/jobs` | `jobs.horizonpivots.com` | 校招雷达 |
| `apps/phd` | `phd.horizonpivots.com` | PhD Scope |

## 本地开发

```bash
npm install
npm run dev:portal
npm run dev:jobs
npm run dev:phd
```

本地端口分别为 3000、3001、3002。三个应用都需使用同一套 Clerk 开发密钥；jobs 和 PhD 使用同一个 Supabase 项目。

## 验证

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## 部署

为每个 `apps/*` 目录创建一个 Vercel 项目，并在项目中配置对应域名。完整的环境变量、Supabase 迁移和上线检查见 [DEPLOYMENT.md](DEPLOYMENT.md)。
