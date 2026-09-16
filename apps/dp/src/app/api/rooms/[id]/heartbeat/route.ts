import { apiError, json } from "@/lib/server/http";
import { advanceRoomIfDue } from "@/lib/server/advance";
import { isVersionConflict } from "@/lib/server/operations";
import { ownerIdentity, ownsRoom } from "@/lib/server/owner";
import { actorForRoom, roomByPublicId } from "@/lib/server/rooms";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    let room = await roomByPublicId(id);
    if (!room) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    const owner = await ownerIdentity();
    if (!ownsRoom(owner.userId, room.owner_clerk_user_id)) {
      return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    }
    const actor = await actorForRoom(room);
    if (!actor?.isOwner) return apiError(503, "OWNER_SEAT_SYNCING", "房主座位正在同步。");
    try {
      if (room.status !== "active" && await advanceRoomIfDue(room)) {
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
