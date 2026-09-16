import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { openMobileOwnerToken } from "./security";

export async function ownerIdentity() {
  const mobile = openMobileOwnerToken((await headers()).get("x-dp-mobile-token") ?? undefined);
  if (mobile) return { userId: mobile.userId };
  const { userId } = await auth();
  return { userId };
}

export function ownsRoom(userId: string | null, roomOwnerUserId: string) {
  return Boolean(userId && userId === roomOwnerUserId);
}
