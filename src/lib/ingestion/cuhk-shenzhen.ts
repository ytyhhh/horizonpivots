import { cuhkShenzhenIngestPayloadSchema } from "@/lib/schemas";
import { slugifyFingerprint } from "@/lib/utils";
import type { Job } from "@/types";

const CUHK_SHENZHEN_SOURCE = "香港中文大学（深圳）职业规划与发展处";
const EXTERNAL_HTTP_URL = /https?:\/\/[^\s<>'"`]+/gi;
const TRAILING_URL_PUNCTUATION = /[.,;:!?，。；：！？)}\]）】》〉”’]+$/;

function externalApplyUrl(description: string, sourceUrl: string) {
  for (const rawUrl of description.match(EXTERNAL_HTTP_URL) ?? []) {
    const candidate = rawUrl.replace(TRAILING_URL_PUNCTUATION, "");
    try {
      const url = new URL(candidate);
      if (url.protocol.startsWith("http") && url.hostname !== "career.cuhk.edu.cn") {
        return url.toString();
      }
    } catch {
      // Continue scanning the rest of the public description.
    }
  }
  return null;
}

function inferIndustry(title: string): Job["industry"] {
  if (/(芯片|半导体|FPGA|硬件|嵌入式|电子)/i.test(title)) return "半导体/硬件";
  if (/(银行|金融|证券|基金|保险|投资)/i.test(title)) return "银行/金融";
  if (/(汽车|整车|电池|新能源)/i.test(title)) return "新能源车企";
  if (/(游戏|引擎|策划)/i.test(title)) return "游戏";
  if (/(医药|生物|医疗)/i.test(title)) return "医药/生物";
  if (/(算法|开发|产品|运营|数据|软件|AI|人工智能)/i.test(title)) return "互联网";
  return "其他";
}

export function parseCuhkShenzhenJobs(payload: unknown): Job[] {
  const { jobs } = cuhkShenzhenIngestPayloadSchema.parse(payload);
  return jobs.map((item) => {
    const applyUrl = item.applyUrl ?? externalApplyUrl(item.description, item.sourceUrl) ?? item.sourceUrl;
    return {
    id: `cuhksz_${item.id}`,
    company: item.company,
    title: item.title,
    program: null,
    type: item.type,
    batch: "港中深就业中心发布",
    industry: inferIndustry(`${item.company} ${item.title}`),
    locations: item.locations,
    cohort: item.cohort,
    skills: [],
    summary: item.summary || `${item.company}在港中深就业中心发布的${item.type}岗位。`,
    description: item.description,
    deadline: item.deadline ?? null,
    applyUrl,
    sourceUrl: item.sourceUrl,
    sourceName: CUHK_SHENZHEN_SOURCE,
    sourceConfidence: "官方",
    firstSeen: item.firstSeen,
    lastSeen: new Date().toISOString().slice(0, 10),
    status: "active",
    cuhkShenzhenOnly: true,
      fingerprint: slugifyFingerprint(["cuhksz", item.sourceUrl]),
    };
  });
}
