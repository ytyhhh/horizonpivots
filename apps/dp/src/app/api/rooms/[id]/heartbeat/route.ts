import { apiError, json } from "@/lib/server/http";
import { advanceRoomIfDue } from "@/lib/server/advance";
import { isVersionConflict } from "@/lib/server/operations";
import { actorForRoom, roomByPublicId } from "@/lib/server/rooms";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    let room = await roomByPublicId(id);
    if (!room) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    const actor = await actorForRoom(room);
    if (!actor) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    try {
      if (actor.isOwner && room.status !== "active" && await advanceRoomIfDue(room)) {
        room = await roomByPublicId(id);
        if (!room) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
      }
    } catch (caught) {
      if (!isVersionConflict(caught)) throw caught;
    }
    if (!room) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    return json({ version: room.version });
  } catch {
    return apiError(503, "HEARTBEAT_UNAVAILABLE", "牌桌正在同步，请稍后重试。");
  }
}
