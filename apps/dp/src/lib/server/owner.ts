import { auth } from "@clerk/nextjs/server";
import { serverEnv } from "./env";

export async function ownerIdentity() {
  const { userId } = await auth();
  return {
    userId,
    isOwner: Boolean(userId && userId === serverEnv().ownerUserId),
  };
}
