import { auth } from "@clerk/nextjs/server";

export async function ownerIdentity() {
  const { userId } = await auth();
  return { userId };
}

export function ownsRoom(userId: string | null, roomOwnerUserId: string) {
  return Boolean(userId && userId === roomOwnerUserId);
}
