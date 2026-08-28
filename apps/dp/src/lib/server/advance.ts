import { randomUUID } from "node:crypto";
import { removePlayer, setTableStatus, startHand, type GameState } from "@/lib/game";
import { commitGameState, gameStateForRoom, type DbRoom } from "./rooms";
import { dpAdminClient } from "./supabase";

const SHOWDOWN_DISPLAY_MS = 8_000;

export async function advanceRoomIfDue(room: DbRoom) {
  const stored = await gameStateForRoom(room.id);
  if (!stored) return false;
  let state = stored.state;
  if (state.status === "playing") return false;

  const pruneResult = await pruneInactivePlayers(room.id, state);
  state = pruneResult.state;
  let rootActionId = pruneResult.rootActionId;

  if (room.pause_after_hand && state.status === "waiting" && state.handNumber > 0) {
    const commandId = randomUUID();
    rootActionId ??= commandId;
    state = setTableStatus(state, "paused", {
      commandId,
      expectedVersion: state.version,
    }).state;
  } else if (shouldStartNextHand(state) && await ownerIsOnline(room.id)) {
    const commandId = randomUUID();
    rootActionId ??= commandId;
    state = startHand(state, {
      commandId,
      expectedVersion: state.version,
    }).state;
  }

  if (!rootActionId || state.version === stored.version) return false;
  await commitGameState({
    roomId: room.id,
    actionId: rootActionId,
    expectedVersion: stored.version,
    actorParticipantId: null,
    actionKind: state.status === "playing" ? "automatic_hand_started" : state.status === "paused" ? "automatic_pause" : "inactive_players_removed",
    state,
    metadata: state.status === "playing" ? { handNumber: state.handNumber, automatic: true } : { automatic: true },
  });
  return true;
}

async function pruneInactivePlayers(roomId: string, initial: GameState) {
  const activeHand = Boolean(initial.hand && initial.hand.street !== "showdown");
  if (activeHand) return { state: initial, rootActionId: null as string | null };
  const { data, error } = await dpAdminClient()
    .from("dp_participants")
    .select("id")
    .eq("room_id", roomId)
    .not("status", "in", "(left,kicked)");
  if (error) throw error;
  const activeIds = new Set((data ?? []).map((row) => row.id as string));
  let state = initial;
  let rootActionId: string | null = null;
  for (const player of initial.players) {
    if (activeIds.has(player.id)) continue;
    const commandId = randomUUID();
    rootActionId ??= commandId;
    state = removePlayer(state, player.id, {
      commandId,
      expectedVersion: state.version,
    }).state;
  }
  return { state, rootActionId };
}

function shouldStartNextHand(state: GameState) {
  if (state.handNumber < 1 || state.status !== "waiting") return false;
  const settledAt = state.hand?.settlement?.completedAt;
  if (!settledAt || Date.now() - settledAt < SHOWDOWN_DISPLAY_MS) return false;
  return state.players.filter((player) => player.ready && !player.sittingOut && player.stack > 0).length >= 2;
}

async function ownerIsOnline(roomId: string) {
  const threshold = new Date(Date.now() - 15_000).toISOString();
  const { data, error } = await dpAdminClient()
    .from("dp_participants")
    .select("id")
    .eq("room_id", roomId)
    .eq("kind", "owner")
    .gt("last_seen_at", threshold)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
