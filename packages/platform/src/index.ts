export type HorizonProduct = "portal" | "jobs" | "phd" | "cuhksz" | "dp";

export const platformOrigins = {
  portal: process.env.NEXT_PUBLIC_PLATFORM_URL ?? "https://horizonpivots.com",
  jobs: process.env.NEXT_PUBLIC_JOBS_URL ?? "https://jobs.horizonpivots.com",
  phd: process.env.NEXT_PUBLIC_PHD_URL ?? "https://phd.horizonpivots.com",
  cuhksz: process.env.NEXT_PUBLIC_CUHK_SZ_URL ?? "https://cuhksz.horizonpivots.com",
  dp: process.env.NEXT_PUBLIC_DP_URL ?? "https://dp.horizonpivots.com",
} as const;

export const products = [
  {
    id: "jobs" as const,
    name: "校招雷达",
    description: "持续核验的校招与实习机会",
    href: platformOrigins.jobs,
  },
  {
    id: "phd" as const,
    name: "PhD Scope",
    description: "在目标院校范围内寻找导师",
    href: platformOrigins.phd,
  },
  {
    id: "cuhksz" as const,
    name: "港中声",
    description: "课程与食堂的同学评价",
    href: platformOrigins.cuhksz,
  },
];

export function getProductHref(product: HorizonProduct) {
  return platformOrigins[product];
}

export function isAllowedReturnUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return Object.values(platformOrigins).some((origin) => new URL(origin).origin === url.origin)
      || /^http:\/\/localhost:(3000|3001|3002|3003|3004|4173)$/.test(url.origin);
  } catch {
    return false;
  }
}

export function loginUrl(returnUrl?: string) {
  const url = new URL("/login", platformOrigins.portal);
  if (isAllowedReturnUrl(returnUrl)) url.searchParams.set("redirect_url", returnUrl!);
  return url.toString();
}
