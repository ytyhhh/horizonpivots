import type { GameState, HandCategory, PublicGameSnapshot } from "@/lib/game";
import { createPublicSnapshot } from "@/lib/game";
import type { RoomState } from "@/types/game";
import { dpAdminClient } from "./supabase";
import { guestTokenHash, ownerRoomCode } from "./session";
import { ownerIdentity } from "./owner";

export interface DbRoom {
  id: string;
  public_id: string;
  owner_clerk_user_id: string;
  status: "lobby" | "active" | "paused" | "closed" | "expired";
  locked: boolean;
  pause_after_hand: boolean;
  spectators_enabled: boolean;
  max_seats: number;
  starting_stack: number;
  small_blind: number;
  big_blind: number;
  action_timeout_seconds: number;
  broadcast_topic: string;
  version: number;
  created_at: string;
  expires_at: string;
  closed_at: string | null;
}

export interface DbParticipant {
  id: string;
  room_id: string;
  kind: "owner" | "guest";
  clerk_user_id: string | null;
  display_name: string;
  role: "player" | "spectator";
  seat: number | null;
  stack: number;
  status: "joined" | "ready" | "active" | "sitting_out" | "folded" | "all_in" | "left" | "kicked";
  joined_at: string;
  last_seen_at: string;
}

export interface RoomActor {
  participantId: string;
  role: "owner" | "player" | "spectator";
  isOwner: boolean;
}

interface DbChatMessage {
  id: string;
  participant_id: string;
  kind: "text" | "reaction";
  content: string;
  created_at: string;
}

