import { apiError, json } from "@/lib/server/http";
import { actorForRoom, handHistoryForRoom, roomByPublicId } from "@/lib/server/rooms";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const room = await roomByPublicId(id);
    if (!room) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    const actor = await actorForRoom(room);
    if (!actor) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    return json({ history: await handHistoryForRoom(room.id) });
  } catch {
    return apiError(503, "HISTORY_UNAVAILABLE", "牌局记录暂时无法读取。");
  }
}
