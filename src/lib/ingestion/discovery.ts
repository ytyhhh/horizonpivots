import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const discoverySchema = z.object({
  candidates: z
    .array(
      z.object({
        company: z.string().min(1).max(120),
        title: z.string().min(1).max(180),
        url: z.string().url(),
        reason: z.string().max(240),
      }),
    )
    .max(30),
});

const blockedHosts = [
  "mp.weixin.qq.com",
  "www.xiaohongshu.com",
  "xiaohongshu.com",
  "www.nowcoder.com",
];

function acceptable(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      !blockedHosts.some(
        (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
      )
    );
  } catch {
    return false;
  }
}

export async function discoverOfficialRecruitingPages() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.parse({
    model: process.env.OPENAI_WEB_SEARCH_MODEL ?? "gpt-5.6-luna",
    store: false,
    reasoning: { effort: "low" },
    tools: [{ type: "web_search" }],
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "你负责发现中国大陆企业公开可访问的校园招聘页面。",
              "只返回企业官方招聘域名或企业官方 ATS 页面。",
              "排除公众号、小红书、牛客、论坛、需要登录的内容以及招聘信息转载。",
              "不要猜测 URL，每个候选必须来自本次网页搜索结果。",
              "不要复制完整招聘正文，只返回页面标题、URL 和一行入选理由。",
            ].join("\n"),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "查找最近 7 天新发布或更新的 2027 届校园招聘、提前批和面向在校生的实习官方页面。",
          },
        ],
      },
    ],
    text: { format: zodTextFormat(discoverySchema, "recruiting_pages") },
  });
  const parsed = response.output_parsed;
  if (!parsed) throw new Error("Web search returned no structured candidates");
  return parsed.candidates.filter((item) => acceptable(item.url));
}
