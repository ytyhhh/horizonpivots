import { randomUUID } from "node:crypto";
import {
  PokerEngineError,
  removePlayer,
  setPlayerConnection,
  setPlayerSittingOut,
  setPlayerStack,
  setTableStatus,
  startHand,
  updateGameConfig,
  type GameState,
} from "@/lib/game";
import { apiError, assertMutationOrigin, json, readJson } from "@/lib/server/http";
import { isVersionConflict, parseRoomSettings } from "@/lib/server/operations";
import { actorForRoom, commitGameState, gameStateForRoom, isUuid, roomByPublicId, roomStatePayload } from "@/lib/server/rooms";
import { generateRoomCode, hashRoomCode, sealOwnerRoomCode } from "@/lib/server/security";
import { ownerCodeCookie } from "@/lib/server/session";
import { dpAdminClient } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!assertMutationOrigin(request)) return apiError(403, "ORIGIN_REJECTED", "请求来源无效。");
  const { id } = await context.params;
  const body = await readJson(request);
  if (!body) return apiError(400, "INVALID_JSON", "管理操作格式无效。");
  const command = typeof body.command === "string" ? body.command : "";
  if (!command) return apiError(422, "INVALID_COMMAND", "管理操作无效。");

  try {
    let room = await roomByPublicId(id);
    if (!room) return apiError(404, "ROOM_NOT_FOUND", "没有找到活动牌桌。");
    const actor = await actorForRoom(room);
    if (!actor?.isOwner) return apiError(403, "OWNER_ONLY", "只有房主可以管理牌桌。");

    if (command === "lock" || command === "unlock") {
      await updateRoom(room.id, { locked: command === "lock" });
      return ownerPayload(id, actor);
    }
    if (command === "spectators_on" || command === "spectators_off") {
      await updateRoom(room.id, { spectators_enabled: command === "spectators_on" });
      return ownerPayload(id, actor);
    }
    if (command === "rotate_code") {
      const code = generateRoomCode();
      await updateRoom(room.id, { code_hash: hashRoomCode(code) });
      room = await roomByPublicId(id);
      if (!room) return apiError(404, "ROOM_NOT_FOUND", "没有找到活动牌桌。");
      const payload = await roomStatePayload(room, actor);
      payload.room.code = code;
      const response = json({ ...payload, code, shareText: `来好友牌桌一起玩。房间号：${code}` });
      const cookie = ownerCodeCookie(sealOwnerRoomCode(room.id, code), new Date(room.expires_at));
      response.cookies.set(cookie.name, cookie.value, cookie.options);
      return response;
    }
    if (command === "end") {
      await updateRoom(room.id, { status: "closed", locked: true, pause_after_hand: false, closed_at: new Date().toISOString() });
      await revokeAllGuestSessions(room.id);
      return json({ closed: true });
    }

    const stored = await gameStateForRoom(room.id);
    if (!stored) return apiError(503, "STATE_UNAVAILABLE", "牌桌正在同步，请稍后重试。");
    let state = stored.state;
    const actionId = randomUUID();
    const actionKind = `room_${command}`;
    let metadata: Record<string, unknown> = { command };

    if (command === "start") {
      state = startHand(state, { commandId: actionId, expectedVersion: state.version }).state;
    } else if (command === "pause") {
      if (state.status === "playing" && state.hand?.street !== "showdown") {
        await updateRoom(room.id, { pause_after_hand: true });
        return ownerPayload(id, actor);
      }
      state = setTableStatus(state, "paused", { commandId: actionId, expectedVersion: state.version }).state;
    } else if (command === "resume") {
      await updateRoom(room.id, { pause_after_hand: false });
      if (state.status === "paused") {
        state = setTableStatus(state, "waiting", { commandId: actionId, expectedVersion: state.version }).state;
        if (readyPlayerCount(state) >= 2) {
          state = startHand(state, { commandId: randomUUID(), expectedVersion: state.version }).state;
        }
      }
    } else if (command === "kick") {
      const participantId = typeof body.participantId === "string" ? body.participantId : "";
      if (!isUuid(participantId)) return apiError(422, "INVALID_PARTICIPANT", "参与者无效。");
      const participant = await guestParticipant(room.id, participantId);
      if (!participant) return apiError(404, "PARTICIPANT_NOT_FOUND", "没有找到这个访客。");
      await dpAdminClient().rpc("dp_revoke_guest_session", { p_room_id: room.id, p_participant_id: participantId });
      if (participant.role === "player" && state.players.some((player) => player.id === participantId)) {
        const isInActiveHand = Boolean(state.hand && state.hand.street !== "showdown" && state.hand.players.some((player) => player.playerId === participantId));
        if (isInActiveHand) {
          state = setPlayerConnection(state, participantId, false, { commandId: actionId, expectedVersion: state.version }).state;
          state = setPlayerSittingOut(state, participantId, true, { commandId: randomUUID(), expectedVersion: state.version }).state;
        } else {
          state = removePlayer(state, participantId, { commandId: actionId, expectedVersion: state.version }).state;
        }
        await commitGameState({ roomId: room.id, actionId, expectedVersion: stored.version, actorParticipantId: actor.participantId, actionKind: "player_kicked", state, metadata: { participantRemoved: true } });
      }
      await markParticipantKicked(room.id, participantId);
      return ownerPayload(id, actor);
    } else if (command === "reset_chips") {
      if (state.status === "playing") return apiError(422, "HAND_IN_PROGRESS", "请在本手结束后重置筹码。");
      const requestedId = typeof body.participantId === "string" ? body.participantId : null;
      const targets = requestedId ? state.players.filter((player) => player.id === requestedId) : state.players;
      if (requestedId && targets.length === 0) return apiError(404, "PARTICIPANT_NOT_FOUND", "没有找到这个玩家。");
      for (const [index, player] of targets.entries()) {
        const commandId = index === 0 ? actionId : randomUUID();
        state = setPlayerStack(state, player.id, room.starting_stack, { commandId, expectedVersion: state.version }).state;
      }
      metadata = { stacksReset: true, participantCount: targets.length };
    } else if (command === "update_settings") {
      const source = body.settings && typeof body.settings === "object" ? body.settings as Record<string, unknown> : body;
      const settings = parseRoomSettings(source);
      if (!settings) return apiError(422, "INVALID_SETTINGS", "请检查座位、筹码、盲注和行动时间。");
      state = updateGameConfig(state, {
        maxSeats: settings.maxSeats,
        startingStack: settings.startingStack,
        smallBlind: settings.smallBlind,
        bigBlind: settings.bigBlind,
        actionTimeoutMs: settings.actionSeconds * 1_000,
      }, { commandId: actionId, expectedVersion: state.version }).state;
      metadata = { settingsUpdated: true };
    } else {
      return apiError(422, "INVALID_COMMAND", "不支持这个管理操作。");
    }

    await commitGameState({
      roomId: room.id,
      actionId,
      expectedVersion: stored.version,
      actorParticipantId: actor.participantId,
      actionKind,
      state,
      metadata,
    });
    return ownerPayload(id, actor);
  } catch (caught) {
    if (isVersionConflict(caught) || (caught instanceof PokerEngineError && caught.code === "VERSION_CONFLICT")) {
      return apiError(409, "VERSION_CONFLICT", "牌桌已经更新，请同步后重试。");
    }
    if (caught instanceof PokerEngineError) return apiError(422, caught.code, managementError(caught.code));
    return apiError(500, "MANAGEMENT_FAILED", "管理操作没有完成，请稍后重试。");
  }
}

