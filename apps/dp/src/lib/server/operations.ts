import { randomUUID } from "node:crypto";
import { addPlayer, createGameState } from "@/lib/game";
import { dpAdminClient } from "./supabase";
import {
  commitGameState,
  gameStateForRoom,
  publicStateForStorage,
  type DbParticipant,
} from "./rooms";

export interface RoomSettings {
  maxSeats: number;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  actionSeconds: number;
}

export function parseRoomSettings(body: Record<string, unknown>): RoomSettings | null {
  const values = {
    maxSeats: Number(body.maxSeats),
    startingStack: Number(body.startingStack),
    smallBlind: Number(body.smallBlind),
    bigBlind: Number(body.bigBlind),
    actionSeconds: Number(body.actionSeconds),
  };
  if (!Object.values(values).every(Number.isSafeInteger)) return null;
  if (values.maxSeats < 2 || values.maxSeats > 9) return null;
  if (values.startingStack < 1_000 || values.startingStack > 1_000_000_000) return null;
  if (values.smallBlind < 1 || values.bigBlind < values.smallBlind || values.bigBlind > 200_000_000) return null;
  if (values.startingStack < values.bigBlind * 2) return null;
  if (values.actionSeconds < 15 || values.actionSeconds > 120) return null;
  return values;
}

export async function createRoomRecord(input: {
  roomId: string;
  publicId: string;
  codeHash: string;
  broadcastTopic: string;
  ownerParticipantId: string;
  ownerUserId: string;
  ownerName: string;
  settings: RoomSettings;
}) {
  const state = createGameState({
    tableId: input.roomId,
    config: {
      maxSeats: input.settings.maxSeats,
      startingStack: input.settings.startingStack,
      smallBlind: input.settings.smallBlind,
      bigBlind: input.settings.bigBlind,
      actionTimeoutMs: input.settings.actionSeconds * 1_000,
    },
    players: [{
      id: input.ownerParticipantId,
      name: input.ownerName,
      seat: 0,
      stack: input.settings.startingStack,
      connected: true,
      ready: true,
    }],
  });
  const { data, error } = await dpAdminClient().rpc("dp_create_room", {
    p_room_id: input.roomId,
    p_public_id: input.publicId,
    p_code_hash: input.codeHash,
    p_broadcast_topic: input.broadcastTopic,
    p_owner_participant_id: input.ownerParticipantId,
    p_owner_clerk_user_id: input.ownerUserId,
    p_owner_display_name: input.ownerName,
    p_max_seats: input.settings.maxSeats,
    p_starting_stack: input.settings.startingStack,
    p_small_blind: input.settings.smallBlind,
    p_big_blind: input.settings.bigBlind,
    p_action_timeout_seconds: input.settings.actionSeconds,
    p_initial_private_state: state,
    p_initial_public_state: publicStateForStorage(state),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") throw new Error("Room creation returned no result.");
  return row as { room_id: string; public_id: string; owner_participant_id: string; broadcast_topic: string; version: number; expires_at: string };
}

export async function ensureParticipantInGame(roomId: string, participantId: string) {
  const { data, error } = await dpAdminClient()
    .from("dp_participants")
    .select("id,room_id,kind,clerk_user_id,display_name,role,seat,stack,status,joined_at,last_seen_at")
    .eq("id", participantId)
    .eq("room_id", roomId)
    .not("status", "in", "(left,kicked)")
    .maybeSingle();
  if (error) throw error;
  const participant = data as unknown as DbParticipant | null;
  if (!participant || participant.role === "spectator") return;
  if (participant.seat === null) throw new Error("A player session has no seat.");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const stored = await gameStateForRoom(roomId);
    if (!stored) throw new Error("Poker state is unavailable.");
    if (stored.state.players.some((player) => player.id === participantId)) return;
    const actionId = randomUUID();
    const transition = addPlayer(stored.state, {
      id: participant.id,
      name: participant.display_name,
      seat: participant.seat - 1,
      stack: participant.stack,
      connected: true,
      ready: participant.status === "ready",
      sittingOut: participant.status === "sitting_out",
    }, {
      commandId: actionId,
      expectedVersion: stored.version,
    });
    try {
      await commitGameState({
        roomId,
        actionId,
        expectedVersion: stored.version,
        actorParticipantId: participant.id,
        actionKind: "player_joined",
        state: transition.state,
        metadata: { participantJoined: true },
      });
      return;
    } catch (caught) {
      if (!isVersionConflict(caught) || attempt === 4) throw caught;
    }
  }
}

export function isVersionConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === "40001" || (typeof candidate.message === "string" && candidate.message.includes("version_conflict"));
}

export function isOpenRoomConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown };
  return candidate.code === "23505"
    && [candidate.message, candidate.details].some((value) => typeof value === "string" && value.includes("dp_rooms_one_open_room_idx"));
}
