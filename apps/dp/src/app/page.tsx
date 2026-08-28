import { auth } from "@clerk/nextjs/server";
import { LobbyClient } from "@/components/lobby-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { userId } = await auth();
  const ownerId = process.env.DP_OWNER_CLERK_USER_ID;
  return <LobbyClient isOwner={Boolean(ownerId && userId === ownerId)} />;
}
