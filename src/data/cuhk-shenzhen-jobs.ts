import type { Job } from "@/types";
import { slugifyFingerprint } from "@/lib/utils";

function exclusiveJob(input: Omit<Job, "fingerprint" | "status" | "cuhkShenzhenOnly">): Job {
  return {
    ...input,
    status: "active",
    cuhkShenzhenOnly: true,
    fingerprint: slugifyFingerprint([
      input.company,
      input.title,
      input.locations,
      input.batch,
      input.applyUrl,
    ]),
  };
}

/** 临时占位数据：后续以学校就业中心或企业正式信息替换。 */
export const cuhkShenzhenDemoJobs: Job[] = [
  exclusiveJob({
    id: "cuhksz-demo-bay-area-ai-intern",
    company: "大湾区人工智能实验室（演示）",
    title: "算法研发实习生｜港中深专属",
    type: "实习",
    batch: "校方专属通道（演示）",
    industry: "互联网",
    locations: ["深圳"],
    cohort: "不限",
    skills: ["Python", "机器学习", "PyTorch"],
    summary: "演示岗位：仅向已使用港中深学校邮箱登录的学生展示，正式招聘信息待学校就业中心确认。",
    deadline: "2026-09-30",
    applyUrl: null,
    sourceUrl: "https://jobs.horizonpivots.com/",
    sourceName: "校招雷达演示数据",
    sourceConfidence: "社区线索",
    firstSeen: "2026-12-01",
    lastSeen: "2026-08-01",
  }),
  exclusiveJob({
    id: "cuhksz-demo-fintech-product",
    company: "深港金融科技创新中心（演示）",
    title: "产品运营实习生｜港中深专属",
    type: "实习",
    batch: "校方专属通道（演示）",
    industry: "银行/金融",
    locations: ["深圳"],
    cohort: "不限",
    skills: ["数据分析", "用户研究", "SQL"],
    summary: "演示岗位：面向港中深学生的专属机会占位，申请入口及招聘要求待正式发布。",
    deadline: "2026-09-20",
    applyUrl: null,
    sourceUrl: "https://jobs.horizonpivots.com/",
    sourceName: "校招雷达演示数据",
    sourceConfidence: "社区线索",
    firstSeen: "2026-12-01",
    lastSeen: "2026-08-01",
  }),
  exclusiveJob({
    id: "cuhksz-demo-chip-verification",
    company: "深圳芯片设计企业（演示）",
    title: "数字验证工程师｜港中深专属",
    type: "秋招",
    batch: "校方专属通道（演示）",
    industry: "半导体/硬件",
    locations: ["深圳"],
    cohort: "2027届",
    skills: ["Verilog", "SystemVerilog", "UVM"],
    summary: "演示岗位：为港中深学生预留的校企合作招聘占位，不代表真实招聘承诺。",
    deadline: "2026-10-15",
    applyUrl: null,
    sourceUrl: "https://jobs.horizonpivots.com/",
    sourceName: "校招雷达演示数据",
    sourceConfidence: "社区线索",
    firstSeen: "2026-12-01",
    lastSeen: "2026-08-01",
  }),
];
