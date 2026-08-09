import { isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "node:crypto";
import { normalizeUrl } from "@/lib/utils";
import { assertSafePublicUrl } from "@/lib/ingestion/web-safety";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return Response.json({ message: "Forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { action?: "approve" | "reject" } | null;
  if (!body?.action || !["approve", "reject"].includes(body.action)) {
    return Response.json({ message: "Invalid review action" }, { status: 400 });
  }
  const { id } = await context.params;
  const admin = createAdminClient();
  const { data: item, error: itemError } = await admin
    .from("review_items")
    .select("id,payload,status")
    .eq("id", id)
    .maybeSingle();
  if (itemError) return Response.json({ message: itemError.message }, { status: 500 });
  if (!item || item.status !== "open") return Response.json({ message: "Review item not found" }, { status: 404 });

  if (body.action === "approve") {
    const payload = (item.payload ?? {}) as Record<string, unknown>;
    const rootDomain = typeof payload.rootDomain === "string" ? payload.rootDomain : "";
    const url = typeof payload.url === "string" ? payload.url : "";
    if (rootDomain && url) {
      const company = typeof payload.company === "string" ? payload.company : rootDomain;
      const canonicalUrl = normalizeUrl(url);
      if (!canonicalUrl) return Response.json({ message: "Invalid source URL" }, { status: 400 });
      try {
        await assertSafePublicUrl(canonicalUrl);
      } catch (error) {
        return Response.json(
          { message: error instanceof Error ? error.message : "Unsafe source URL" },
          { status: 400 },
        );
      }
      const kind = ["html", "rss", "sitemap"].includes(String(payload.kind)) ? String(payload.kind) : "html";
      const { error: sourceError } = await admin.from("sources").upsert({
        name: `${company} 官方招聘 (${rootDomain}/${createHash("sha256").update(canonicalUrl).digest("hex").slice(0, 6)})`,
        kind,
        url,
        enabled: true,
        confidence: "官方",
        health: "healthy",
        root_domain: rootDomain,
        canonical_url: canonicalUrl,
        company_domain: typeof payload.companyDomain === "string" ? payload.companyDomain : rootDomain,
        trust_score: 100,
        trust_signals: ["human-approved"],
        discovered_by: "admin-review",
        next_run_at: new Date().toISOString(),
        config: { company },
      }, { onConflict: "canonical_url" });
      if (sourceError) return Response.json({ message: sourceError.message }, { status: 500 });
    }
  }
  const { error } = await admin.from("review_items").update({
    status: body.action === "approve" ? "approved" : "rejected",
    resolved_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ id, status: body.action === "approve" ? "approved" : "rejected" });
}
