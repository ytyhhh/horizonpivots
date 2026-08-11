import type { Institution, RegionCode } from "@/lib/types";

export const REGIONS: Array<{ code: RegionCode | "ALL"; zh: string; en: string }> = [
  { code: "ALL", zh: "全部", en: "All" },
  { code: "US", zh: "美国", en: "United States" },
  { code: "GB", zh: "英国", en: "United Kingdom" },
  { code: "HK", zh: "香港", en: "Hong Kong" },
  { code: "SG", zh: "新加坡", en: "Singapore" },
];

export const INSTITUTIONS: Institution[] = [
  {
    id: "I63966007", openAlexId: "https://openalex.org/I63966007", rorId: "https://ror.org/042nb2s44",
    name: "Massachusetts Institute of Technology", nameZh: "麻省理工学院", shortName: "MIT",
    region: "US", country: "United States", city: "Cambridge, MA", domain: "mit.edu", homepage: "https://web.mit.edu",
  },
  {
    id: "I97018004", openAlexId: "https://openalex.org/I97018004", rorId: "https://ror.org/00f54p054",
    name: "Stanford University", nameZh: "斯坦福大学", shortName: "Stanford",
    region: "US", country: "United States", city: "Stanford, CA", domain: "stanford.edu", homepage: "https://www.stanford.edu",
  },
  {
    id: "I95457486", openAlexId: "https://openalex.org/I95457486", rorId: "https://ror.org/01an7q238",
    name: "University of California, Berkeley", nameZh: "加州大学伯克利分校", shortName: "UC Berkeley",
    region: "US", country: "United States", city: "Berkeley, CA", domain: "berkeley.edu", homepage: "https://www.berkeley.edu",
  },
  {
    id: "I136199984", openAlexId: "https://openalex.org/I136199984", rorId: "https://ror.org/03vek6s52",
    name: "Harvard University", nameZh: "哈佛大学", shortName: "Harvard",
    region: "US", country: "United States", city: "Cambridge, MA", domain: "harvard.edu", homepage: "https://www.harvard.edu",
  },
  {
    id: "I74973139", openAlexId: "https://openalex.org/I74973139", rorId: "https://ror.org/05x2bcf33",
    name: "Carnegie Mellon University", nameZh: "卡内基梅隆大学", shortName: "CMU",
    region: "US", country: "United States", city: "Pittsburgh, PA", domain: "cmu.edu", homepage: "https://www.cmu.edu",
  },
  {
    id: "I201448701", openAlexId: "https://openalex.org/I201448701", rorId: "https://ror.org/00cvxb145",
    name: "University of Washington", nameZh: "华盛顿大学", shortName: "UW",
    region: "US", country: "United States", city: "Seattle, WA", domain: "washington.edu", homepage: "https://www.washington.edu",
  },
  {
    id: "I40120149", openAlexId: "https://openalex.org/I40120149", rorId: "https://ror.org/052gg0110",
    name: "University of Oxford", nameZh: "牛津大学", shortName: "Oxford",
    region: "GB", country: "United Kingdom", city: "Oxford", domain: "ox.ac.uk", homepage: "https://www.ox.ac.uk",
  },
  {
    id: "I241749", openAlexId: "https://openalex.org/I241749", rorId: "https://ror.org/013meh722",
    name: "University of Cambridge", nameZh: "剑桥大学", shortName: "Cambridge",
    region: "GB", country: "United Kingdom", city: "Cambridge", domain: "cam.ac.uk", homepage: "https://www.cam.ac.uk",
  },
  {
    id: "I47508984", openAlexId: "https://openalex.org/I47508984", rorId: "https://ror.org/041kmwe10",
    name: "Imperial College London", nameZh: "帝国理工学院", shortName: "Imperial",
    region: "GB", country: "United Kingdom", city: "London", domain: "imperial.ac.uk", homepage: "https://www.imperial.ac.uk",
  },
  {
    id: "I45129253", openAlexId: "https://openalex.org/I45129253", rorId: "https://ror.org/02jx3x895",
    name: "University College London", nameZh: "伦敦大学学院", shortName: "UCL",
    region: "GB", country: "United Kingdom", city: "London", domain: "ucl.ac.uk", homepage: "https://www.ucl.ac.uk",
  },
  {
    id: "I889458895", openAlexId: "https://openalex.org/I889458895", rorId: "https://ror.org/02zhqgq86",
    name: "University of Hong Kong", nameZh: "香港大学", shortName: "HKU",
    region: "HK", country: "Hong Kong", city: "Pok Fu Lam", domain: "hku.hk", homepage: "https://www.hku.hk",
  },
  {
    id: "I200769079", openAlexId: "https://openalex.org/I200769079", rorId: "https://ror.org/00q4vv597",
    name: "Hong Kong University of Science and Technology", nameZh: "香港科技大学", shortName: "HKUST",
    region: "HK", country: "Hong Kong", city: "Clear Water Bay", domain: "hkust.edu.hk", homepage: "https://hkust.edu.hk",
  },
  {
    id: "I177725633", openAlexId: "https://openalex.org/I177725633", rorId: "https://ror.org/00t33hh48",
    name: "Chinese University of Hong Kong", nameZh: "香港中文大学", shortName: "CUHK",
    region: "HK", country: "Hong Kong", city: "Sha Tin", domain: "cuhk.edu.hk", homepage: "https://www.cuhk.edu.hk",
  },
  {
    id: "I168719708", openAlexId: "https://openalex.org/I168719708", rorId: "https://ror.org/03q8dnn23",
    name: "City University of Hong Kong", nameZh: "香港城市大学", shortName: "CityUHK",
    region: "HK", country: "Hong Kong", city: "Kowloon", domain: "cityu.edu.hk", homepage: "https://www.cityu.edu.hk",
  },
  {
    id: "I165932596", openAlexId: "https://openalex.org/I165932596", rorId: "https://ror.org/01tgyzw49",
    name: "National University of Singapore", nameZh: "新加坡国立大学", shortName: "NUS",
    region: "SG", country: "Singapore", city: "Singapore", domain: "nus.edu.sg", homepage: "https://www.nus.edu.sg",
  },
  {
    id: "I172675005", openAlexId: "https://openalex.org/I172675005", rorId: "https://ror.org/02e7b5302",
    name: "Nanyang Technological University", nameZh: "南洋理工大学", shortName: "NTU",
    region: "SG", country: "Singapore", city: "Singapore", domain: "ntu.edu.sg", homepage: "https://www.ntu.edu.sg",
  },
];

export const getInstitution = (id: string) => INSTITUTIONS.find((item) => item.id === id);
