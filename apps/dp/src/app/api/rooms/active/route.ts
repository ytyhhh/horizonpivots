import { apiError, json } from "@/lib/server/http";
import { ownerIdentity } from "@/lib/server/owner";
import { MAX_OWNER_ROOMS } from "@/lib/server/room-limit";
import { activeRoomsForOwner, actorForRoom, adminAuditForRoom, roomStatePayload } from "@/lib/server/rooms";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await ownerIdentity();
  if (!owner.userId) return apiError(401, "SIGN_IN_REQUIRED", "登录后才能查看自己的牌桌管理信息。");
  try {
    const ownedRooms = await activeRoomsForOwner(owner.userId);
    const rooms = await Promise.all(ownedRooms.map(async (room) => {
      const actor = await actorForRoom(room);
      if (!actor) throw new Error("Owner seat is unavailable.");
      const [state, audit] = await Promise.all([roomStatePayload(room, actor), adminAuditForRoom(room.id)]);
      return { ...state, audit };
    }));
    return json({ rooms, maxRooms: MAX_OWNER_ROOMS });
  } catch {
    return apiError(500, "STATE_FAILED", "暂时无法读取牌桌。");
  }
}
