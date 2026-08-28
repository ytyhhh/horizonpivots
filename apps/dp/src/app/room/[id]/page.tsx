import type { Metadata } from "next";
import { RoomClient } from "@/components/room-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "私密牌桌",
  description: "只供受邀朋友使用的娱乐德州扑克牌桌。",
};

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoomClient roomId={id} />;
}
