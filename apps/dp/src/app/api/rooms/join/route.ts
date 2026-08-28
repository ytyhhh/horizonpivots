import { ownerIdentity } from "@/lib/server/owner";
import { apiError, assertMutationOrigin, clientAddress, json, readJson } from "@/lib/server/http";
import { ensureParticipantInGame } from "@/lib/server/operations";
import { dpAdminClient } from "@/lib/server/supabase";
import { generateOpaqueToken, hashGuestToken, hashJoinIdentity, hashRoomCode, normalizeRoomCode, sanitizeNickname, sealOwnerRoomCode } from "@/lib/server/security";
import { guestCookie, ownerCodeCookie } from "@/lib/server/session";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!assertMutationOrigin(request)) return apiError(403, "ORIGIN_REJECTED", "请求来源无效。");
  const body = await readJson(request);
  if (!body) return apiError(400, "INVALID_JSON", "加入信息格式无效。");
  const code = normalizeRoomCode(body.code);
  const nickname = sanitizeNickname(body.nickname);
  const role = body.role === "spectator" ? "spectator" : body.role === "player" ? "player" : null;
  if (code.length !== 10 || !nickname || !role) return apiError(422, "INVALID_JOIN", "请填写 10 位房间号和有效昵称。");

  const codeHash = hashRoomCode(code);
  const owner = await ownerIdentity();
  if (owner.isOwner && owner.userId) {
    const { data, error } = await dpAdminClient()
      .from("dp_rooms")
      .select("id,public_id,expires_at")
      .eq("owner_clerk_user_id", owner.userId)
      .eq("code_hash", codeHash)
      .in("status", ["lobby", "active", "paused"])
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) return apiError(500, "JOIN_FAILED", "暂时无法加入牌桌，请稍后再试。");
    if (data?.public_id) {
      const response = json({ roomId: data.public_id });
      const cookie = ownerCodeCookie(sealOwnerRoomCode(data.id, code), new Date(data.expires_at));
      response.cookies.set(cookie.name, cookie.value, cookie.options);
      return response;
    }
  }

  const token = generateOpaqueToken();
  const { data, error } = await dpAdminClient().rpc("dp_join_room", {
    p_code_hash: codeHash,
    p_display_name: nickname,
    p_role: role,
    p_token_hash: hashGuestToken(token),
    p_rate_key_hash: hashJoinIdentity(clientAddress(request)),
  });
  if (error) return apiError(500, "JOIN_FAILED", "暂时无法加入牌桌，请稍后再试。");
  const result = (Array.isArray(data) ? data[0] : data) as {
    accepted?: boolean;
    reason?: string;
    retry_after_seconds?: number;
    room_id?: string;
    public_id?: string;
    participant_id?: string;
    expires_at?: string;
  } | null;
  if (!result?.accepted) {
    if (result?.reason === "rate_limited") {
      return json({ error: "RATE_LIMITED", code: "RATE_LIMITED", message: "尝试次数过多，请稍后再试。" }, {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, result.retry_after_seconds ?? 60)) },
      });
    }
    if (result?.reason === "nickname_taken") return apiError(409, "NICKNAME_TAKEN", "这个昵称已在牌桌中，请换一个。");
    if (result?.reason === "room_full") return apiError(409, "ROOM_FULL", "牌桌座位已经坐满。");
    if (result?.reason === "spectators_disabled") return apiError(403, "SPECTATORS_DISABLED", "房主暂未开放旁观。");
    return apiError(404, "INVITE_UNAVAILABLE", "房间号无效、已锁定或已经失效。");
  }
  if (!result.room_id || !result.public_id || !result.participant_id || !result.expires_at) {
    return apiError(500, "JOIN_FAILED", "暂时无法加入牌桌，请稍后再试。");
  }

  try {
    await ensureParticipantInGame(result.room_id, result.participant_id);
  } catch {
    // The session is already durable. The protected state endpoint retries reconciliation.
  }
  const response = json({ roomId: result.public_id });
  const cookie = guestCookie(token, new Date(result.expires_at));
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
