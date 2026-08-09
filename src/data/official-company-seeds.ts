export interface OfficialCompanySeed {
  company: string;
  companyDomain: string;
  aliases: string[];
}

/**
 * Stable corporate identities used to bias daily discovery toward employers
 * that are highly relevant to campus candidates. These are company domains,
 * not assumed recruiting URLs; every discovered recruiting URL still passes
 * the normal homepage-link and evidence checks before it can be published.
 */
export const OFFICIAL_COMPANY_SEEDS: OfficialCompanySeed[] = [
  { company: "腾讯", companyDomain: "tencent.com", aliases: ["Tencent"] },
  { company: "阿里巴巴", companyDomain: "alibabagroup.com", aliases: ["Alibaba"] },
  { company: "字节跳动", companyDomain: "bytedance.com", aliases: ["ByteDance"] },
  { company: "百度", companyDomain: "baidu.com", aliases: ["Baidu"] },
  { company: "京东", companyDomain: "jd.com", aliases: ["JD"] },
  { company: "美团", companyDomain: "meituan.com", aliases: ["Meituan"] },
  { company: "小米", companyDomain: "xiaomi.com", aliases: ["Xiaomi"] },
  { company: "网易", companyDomain: "netease.com", aliases: ["NetEase"] },
  { company: "华为", companyDomain: "huawei.com", aliases: ["Huawei"] },
  { company: "OPPO", companyDomain: "oppo.com", aliases: ["欧珀"] },
  { company: "vivo", companyDomain: "vivo.com", aliases: ["维沃"] },
  { company: "大疆", companyDomain: "dji.com", aliases: ["DJI"] },
  { company: "联想", companyDomain: "lenovo.com", aliases: ["Lenovo"] },
  { company: "比亚迪", companyDomain: "byd.com", aliases: ["BYD"] },
  { company: "宁德时代", companyDomain: "catl.com", aliases: ["CATL"] },
  { company: "吉利", companyDomain: "geely.com", aliases: ["Geely"] },
  { company: "蔚来", companyDomain: "nio.com", aliases: ["NIO"] },
  { company: "美的", companyDomain: "midea.com", aliases: ["Midea"] },
  { company: "海尔", companyDomain: "haier.com", aliases: ["Haier"] },
  { company: "中国工商银行", companyDomain: "icbc.com.cn", aliases: ["工商银行", "ICBC"] },
  { company: "中国银行", companyDomain: "boc.cn", aliases: ["BOC"] },
  { company: "中国建设银行", companyDomain: "ccb.com", aliases: ["建设银行", "CCB"] },
  { company: "招商银行", companyDomain: "cmbchina.com", aliases: ["招行", "CMB"] },
  { company: "中国平安", companyDomain: "pingan.com", aliases: ["平安", "Ping An"] },
  { company: "中信证券", companyDomain: "citics.com", aliases: ["CITIC Securities"] },
  { company: "宝洁", companyDomain: "pg.com", aliases: ["P&G", "Procter & Gamble"] },
  { company: "联合利华", companyDomain: "unilever.com", aliases: ["Unilever"] },
  { company: "欧莱雅", companyDomain: "loreal.com", aliases: ["L'Oréal", "L'Oreal"] },
  { company: "德勤", companyDomain: "deloitte.com", aliases: ["Deloitte"] },
  { company: "普华永道", companyDomain: "pwc.com", aliases: ["PwC"] },
];

export function rotatingOfficialCompanySeeds(day: number, perDay = 5) {
  const start = (Math.max(0, day) * perDay) % OFFICIAL_COMPANY_SEEDS.length;
  return Array.from(
    { length: Math.min(perDay, OFFICIAL_COMPANY_SEEDS.length) },
    (_, offset) => OFFICIAL_COMPANY_SEEDS[(start + offset) % OFFICIAL_COMPANY_SEEDS.length],
  );
}
