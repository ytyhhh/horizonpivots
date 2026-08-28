import { apiError, json } from "@/lib/server/http";
import { ownerIdentity } from "@/lib/server/owner";
import { activeRoomForOwner, actorForRoom, adminAuditForRoom, roomStatePayload } from "@/lib/server/rooms";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await ownerIdentity();
  if (!owner.isOwner || !owner.userId) return apiError(403, "OWNER_ONLY", "只有房主可以查看牌桌管理信息。");
  try {
    const room = await activeRoomForOwner(owner.userId);
    if (!room) return json({ room: null });
    const actor = await actorForRoom(room);
    if (!actor) return apiError(404, "ROOM_NOT_FOUND", "没有找到活动牌桌。");
    const [state, audit] = await Promise.all([roomStatePayload(room, actor), adminAuditForRoom(room.id)]);
    return json({ ...state, audit });
  } catch {
    return apiError(500, "STATE_FAILED", "暂时无法读取牌桌。");
  }
}
