import { createAdminClient } from "@/lib/supabase/admin";

interface ResendResponse {
  id?: string;
  message?: string;
  name?: string;
}

function chinaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function recipients() {
  return (process.env.DAILY_DIGEST_TO ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export async function sendDailyOperationsDigest(now = new Date()) {
  const admin = createAdminClient();
  const digestDate = chinaDate(now);
  const { data: existing } = await admin
    .from("daily_digest_runs")
    .select("status,resend_email_id")
    .eq("digest_date", digestDate)
    .maybeSingle();
  if (existing?.status === "succeeded") {
    return { digestDate, alreadySent: true, emailId: existing.resend_email_id };
  }
  await admin.from("daily_digest_runs").upsert({ digest_date: digestDate, status: "sending", error: null });

  try {
    const to = recipients();
    const from = process.env.DAILY_DIGEST_FROM;
    const apiKey = process.env.RESEND_API_KEY;
    if (!to.length || !from || !apiKey) {
      throw new Error("RESEND_API_KEY, DAILY_DIGEST_FROM and DAILY_DIGEST_TO are required");
    }
    const start = new Date(`${digestDate}T00:00:00+08:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const [newJobsResult, updatedJobsResult, reviewsResult, failedRunsResult, degradedSourcesResult] = await Promise.all([
      admin
        .from("jobs")
        .select("id,company,title,job_type,locations,apply_url,source_url", { count: "exact" })
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .lt("created_at", start.toISOString())
        .gte("content_updated_at", start.toISOString())
        .lt("content_updated_at", end.toISOString()),
      admin
        .from("review_items")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString()),
      admin
        .from("ingestion_runs")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed")
        .gte("finished_at", start.toISOString())
        .lt("finished_at", end.toISOString()),
      admin.from("sources").select("name,last_error").eq("health", "degraded").limit(20),
    ]);
    const queryError = [
      newJobsResult.error,
      updatedJobsResult.error,
      reviewsResult.error,
      failedRunsResult.error,
      degradedSourcesResult.error,
    ].find(Boolean);
    if (queryError) throw queryError;

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const newJobs = newJobsResult.data ?? [];
    const jobItems = newJobs.length
      ? newJobs.map((job) => {
          const target = String(job.apply_url ?? job.source_url ?? `${siteUrl}/jobs/${job.id}`);
          const locations = Array.isArray(job.locations) ? job.locations.join("、") : "";
          return `<li style="margin:0 0 10px"><a href="${escapeHtml(target)}">${escapeHtml(job.company)} · ${escapeHtml(job.title)}</a> <span style="color:#667085">${escapeHtml(job.job_type)}${locations ? ` / ${escapeHtml(locations)}` : ""}</span></li>`;
        }).join("")
      : "<li>今天没有新增岗位。</li>";
    const degraded = (degradedSourcesResult.data ?? []).length
      ? `<ul>${(degradedSourcesResult.data ?? []).map((source) => `<li>${escapeHtml(source.name)}：${escapeHtml(source.last_error || "最近一次运行失败")}</li>`).join("")}</ul>`
      : "<p>所有来源健康。</p>";
    const html = `
      <div style="font-family:Arial,'PingFang SC',sans-serif;line-height:1.6;color:#101828;max-width:720px;margin:auto">
        <h1>${escapeHtml(digestDate)} 校招雷达日报</h1>
        <p>新增 <strong>${newJobsResult.count ?? newJobs.length}</strong>，更新 <strong>${updatedJobsResult.count ?? 0}</strong>，待审核新增 <strong>${reviewsResult.count ?? 0}</strong>，失败任务 <strong>${failedRunsResult.count ?? 0}</strong>。</p>
        <h2>最新岗位</h2><ol>${jobItems}</ol>
        <h2>来源健康</h2>${degraded}
        <p><a href="${escapeHtml(`${siteUrl}/admin`)}">打开数据管理页</a></p>
      </div>`;
    const payload = {
      from,
      to,
      subject: `校招雷达日报 ${digestDate}｜新增 ${newJobsResult.count ?? newJobs.length} 个岗位`,
      html,
    };
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `official-jobs-digest/${digestDate}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const result = (await response.json().catch(() => null)) as ResendResponse | null;
    if (!response.ok || !result?.id) {
      throw new Error(`Resend failed (${response.status}): ${result?.message ?? result?.name ?? "unknown error"}`);
    }
    await admin.from("daily_digest_runs").update({
      status: "succeeded",
      resend_email_id: result.id,
      sent_at: new Date().toISOString(),
      error: null,
    }).eq("digest_date", digestDate);
    return {
      digestDate,
      emailId: result.id,
      newJobs: newJobsResult.count ?? newJobs.length,
      updatedJobs: updatedJobsResult.count ?? 0,
      reviews: reviewsResult.count ?? 0,
      failedRuns: failedRunsResult.count ?? 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Digest failed";
    await admin.from("daily_digest_runs").update({ status: "failed", error: message.slice(0, 1000) }).eq("digest_date", digestDate);
    throw error;
  }
}
