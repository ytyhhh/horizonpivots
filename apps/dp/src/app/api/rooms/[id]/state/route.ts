import { apiError, json } from "@/lib/server/http";
import { ensureParticipantInGame, isVersionConflict } from "@/lib/server/operations";
import { advanceRoomIfDue } from "@/lib/server/advance";
import { actorForRoom, roomByPublicId, roomStatePayload } from "@/lib/server/rooms";
import { ownerIdentity, ownsRoom } from "@/lib/server/owner";
import { ownerRoomCode } from "@/lib/server/session";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    let room = await roomByPublicId(id);
    if (!room) {
      console.warn(JSON.stringify({ event: "dp_room_state_denied", stage: "room_lookup" }));
      return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    }
    const actor = await actorForRoom(room);
    if (!actor) {
      const [owner, sealedCode] = await Promise.all([ownerIdentity(), ownerRoomCode()]);
      const hasOwnerHint = sealedCode?.roomId === room.id;
      const isCurrentOwner = ownsRoom(owner.userId, room.owner_clerk_user_id);
      const reason = isCurrentOwner
        ? "owner_seat_unavailable"
        : hasOwnerHint && !owner.userId
          ? "clerk_session_unavailable"
          : hasOwnerHint
            ? "clerk_account_mismatch"
            : "guest_session_unavailable";
      console.warn(JSON.stringify({ event: "dp_room_state_denied", stage: "actor_restore", reason }));
      if (isCurrentOwner) return apiError(503, "OWNER_SEAT_SYNCING", "房主座位正在同步，请稍后重试。");
      if (hasOwnerHint && !owner.userId) return apiError(401, "SIGN_IN_REQUIRED", "房主登录状态暂时不可用，请重新登录后返回牌桌。");
      return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    }
    if (actor.role !== "spectator") {
      await ensureParticipantInGame(room.id, actor.participantId);
      room = await roomByPublicId(id);
      if (!room) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    }
    try {
      const roomToAdvance = room;
      if (await advanceRoomIfDue(roomToAdvance)) {
        room = await roomByPublicId(id);
        if (!room) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
      }
    } catch (caught) {
      if (!isVersionConflict(caught)) throw caught;
    }
    if (!room) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    return json(await roomStatePayload(room, actor));
  } catch (caught) {
    const error = caught as { code?: unknown; message?: unknown };
    console.error(JSON.stringify({
      event: "dp_room_state_failed",
      code: typeof error?.code === "string" ? error.code : null,
      message: typeof error?.message === "string" ? error.message.slice(0, 160) : "unknown",
    }));
    return apiError(503, "STATE_UNAVAILABLE", "牌桌正在同步，请稍后重试。");
  }
}
