import { auth, currentUser } from "@clerk/nextjs/server";

const CUHK_SHENZHEN_EMAIL_DOMAIN = "@link.cuhk.edu.cn";

export async function getCurrentUserId() {
  return (await auth()).userId;
}

export async function isAdmin() {
  try {
    const user = await currentUser();
    return user?.publicMetadata?.role === "admin";
  } catch {
    return false;
  }
}

/**
 * 只使用 Clerk 已验证并设为主邮箱的地址做受众判断；不把邮箱写入数据库。
 */
export async function canViewCuhkShenzhenJobs() {
  try {
    const email = (await currentUser())?.primaryEmailAddress?.emailAddress;
    return email?.trim().toLocaleLowerCase().endsWith(CUHK_SHENZHEN_EMAIL_DOMAIN) ?? false;
  } catch {
    return false;
  }
}
