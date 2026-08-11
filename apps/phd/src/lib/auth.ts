import { auth } from "@clerk/nextjs/server";

export async function getCurrentUserId() {
  return (await auth()).userId;
}
