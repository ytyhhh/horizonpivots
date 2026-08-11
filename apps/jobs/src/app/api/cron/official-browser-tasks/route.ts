import { isCronAuthorized } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertSafePublicUrl } from "@/lib/ingestion/web-safety";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return Response.json({ message: "Unauthorized" }, { status: 401 });
  const requested = Number(new URL(request.url).searchParams.get("limit") ?? 10);
  const limit = Math.min(Math.max(Number.isFinite(requested) ? requested : 10, 1), 20);
  const admin = createAdminClient();
  const fields = "id,name,url,root_domain,company_domain,config,fetch_mode,browser_pending,next_run_at";
  const { data: pending, error } = await admin
    .from("sources")
    .select(fields)
    .eq("enabled", true)
    .eq("confidence", "官方")
    .gte("trust_score", 85)
    .or("browser_pending.eq.true,fetch_mode.eq.browser")
    .order("next_run_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) return Response.json({ message: error.message }, { status: 500 });

  const tasks = (await Promise.all((pending ?? []).map(async (source) => {
    try {
      await assertSafePublicUrl(source.url);
    } catch {
      return null;
    }
    return {
      sourceId: source.id,
      name: source.name,
      url: source.url,
      rootDomain: source.root_domain,
      companyDomain: source.company_domain,
      approvedDomains: Array.isArray(source.config?.approvedDomains)
        ? source.config.approvedDomains
        : [],
    };
  }))).filter((task): task is NonNullable<typeof task> => Boolean(task));
  return Response.json({ tasks });
}
