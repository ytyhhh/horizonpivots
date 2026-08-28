import { apiError, assertMutationOrigin, json, readJson } from "@/lib/server/http";
import { actorForRoom, roomByPublicId } from "@/lib/server/rooms";
import { isFixedReaction, sanitizeChat } from "@/lib/server/security";
import { dpAdminClient } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!assertMutationOrigin(request)) return apiError(403, "ORIGIN_REJECTED", "请求来源无效。");
  const { id } = await context.params;
  const body = await readJson(request);
  const kind = body?.kind === "reaction" ? "reaction" : body?.kind === "text" ? "text" : null;
  const content = kind === "reaction"
    ? isFixedReaction(body?.body) ? body.body : null
    : sanitizeChat(body?.body);
  if (!kind || !content) return apiError(422, "INVALID_MESSAGE", "消息为空、过长或包含不支持的链接。");

  try {
    const room = await roomByPublicId(id);
    if (!room) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    const actor = await actorForRoom(room);
    if (!actor) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count, error: countError } = await dpAdminClient()
      .from("dp_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id)
      .eq("participant_id", actor.participantId)
      .gte("created_at", since);
    if (countError) throw countError;
    if ((count ?? 0) >= 12) return apiError(429, "CHAT_RATE_LIMITED", "发送得太快，请稍后再试。");

    const { data, error } = await dpAdminClient().from("dp_chat_messages").insert({
      room_id: room.id,
      participant_id: actor.participantId,
      kind,
      content,
    }).select("id,created_at").single();
    if (error) throw error;
    await dpAdminClient().from("dp_public_state").update({ kind: "chat_message" }).eq("room_id", room.id);
    return json({ id: data.id, createdAt: data.created_at }, { status: 201 });
  } catch {
    return apiError(500, "MESSAGE_FAILED", "消息没有发送，请稍后再试。");
  }
}