interface DbActionLog {
  action_id: string;
  participant_id: string | null;
  action_kind: string;
  resulting_version: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const roomColumns = "id,public_id,owner_clerk_user_id,status,locked,pause_after_hand,spectators_enabled,max_seats,starting_stack,small_blind,big_blind,action_timeout_seconds,broadcast_topic,version,created_at,expires_at,closed_at";
const participantColumns = "id,room_id,kind,clerk_user_id,display_name,role,seat,stack,status,joined_at,last_seen_at";

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function roomByPublicId(publicId: string) {
  if (!isUuid(publicId)) return null;
  const { data, error } = await dpAdminClient()
    .from("dp_rooms")
    .select(roomColumns)
    .eq("public_id", publicId)
    .in("status", ["lobby", "active", "paused"])
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data as unknown as DbRoom | null;
}

export async function activeRoomForOwner(ownerUserId: string) {
  const { data, error } = await dpAdminClient()
    .from("dp_rooms")
    .select(roomColumns)
    .eq("owner_clerk_user_id", ownerUserId)
    .in("status", ["lobby", "active", "paused"])
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data as unknown as DbRoom | null;
}

export async function participantsForRoom(roomId: string) {
  const { data, error } = await dpAdminClient()
    .from("dp_participants")
    .select(participantColumns)
    .eq("room_id", roomId)
    .not("status", "in", "(left,kicked)")
    .order("seat", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as DbParticipant[];
}

export async function actorForRoom(room: DbRoom): Promise<RoomActor | null> {
  const owner = await ownerIdentity();
  if (owner.isOwner && owner.userId === room.owner_clerk_user_id) {
    return ownerActorForRoom(room);
  }

  // Clerk's cross-subdomain session can briefly be unavailable while the
  // browser refreshes it. The encrypted room-code cookie is only issued after
  // this exact Clerk owner has created or re-entered the room, so it is a
  // bounded, HttpOnly recovery credential rather than a second login path.
  const sealedOwnerRoom = await ownerRoomCode();
  if (sealedOwnerRoom?.roomId === room.id) {
    return ownerActorForRoom(room);
  }

  const tokenHash = await guestTokenHash();
  if (!tokenHash) return null;
  const { data, error } = await dpAdminClient().rpc("dp_resolve_guest_session", {
    p_room_id: room.id,
    p_token_hash: tokenHash,
  });
  if (error) throw error;
  const resolved = firstRow(data) as { participant_id?: string; role?: string } | null;
  if (!resolved?.participant_id || (resolved.role !== "player" && resolved.role !== "spectator")) return null;
  return { participantId: resolved.participant_id, role: resolved.role, isOwner: false };
}

async function ownerActorForRoom(room: DbRoom): Promise<RoomActor | null> {
  const { data, error } = await dpAdminClient()
    .from("dp_participants")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("room_id", room.id)
    .eq("kind", "owner")
    .eq("clerk_user_id", room.owner_clerk_user_id)
    .not("status", "in", "(left,kicked)")
    .select("id,role")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { participantId: data.id as string, role: "owner", isOwner: true };
}

export async function gameStateForRoom(roomId: string) {
  const { data, error } = await dpAdminClient().rpc("dp_get_game_state", { p_room_id: roomId });
  if (error) throw error;
  const row = firstRow(data) as { version?: number; state?: unknown } | null;
  if (!row || typeof row.version !== "number" || !isGameState(row.state)) return null;
  return { version: row.version, state: row.state };
}

export async function commitGameState(input: {
  roomId: string;
  actionId: string;
  expectedVersion: number;
  actorParticipantId: string | null;
  actionKind: string;
  state: GameState;
  metadata?: Record<string, unknown>;
}) {
  const publicState = publicStateForStorage(input.state);
  const { data, error } = await dpAdminClient().rpc("dp_commit_state", {
    p_room_id: input.roomId,
    p_action_id: input.actionId,
    p_expected_version: input.expectedVersion,
    p_actor_participant_id: input.actorParticipantId,
    p_action_kind: input.actionKind,
    p_private_state: input.state,
    p_public_state: publicState,
    p_action_metadata: input.metadata ?? {},
  });
  if (error) throw error;
  return firstRow(data) as { version: number; applied: boolean } | null;
}

export function publicStateForStorage(state: GameState) {
  const publicSnapshot = createPublicSnapshot(state, null);
  return {
    ...publicSnapshot,
    players: publicSnapshot.players.map((player) => ({
      id: player.id,
      name: player.name,
      seat: player.seat,
      stack: player.stack,
      connected: player.connected,
      ready: player.ready,
      sittingOut: player.sittingOut,
      handStatus: player.handStatus,
      roundBet: player.roundBet,
      totalBet: player.totalBet,
      lastAction: player.lastAction,
    })),
  };
}

export async function roomStatePayload(
  room: DbRoom,
  actor: RoomActor,
  options?: { stored?: { version: number; state: GameState } },
): Promise<RoomState> {
  const [participants, stored, messagesResult, actionsResult, sealedCode] = await Promise.all([
    participantsForRoom(room.id),
    options?.stored ? Promise.resolve(options.stored) : gameStateForRoom(room.id),
    dpAdminClient().from("dp_chat_messages").select("id,participant_id,kind,content,created_at").eq("room_id", room.id).order("created_at", { ascending: false }).limit(80),
    dpAdminClient().from("dp_action_log").select("action_id,participant_id,action_kind,resulting_version,metadata,created_at").eq("room_id", room.id).order("created_at", { ascending: false }).limit(60),
    actor.isOwner ? ownerRoomCode() : Promise.resolve(null),
  ]);
  if (messagesResult.error) throw messagesResult.error;
  if (actionsResult.error) throw actionsResult.error;
  if (!stored || stored.version !== room.version || stored.state.tableId !== room.id) {
    throw new Error("Poker state is unavailable or inconsistent.");
  }

  const viewerPlayerId = actor.role === "spectator" ? null : actor.participantId;
  const snapshot = createPublicSnapshot(stored.state, viewerPlayerId);
  const names = new Map(participants.map((person) => [person.id, person.display_name]));
  const byId = new Map(participants.map((person) => [person.id, person]));
  const snapshotIds = new Set(snapshot.players.map((player) => player.id));
  const participantState: RoomState["participants"] = snapshot.players.map((player) => {
    const db = byId.get(player.id);
    const handStatus = player.handStatus;
    const status = player.sittingOut
      ? "away"
      : handStatus === "all-in"
        ? "all_in"
        : handStatus === "folded"
          ? "folded"
          : handStatus === "active"
            ? "active"
            : player.ready
              ? "ready"
              : "waiting";
    return {
      id: player.id,
      nickname: player.name,
      seat: player.seat,
      stack: player.stack,
      bet: player.roundBet,
      status: status as "waiting" | "ready" | "active" | "folded" | "all_in" | "away",
      isDealer: snapshot.dealerSeat === player.seat,
      isSmallBlind: snapshot.hand?.smallBlindSeat === player.seat,
      isBigBlind: snapshot.hand?.bigBlindSeat === player.seat,
      isCurrent: snapshot.hand?.currentSeat === player.seat,
      isOwner: db?.kind === "owner",
      cardsVisible: Boolean(player.holeCards),
      cards: player.holeCards?.map(toUiCard),
      joinedAt: db?.joined_at,
    };
  });
  for (const person of participants) {
    if (snapshotIds.has(person.id) || person.role !== "spectator") continue;
    participantState.push({
      id: person.id,
      nickname: person.display_name,
      seat: null,
      stack: 0,
      bet: 0,
      status: "spectating",
      isOwner: person.kind === "owner",
      joinedAt: person.joined_at,
    });
  }

  const viewer = byId.get(actor.participantId);
  const messages = ((messagesResult.data ?? []) as unknown as DbChatMessage[]).reverse().map((message) => ({
    id: message.id,
    participantId: message.participant_id,
    nickname: names.get(message.participant_id) ?? "已离桌玩家",
    body: message.content,
    kind: message.kind,
    createdAt: message.created_at,
  }));
  const history = ((actionsResult.data ?? []) as unknown as DbActionLog[])
    .filter((entry) => entry.action_kind === "hand_settled" || entry.metadata?.handSettled === true)
    .slice(0, 20)
    .map((entry) => ({
      id: entry.action_id,
      handNumber: numberMetadata(entry.metadata, "handNumber") ?? 0,
      summary: stringMetadata(entry.metadata, "summary") ?? "本手牌局已结算。",
      createdAt: entry.created_at,
    }));

  return {
    room: {
      id: room.public_id,
      ...(actor.isOwner && sealedCode?.roomId === room.id ? { code: sealedCode.code } : {}),
      status: roomStatus(room.status),
      version: snapshot.version,
      maxSeats: room.max_seats,
      startingStack: room.starting_stack,
      smallBlind: room.small_blind,
      bigBlind: room.big_blind,
      actionSeconds: room.action_timeout_seconds,
      locked: room.locked,
      spectatorsAllowed: room.spectators_enabled,
      expiresAt: room.expires_at,
      realtimeTopic: `dp:${room.broadcast_topic}`,
    },
    viewer: {
      participantId: actor.participantId,
      nickname: viewer?.display_name ?? null,
      role: actor.role,
      isOwner: actor.isOwner,
      seat: viewer?.seat == null ? null : viewer.seat - 1,
    },
    participants: participantState,
    hand: toHandState(snapshot, stored.state, actor.participantId),
    messages,
    history,
    availableActions: toAvailableActions(snapshot),
  };
}

export async function adminAuditForRoom(roomId: string) {
  const [actionsResult, participantsResult] = await Promise.all([
    dpAdminClient().from("dp_action_log").select("action_id,participant_id,action_kind,created_at").eq("room_id", roomId).order("created_at", { ascending: false }).limit(30),
    dpAdminClient().from("dp_participants").select("id,display_name").eq("room_id", roomId),
  ]);
  if (actionsResult.error) throw actionsResult.error;
  if (participantsResult.error) throw participantsResult.error;
  const names = new Map((participantsResult.data ?? []).map((participant) => [participant.id as string, participant.display_name as string]));
  return (actionsResult.data ?? []).map((entry) => ({
    id: entry.action_id as string,
    action: entry.action_kind as string,
    actor: entry.participant_id ? names.get(entry.participant_id as string) ?? "已离桌玩家" : "系统",
    createdAt: entry.created_at as string,
  }));
}

function firstRow(value: unknown) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value && typeof value === "object" ? value : null;
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GameState>;
  return typeof state.tableId === "string"
    && typeof state.version === "number"
    && Array.isArray(state.players)
    && typeof state.status === "string";
}

function roomStatus(status: DbRoom["status"]): "waiting" | "playing" | "paused" | "finished" {
  if (status === "lobby") return "waiting";
  if (status === "active") return "playing";
  if (status === "paused") return "paused";
  return "finished";
}

function toUiCard(card: { rank: string; suit: "clubs" | "diamonds" | "hearts" | "spades" }) {
  return { rank: card.rank === "T" ? "10" as const : card.rank as "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "J" | "Q" | "K" | "A", suit: card.suit };
}

function handCategoryLabel(category: HandCategory) {
  return ({
    "high-card": "高牌",
    "one-pair": "一对",
    "two-pair": "两对",
    "three-of-a-kind": "三条",
    straight: "顺子",
    flush: "同花",
    "full-house": "葫芦",
    "four-of-a-kind": "四条",
    "straight-flush": "同花顺",
  } satisfies Record<HandCategory, string>)[category];
}

function handResult(snapshot: PublicGameSnapshot) {
  const settlement = snapshot.hand?.settlement;
  if (!settlement?.awards.length) return null;

  const playersById = new Map(snapshot.players.map((player) => [player.id, player]));
  const awardsByWinner = new Map<string, {
    participantId: string;
    nickname: string;
    amount: number;
    label: string;
    cards: ReturnType<typeof toUiCard>[];
  }>();

  for (const award of settlement.awards) {
    const nickname = playersById.get(award.playerId)?.name ?? "玩家";
    const current = awardsByWinner.get(award.playerId);
    if (current) {
      current.amount += award.amount;
      if (!current.cards.length && award.hand) {
        current.label = handCategoryLabel(award.hand.category);
        current.cards = award.hand.cards.map(toUiCard);
      }
      continue;
    }
    awardsByWinner.set(award.playerId, {
      participantId: award.playerId,
      nickname,
      amount: award.amount,
      label: award.hand ? handCategoryLabel(award.hand.category) : "无需摊牌",
      cards: award.hand?.cards.map(toUiCard) ?? [],
    });
  }

  const winningHands = [...awardsByWinner.values()];
  const winners = winningHands.map((winner) => winner.nickname);
  const awardsPerPot = new Map<number, number>();
  for (const award of settlement.awards) {
    awardsPerPot.set(award.potIndex, (awardsPerPot.get(award.potIndex) ?? 0) + 1);
  }
  const hasSplitPot = [...awardsPerPot.values()].some((awardCount) => awardCount > 1);
  const title = winners.length === 1
    ? `${winners[0]} 赢得本手`
    : hasSplitPot
      ? `${winners.join("、")} 平分底池`
      : `${winners.join("、")} 分别赢得底池`;
  return {
    title,
    detail: settlement.reason === "fold" ? "其他玩家已弃牌，无需摊牌" : "以下为各赢家组成牌型的五张牌",
    winners,
    reason: settlement.reason,
    winningHands,
  };
}

function toHandState(snapshot: PublicGameSnapshot, privateState: GameState, viewerId: string) {
  if (!snapshot.hand) {
    return {
      handNumber: snapshot.handNumber,
      phase: "waiting" as const,
      board: [],
      holeCards: [],
      pot: 0,
      sidePots: [],
      currentBet: 0,
      minRaise: snapshot.config.bigBlind,
      actingParticipantId: null,
      deadlineAt: null,
      result: null,
    };
  }
  const player = snapshot.players.find((candidate) => candidate.id === viewerId);
  const current = snapshot.players.find((candidate) => candidate.seat === snapshot.hand?.currentSeat);
  const sidePots = privateState.hand?.settlement?.pots.map((pot) => pot.amount) ?? [];
  return {
    handNumber: snapshot.handNumber,
    phase: snapshot.hand.street,
    board: snapshot.hand.board.map(toUiCard),
    holeCards: player?.holeCards?.map(toUiCard) ?? [],
    pot: snapshot.hand.pot,
    sidePots,
    currentBet: snapshot.hand.currentBet,
    minRaise: snapshot.hand.minRaise,
    actingParticipantId: current?.id ?? null,
    deadlineAt: snapshot.hand.actionDeadlineAt ? new Date(snapshot.hand.actionDeadlineAt).toISOString() : null,
    result: handResult(snapshot),
  };
}

function toAvailableActions(snapshot: PublicGameSnapshot) {
  const legal = snapshot.legalActions;
  if (!legal?.isTurn) return [];
  const actions: RoomState["availableActions"] = [];
  if (legal.canFold) actions.push({ type: "fold" });
  if (legal.canCheck) actions.push({ type: "check" });
  if (legal.canCall) actions.push({ type: "call", amount: legal.toCall });
  if (legal.canBet && legal.minBetTo !== null) actions.push({ type: "bet", min: legal.minBetTo, max: legal.maxTo });
  if (legal.canRaise && legal.minRaiseTo !== null) actions.push({ type: "raise", min: legal.minRaiseTo, max: legal.maxTo });
  if (legal.canAllIn) actions.push({ type: "all_in", amount: legal.maxTo });
  return actions;
}

function numberMetadata(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" ? value : null;
}

function stringMetadata(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}
