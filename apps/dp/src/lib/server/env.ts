const defaultDpUrl = "https://dp.horizonpivots.com";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}

export function serverEnv() {
  const sessionSecret = dpSessionSecret();

  return {
    dpUrl: process.env.NEXT_PUBLIC_DP_URL?.trim() || defaultDpUrl,
    platformUrl: process.env.NEXT_PUBLIC_PLATFORM_URL?.trim() || "https://horizonpivots.com",
    ownerUserId: required("DP_OWNER_CLERK_USER_ID"),
    sessionSecret,
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
    supabasePublishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    databaseAccessKey: required("DP_DATABASE_ACCESS_KEY"),
  } as const;
}

export function dpSessionSecret() {
  const sessionSecret = required("DP_SESSION_SECRET");
  if (sessionSecret.length < 32) {
    throw new Error("DP_SESSION_SECRET must contain at least 32 characters.");
  }
  return sessionSecret;
}

export function isProductionDeployment() {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}
