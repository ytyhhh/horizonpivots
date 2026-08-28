import { randomUUID } from "node:crypto";
import {
  PokerEngineError,
  applyPlayerAction,
  applyTurnTimeout,
  setPlayerReady,
  setPlayerSittingOut,
  setTableStatus,
  type GameTransition,
  type PlayerActionType,
} from "@/lib/game";
import { apiError, assertMutationOrigin, json, readJson } from "@/lib/server/http";
import { isVersionConflict } from "@/lib/server/operations";
import { actorForRoom, commitGameState, gameStateForRoom, isUuid, roomByPublicId, roomStatePayload } from "@/lib/server/rooms";
import { dpAdminClient } from "@/lib/server/supabase";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

const pokerActions = new Set(["fold", "check", "call", "bet", "raise", "all_in"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const startedAt = performance.now();
  if (!assertMutationOrigin(request)) return apiError(403, "ORIGIN_REJECTED", "请求来源无效。");
  const { id } = await context.params;
  const body = await readJson(request);
  if (!body) return apiError(400, "INVALID_JSON", "操作格式无效。");
  const actionId = typeof body.actionId === "string" ? body.actionId : "";
  const expectedVersion = Number(body.expectedVersion);
  const type = typeof body.type === "string" ? body.type : "";
  if (!isUuid(actionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    return apiError(422, "INVALID_ACTION", "操作编号或牌桌版本无效。");
  }

  try {
    let room = await roomByPublicId(id);
    if (!room) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    const actor = await actorForRoom(room);
    if (!actor) return apiError(404, "ROOM_NOT_FOUND", "牌桌不存在或会话已经失效。");
    const contextReadyAt = performance.now();

    const stored = await gameStateForRoom(room.id);
    if (!stored) return apiError(503, "STATE_UNAVAILABLE", "牌桌正在同步，请稍后重试。");
    if (stored.version !== expectedVersion) {
      // The idempotency lookup is only needed for a retried or stale request.
      // Keeping it off the normal action path saves one cross-service round trip.
      const { data: existing, error: existingError } = await dpAdminClient()
        .from("dp_action_log")
        .select("room_id")
        .eq("action_id", actionId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return apiError(409, "VERSION_CONFLICT", "牌桌已经更新，请同步后重试。");
      if (existing.room_id !== room.id) return apiError(422, "ACTION_ID_REUSED", "操作编号无效。");
      room = { ...room, version: stored.version };
      return json(await roomStatePayload(room, actor, { stored }));
    }
    let transition: GameTransition;
    if (pokerActions.has(type)) {
      if (actor.role === "spectator") return apiError(403, "PLAYER_ONLY", "旁观者不能操作手牌。");
      const amount = body.amount === undefined ? undefined : Number(body.amount);
      if (amount !== undefined && (!Number.isSafeInteger(amount) || amount < 0)) {
        return apiError(422, "INVALID_AMOUNT", "筹码金额无效。");
      }
      transition = applyPlayerAction(stored.state, {
        actionId,
        expectedVersion,
        playerId: actor.participantId,
        type: toEngineAction(type),
        ...(amount === undefined ? {} : { amount }),
      });
    } else if (type === "timeout") {
      transition = applyTurnTimeout(stored.state, { commandId: actionId, expectedVersion });
    } else if (type === "ready" || type === "resume_seat") {
      if (actor.role === "spectator") return apiError(403, "PLAYER_ONLY", "旁观者没有座位。");
      transition = setPlayerReady(stored.state, actor.participantId, true, { commandId: actionId, expectedVersion });
    } else if (type === "sit_out") {
      if (actor.role === "spectator") return apiError(403, "PLAYER_ONLY", "旁观者没有座位。");
      if (stored.state.status === "playing") return apiError(422, "HAND_IN_PROGRESS", "请在本手结束后暂离。");
      transition = setPlayerSittingOut(stored.state, actor.participantId, true, { commandId: actionId, expectedVersion });
    } else {
      return apiError(422, "INVALID_ACTION", "不支持这个牌桌操作。");
    }

    const settled = transition.events.some((event) => event.type === "hand-settled");
    let nextState = transition.state;
    if (settled && room.pause_after_hand) {
      nextState = setTableStatus(nextState, "paused", {
        commandId: randomUUID(),
        expectedVersion: nextState.version,
      }).state;
    }
    const committed = await commitGameState({
      roomId: room.id,
      actionId,
      expectedVersion,
      actorParticipantId: actor.participantId,
      actionKind: settled ? "hand_settled" : normalizeActionKind(type),
      state: nextState,
      metadata: settled ? settlementMetadata(nextState) : actionMetadata(type, body.amount),
    });
    const committedAt = performance.now();
    const committedVersion = committed?.version ?? nextState.version;
    if (committedVersion !== nextState.version) throw new Error("Committed poker version did not match the transition.");
    room = roomAfterTransition(room, nextState.status, committedVersion);
    const payload = await roomStatePayload(room, actor, {
      stored: { version: committedVersion, state: nextState },
    });
    const completedAt = performance.now();
    const timings = {
      contextMs: Math.round(contextReadyAt - startedAt),
      commitMs: Math.round(committedAt - contextReadyAt),
      payloadMs: Math.round(completedAt - committedAt),
      totalMs: Math.round(completedAt - startedAt),
    };
    console.info(JSON.stringify({ event: "dp_action_timing", ...timings }));
    return json(payload, {
      headers: {
        "Server-Timing": `context;dur=${timings.contextMs}, commit;dur=${timings.commitMs}, payload;dur=${timings.payloadMs}`,
      },
    });
  } catch (caught) {
    if (isVersionConflict(caught) || (caught instanceof PokerEngineError && caught.code === "VERSION_CONFLICT")) {
      return apiError(409, "VERSION_CONFLICT", "牌桌已经更新，请同步后重试。");
    }
    if (caught instanceof PokerEngineError) return apiError(422, caught.code, engineMessage(caught.code));
    return apiError(500, "ACTION_FAILED", "操作没有完成，请稍后重试。");
  }
}

function roomAfterTransition(room: NonNullable<Awaited<ReturnType<typeof roomByPublicId>>>, status: string, version: number) {
  const dbStatus = status === "playing"
    ? "active"
    : status === "paused"
      ? "paused"
      : status === "closed"
        ? "closed"
        : "lobby";
  return { ...room, status: dbStatus, version } as typeof room;
}

function toEngineAction(type: string): PlayerActionType {
  return type === "all_in" ? "all-in" : type as PlayerActionType;
}

function normalizeActionKind(type: string) {
  return type.replaceAll("-", "_").slice(0, 40);
}

function actionMetadata(type: string, amount: unknown) {
  const numericAmount = Number(amount);
  return Number.isSafeInteger(numericAmount) && numericAmount >= 0
    ? { action: normalizeActionKind(type), amount: numericAmount }
    : { action: normalizeActionKind(type) };
}

function settlementMetadata(state: GameTransition["state"]) {
  const awards = state.hand?.settlement?.awards ?? [];
  const winners = [...new Set(awards.map((award) => state.players.find((player) => player.id === award.playerId)?.name).filter(Boolean))];
  return {
    handSettled: true,
    handNumber: state.handNumber,
    summary: winners.length ? `${winners.join("、")} 赢得本手。` : "本手牌局已结算。",
  };
}

function engineMessage(code: string) {
  const messages: Record<string, string> = {
    NOT_YOUR_TURN: "还没轮到你操作。",
    INVALID_ACTION: "当前不能执行这个操作。",
    INVALID_BET: "下注金额不符合当前规则。",
    ACTION_NOT_REOPENED: "这次短码全下没有重新开放加注。",
    TIMEOUT_NOT_REACHED: "当前行动时间还没有结束。",
    HAND_NOT_RUNNING: "当前没有进行中的手牌。",
    HAND_IN_PROGRESS: "请等待本手结束。",
    PLAYER_NOT_FOUND: "没有找到你的座位。",
  };
  return messages[code] ?? "当前操作不符合牌桌规则。";
}
