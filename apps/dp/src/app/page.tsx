import { auth } from "@clerk/nextjs/server";
import { LobbyClient } from "@/components/lobby-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { userId } = await auth();
  return <LobbyClient canCreate={Boolean(userId)} />;
}
