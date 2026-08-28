# Horizon Pivots

Horizon Pivots 将校招、博士申请和校园生活工具放在一个账号体系中，并提供一个不公开展示的私密好友德扑工具。

| 应用 | 正式地址 | 职责 |
| --- | --- | --- |
| `apps/portal` | `horizonpivots.com` | 平台门户与产品分流 |
| `apps/jobs` | `jobs.horizonpivots.com` | 校招雷达 |
| `apps/phd` | `phd.horizonpivots.com` | PhD Scope |
| `apps/cuhksz` | `cuhksz.horizonpivots.com` | 港中声课程与校园设施评价 |
| `apps/dp` | `dp.horizonpivots.com` | 仅限受邀成年朋友的娱乐筹码德扑桌，不在 Portal 展示 |

## 本地开发

```bash
npm install
npm run dev:portal
npm run dev:jobs
npm run dev:phd
npm run dev:cuhksz
npm run dev:dp
```

本地端口分别为 3000、3001、3002、3003、3004。需要登录的应用使用同一套 Clerk 密钥；所有需要持久化数据的应用使用同一个 Supabase 项目。DP 只有配置的房主 Clerk 账号能够开桌和管理，朋友通过短时房间号加入。

## 验证

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## 部署

为每个 `apps/*` 目录创建一个 Vercel 项目，并在项目中配置对应域名。完整的环境变量、Supabase 迁移和上线检查见 [DEPLOYMENT.md](DEPLOYMENT.md)。
