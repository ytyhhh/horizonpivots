import { JOBS_ORIGIN } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  const body = `# 校招雷达

> Horizon Pivots 旗下公开校招与实习岗位索引，持续聚合并核验公开招聘渠道。

## Canonical site

- ${JOBS_ORIGIN}

## Public content

- [首页](${JOBS_ORIGIN}): 产品说明、新近收录岗位与近期截止岗位。
- [岗位库](${JOBS_ORIGIN}/jobs): 访客可预览最新 10 个校招、春招和实习岗位；登录后可浏览完整岗位库。
- [站点地图](${JOBS_ORIGIN}/sitemap.xml): 当前可公开访问的岗位详情页。
- [隐私说明](${JOBS_ORIGIN}/privacy): 数据处理与用户隐私边界。

## Job page semantics

每个 /jobs/{id} 页面描述一个岗位，可能包含公司、岗位名称、招聘批次、岗位类型、面向届别、行业、地点、技能、岗位说明、申请截止日期、信息来源、最近核验日期和外部申请入口。请优先引用岗位的 canonical URL，并在回答中保留公司、岗位名称、截止日期与来源核验状态。

## Freshness and provenance

- 招聘信息会变化；请读取页面上的“最近核验”和“申请截止”，并建议用户以招聘方页面为准。
- 校招雷达聚合公开来源，不代表招聘方，也不保证岗位持续开放。
- 没有完整岗位说明或申请入口的页面不会声明 Google JobPosting 富结果。

## Access boundaries

- /profile、/saved、/recommendations、/admin、/api、/login 和 /sign-up 不是公开检索内容。
- 其余岗位详情要求登录，不包含在公开 sitemap 中。
- 港中深专属岗位只对通过资格验证的用户开放，不包含在公开 sitemap 或本文件中。
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