async function ownerPayload(publicId: string, actor: NonNullable<Awaited<ReturnType<typeof actorForRoom>>>) {
  const room = await roomByPublicId(publicId);
  if (!room) return json({ room: null });
  return json(await roomStatePayload(room, actor));
}

async function updateRoom(roomId: string, values: Record<string, unknown>) {
  const { error } = await dpAdminClient().from("dp_rooms").update(values).eq("id", roomId);
  if (error) throw error;
}

async function guestParticipant(roomId: string, participantId: string) {
  const { data, error } = await dpAdminClient().from("dp_participants").select("id,role").eq("id", participantId).eq("room_id", roomId).eq("kind", "guest").not("status", "in", "(left,kicked)").maybeSingle();
  if (error) throw error;
  return data as { id: string; role: "player" | "spectator" } | null;
}

async function markParticipantKicked(roomId: string, participantId: string) {
  const { error } = await dpAdminClient().from("dp_participants").update({
    status: "kicked",
    connected: false,
    ready: false,
    sitting_out: true,
    left_at: new Date().toISOString(),
  }).eq("room_id", roomId).eq("id", participantId).eq("kind", "guest");
  if (error) throw error;
}

async function revokeAllGuestSessions(roomId: string) {
  const { data, error } = await dpAdminClient().from("dp_participants").select("id").eq("room_id", roomId).eq("kind", "guest");
  if (error) throw error;
  await Promise.all((data ?? []).map((participant) => dpAdminClient().rpc("dp_revoke_guest_session", { p_room_id: roomId, p_participant_id: participant.id })));
}

function readyPlayerCount(state: GameState) {
  return state.players.filter((player) => player.ready && !player.sittingOut && player.stack > 0).length;
}

function managementError(code: string) {
  const messages: Record<string, string> = {
    NOT_ENOUGH_PLAYERS: "至少需要两位已准备玩家。",
    HAND_IN_PROGRESS: "请等待本手结束。",
    SEAT_UNAVAILABLE: "新的座位设置会移除已入座玩家。",
    INVALID_CONFIG: "牌桌设置无效。",
    PLAYER_NOT_FOUND: "没有找到这个玩家。",
  };
  return messages[code] ?? "当前不能执行这个管理操作。";
}
