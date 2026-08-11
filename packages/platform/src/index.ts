export type HorizonProduct = "portal" | "jobs" | "phd";

export const platformOrigins = {
  portal: process.env.NEXT_PUBLIC_PLATFORM_URL ?? "https://horizonpivots.com",
  jobs: process.env.NEXT_PUBLIC_JOBS_URL ?? "https://jobs.horizonpivots.com",
  phd: process.env.NEXT_PUBLIC_PHD_URL ?? "https://phd.horizonpivots.com",
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
];

export function getProductHref(product: HorizonProduct) {
  return platformOrigins[product];
}

export function isAllowedReturnUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return Object.values(platformOrigins).some((origin) => new URL(origin).origin === url.origin)
      || /^http:\/\/localhost:(3000|3001|3002)$/.test(url.origin);
  } catch {
    return false;
  }
}

export function loginUrl(returnUrl?: string) {
  const url = new URL("/login", platformOrigins.jobs);
  if (isAllowedReturnUrl(returnUrl)) url.searchParams.set("redirect_url", returnUrl!);
  return url.toString();
}
