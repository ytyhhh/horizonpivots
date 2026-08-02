/**
 * SiliconFlow's DeepSeek API supplies text generation but no trusted web-search
 * tool. Returning invented URLs would be unsafe, so the discovery cron remains
 * a no-op until a dedicated search provider is connected. Existing public feeds
 * and the CUHK-Shenzhen crawler continue to ingest normally.
 */
export async function discoverOfficialRecruitingPages() {
  return [] as Array<{
    company: string;
    title: string;
    url: string;
    reason: string;
  }>;
}
