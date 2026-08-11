import { XMLParser } from "fast-xml-parser";
import { load } from "cheerio";
import { fetchSafeText } from "@/lib/ingestion/web-safety";

export interface DiscoveredPage {
  url: string;
  title: string;
  publishedAt?: string | null;
  description?: string;
}

export interface SourceAdapter {
  kind: "rss" | "html" | "sitemap";
  discover(url: string): Promise<DiscoveredPage[]>;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export const rssAdapter: SourceAdapter = {
  kind: "rss",
  async discover(url) {
    const xml = await fetchSafeText(url);
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    const items = [
      ...toArray(parsed?.rss?.channel?.item),
      ...toArray(parsed?.feed?.entry),
    ];
    return items
      .map((item: Record<string, unknown>) => {
        const rawLink = item.link;
        const link =
          typeof rawLink === "string"
            ? rawLink
            : typeof rawLink === "object" && rawLink
              ? String((rawLink as Record<string, unknown>)["@_href"] ?? "")
              : "";
        return {
          url: link,
          title: String(item.title ?? "招聘信息"),
          publishedAt: String(item.pubDate ?? item.updated ?? item.published ?? "") || null,
          description: String(item.description ?? item.summary ?? "").slice(0, 500),
        };
      })
      .filter((item: DiscoveredPage) => item.url.startsWith("http"))
      .slice(0, 200);
  },
};

export const sitemapAdapter: SourceAdapter = {
  kind: "sitemap",
  async discover(url) {
    const xml = await fetchSafeText(url);
    const parser = new XMLParser();
    const parsed = parser.parse(xml);
    return toArray(parsed?.urlset?.url)
      .map((item: Record<string, unknown>) => ({
        url: String(item.loc ?? ""),
        title: "招聘页面",
        publishedAt: String(item.lastmod ?? "") || null,
      }))
      .filter((item: DiscoveredPage) => item.url.startsWith("http"))
      .slice(0, 200);
  },
};

export const htmlAdapter: SourceAdapter = {
  kind: "html",
  async discover(url) {
    const html = await fetchSafeText(url);
    const $ = load(html);
    const pages = new Map<string, DiscoveredPage>();

    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const value = JSON.parse($(element).text());
        const records = Array.isArray(value) ? value : [value];
        records.forEach((record) => {
          if (record?.["@type"] !== "JobPosting") return;
          const target = new URL(String(record.url ?? url), url).toString();
          pages.set(target, {
            url: target,
            title: String(record.title ?? "招聘岗位"),
            publishedAt: record.datePosted ?? null,
            description: String(record.description ?? "")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .slice(0, 500),
          });
        });
      } catch {
        // Ignore invalid JSON-LD and continue with link discovery.
      }
    });

    $("a[href]").each((_, element) => {
      const label = $(element).text().replace(/\s+/g, " ").trim();
      if (!/(校招|校园招聘|实习|应届|graduate|intern)/i.test(label)) return;
      try {
        const target = new URL($(element).attr("href")!, url).toString();
        if (new URL(target).origin !== new URL(url).origin) return;
        pages.set(target, { url: target, title: label.slice(0, 120) || "招聘页面" });
      } catch {
        // Ignore malformed links.
      }
    });
    return [...pages.values()].slice(0, 200);
  },
};

export const adapters: Record<SourceAdapter["kind"], SourceAdapter> = {
  rss: rssAdapter,
  html: htmlAdapter,
  sitemap: sitemapAdapter,
};
