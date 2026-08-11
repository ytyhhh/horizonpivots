const dispatchRepository = () =>
  process.env.GITHUB_DISPATCH_REPOSITORY ?? "ytyhhh/horizonpivots";

export async function dispatchPhdSearch(jobId: string) {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) throw new Error("GitHub search worker is not configured");

  const response = await fetch(
    `https://api.github.com/repos/${dispatchRepository()}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2026-03-10",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "phd-search",
        client_payload: { jobId },
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub search worker dispatch failed (${response.status})`);
  }
}
