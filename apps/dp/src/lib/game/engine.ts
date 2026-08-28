import { createShuffledDeck, validateDeck } from "./deck";
import { compareHands, evaluateBestHand } from "./evaluator";
import {
  PokerEngineError,
  type Card,
  type BettingStreet,
  type GameConfig,
  type GameEvent,
  type GameState,
  type GameTransition,
  type HandPlayerState,
  type HandState,
  type LegalActions,
  type PlayerAction,
  type PotAward,
  type SidePot,
  type StartHandOptions,
  type TablePlayer,
  type TableStatus,
} from "./types";

const DEFAULT_CONFIG: GameConfig = {
  maxSeats: 6,
  startingStack: 10_000,
  smallBlind: 50,
  bigBlind: 100,
  actionTimeoutMs: 45_000,
};

const PROCESSED_ACTION_LIMIT = 256;

export interface TablePlayerInput {
  id: string;
  name: string;
  seat: number;
  stack?: number;
  connected?: boolean;
  ready?: boolean;
  sittingOut?: boolean;
}

export interface CreateGameStateOptions {
  tableId: string;
  config?: Partial<GameConfig>;
  players?: TablePlayerInput[];
  dealerSeat?: number | null;
}

export interface VersionedCommand {
  commandId: string;
  expectedVersion: number;
  now?: number;
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function validateConfig(config: GameConfig): void {
  if (!Number.isInteger(config.maxSeats) || config.maxSeats < 2 || config.maxSeats > 9) {
    throw new PokerEngineError("INVALID_CONFIG", "maxSeats must be between 2 and 9");
  }
  if (
    !isPositiveInteger(config.startingStack) ||
    !isPositiveInteger(config.smallBlind) ||
    !isPositiveInteger(config.bigBlind) ||
    config.smallBlind > config.bigBlind ||
    !isPositiveInteger(config.actionTimeoutMs)
  ) {
    throw new PokerEngineError("INVALID_CONFIG", "Invalid stack, blind, or timeout configuration");
  }
}

function normalizePlayer(input: TablePlayerInput, config: GameConfig): TablePlayer {
  const name = input.name.trim();
  const stack = input.stack ?? config.startingStack;
  if (!input.id.trim() || !name) {
    throw new PokerEngineError("INVALID_STATE", "Player id and name are required");
  }
  if (!Number.isInteger(input.seat) || input.seat < 0 || input.seat >= config.maxSeats) {
    throw new PokerEngineError("SEAT_UNAVAILABLE", "Seat is outside the table range");
  }
  if (!Number.isSafeInteger(stack) || stack < 0) {
    throw new PokerEngineError("INVALID_STATE", "Player stack must be a non-negative integer");
  }
  return {
    id: input.id,
    name,
    seat: input.seat,
    stack,
    connected: input.connected ?? true,
    ready: input.ready ?? true,
    sittingOut: input.sittingOut ?? false,
  };
}

export function createGameState(options: CreateGameStateOptions): GameState {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  validateConfig(config);
  if (!options.tableId.trim()) {
    throw new PokerEngineError("INVALID_STATE", "tableId is required");
  }
  const players = (options.players ?? []).map((player) => normalizePlayer(player, config));
  if (new Set(players.map((player) => player.id)).size !== players.length) {
    throw new PokerEngineError("DUPLICATE_PLAYER", "Player ids must be unique");
  }
  if (new Set(players.map((player) => player.seat)).size !== players.length) {
    throw new PokerEngineError("SEAT_UNAVAILABLE", "Seats must be unique");
  }
  return {
    tableId: options.tableId,
    version: 0,
    status: "waiting",
    config,
    handNumber: 0,
    dealerSeat: options.dealerSeat ?? null,
    players: players.sort((left, right) => left.seat - right.seat),
    hand: null,
    processedActionIds: [],
  };
}

function cloneCards(cards: readonly Card[]): Card[] {
  return cards.map((card) => ({ ...card }));
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    config: { ...state.config },
    players: state.players.map((player) => ({ ...player })),
    processedActionIds: [...state.processedActionIds],
    hand: state.hand
      ? {
          ...state.hand,
          board: cloneCards(state.hand.board),
          deck: cloneCards(state.hand.deck),
          burned: cloneCards(state.hand.burned),
          pendingSeats: [...state.hand.pendingSeats],
          players: state.hand.players.map((player) => ({
            ...player,
            holeCards: cloneCards(player.holeCards),
          })),
          settlement: state.hand.settlement
            ? {
                ...state.hand.settlement,
                pots: state.hand.settlement.pots.map((pot) => ({
                  ...pot,
                  eligiblePlayerIds: [...pot.eligiblePlayerIds],
                })),
                awards: state.hand.settlement.awards.map((award) => ({
                  ...award,
                  hand: award.hand
                    ? {
                        ...award.hand,
                        ranks: [...award.hand.ranks],
                        cards: cloneCards(award.hand.cards),
                      }
                    : null,
                })),
              }
            : null,
        }
      : null,
  };
}

function assertVersion(state: GameState, expectedVersion: number): void {
  if (state.version !== expectedVersion) {
    throw new PokerEngineError(
      "VERSION_CONFLICT",
      `Expected version ${expectedVersion}, found ${state.version}`,
    );
  }
}

function hasProcessed(state: GameState, actionId: string): boolean {
  return state.processedActionIds.includes(actionId);
}

function validateActionId(actionId: string): void {
  if (!actionId.trim()) {
    throw new PokerEngineError("INVALID_ACTION", "A non-empty action id is required");
  }
}

function recordAction(state: GameState, actionId: string): void {
  state.processedActionIds.push(actionId);
  if (state.processedActionIds.length > PROCESSED_ACTION_LIMIT) {
    state.processedActionIds.splice(0, state.processedActionIds.length - PROCESSED_ACTION_LIMIT);
  }
}

function orderedSeatsAfter(reference: number, seats: readonly number[]): number[] {
  return [...seats].sort((left, right) => {
    const leftDistance = left > reference ? left - reference : left + 100 - reference;
    const rightDistance = right > reference ? right - reference : right + 100 - reference;
    return leftDistance - rightDistance;
  });
}

function nextSeatAfter(reference: number, seats: readonly number[]): number {
  const ordered = orderedSeatsAfter(reference, seats);
  if (ordered.length === 0) {
    throw new PokerEngineError("INVALID_STATE", "No eligible next seat");
  }
  return ordered[0];
}

function tablePlayer(state: GameState, playerId: string): TablePlayer {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new PokerEngineError("PLAYER_NOT_FOUND", "Player is not seated");
  return player;
}

function handPlayerById(hand: HandState, playerId: string): HandPlayerState {
  const player = hand.players.find((candidate) => candidate.playerId === playerId);
  if (!player) throw new PokerEngineError("PLAYER_NOT_FOUND", "Player is not in this hand");
  return player;
}

function handPlayerBySeat(hand: HandState, seat: number): HandPlayerState {
  const player = hand.players.find((candidate) => candidate.seat === seat);
  if (!player) throw new PokerEngineError("INVALID_STATE", `No hand player at seat ${seat}`);
  return player;
}

function isLive(player: HandPlayerState): boolean {
  return player.status === "active" || player.status === "all-in";
}

function canAct(state: GameState, player: HandPlayerState): boolean {
  return player.status === "active" && tablePlayer(state, player.playerId).stack > 0;
}

function draw(hand: HandState, count: number): Card[] {
  if (hand.deck.length < count) {
    throw new PokerEngineError("DECK_INVALID", "Deck ran out of cards");
  }
  return hand.deck.splice(0, count);
}

function commitChips(state: GameState, player: HandPlayerState, requested: number): number {
  const seated = tablePlayer(state, player.playerId);
  const amount = Math.min(requested, seated.stack);
  seated.stack -= amount;
  player.roundBet += amount;
  player.totalBet += amount;
  if (seated.stack === 0 && player.status === "active") player.status = "all-in";
  return amount;
}

function setTurn(hand: HandState, seat: number | null, now: number, timeoutMs: number): void {
  hand.currentSeat = seat;
  hand.actionStartedAt = seat === null ? null : now;
  hand.actionDeadlineAt = seat === null ? null : now + timeoutMs;
}

function actionables(state: GameState): HandPlayerState[] {
  if (!state.hand) return [];
  return state.hand.players.filter((player) => canAct(state, player));
}

function normalizePending(state: GameState): void {
  const hand = state.hand;
  if (!hand) return;
  const valid = new Set(actionables(state).map((player) => player.seat));
  hand.pendingSeats = [...new Set(hand.pendingSeats)].filter((seat) => valid.has(seat));

  const actingPlayers = actionables(state);
  if (actingPlayers.length === 1 && hand.players.filter(isLive).length > 1) {
    const lonePlayer = actingPlayers[0];
    if (lonePlayer.roundBet >= hand.currentBet) {
      hand.pendingSeats = hand.pendingSeats.filter((seat) => seat !== lonePlayer.seat);
    }
  }
}

export function getPotTotal(state: GameState): number {
  return state.hand?.players.reduce((sum, player) => sum + player.totalBet, 0) ?? 0;
}

export function buildSidePots(players: readonly HandPlayerState[]): SidePot[] {
  const levels = [...new Set(players.map((player) => player.totalBet).filter((amount) => amount > 0))]
    .sort((left, right) => left - right);
  const pots: SidePot[] = [];
  let previous = 0;
  for (const level of levels) {
    const contributors = players.filter((player) => player.totalBet >= level);
    const amount = (level - previous) * contributors.length;
    const eligiblePlayerIds = contributors.filter(isLive).map((player) => player.playerId);
    if (amount > 0 && eligiblePlayerIds.length > 0) {
      pots.push({ amount, eligiblePlayerIds });
    }
    previous = level;
  }
  return pots;
}

function awardPot(state: GameState, playerId: string, amount: number): void {
  tablePlayer(state, playerId).stack += amount;
}

function settleByFold(state: GameState, now: number, events: GameEvent[]): void {
  const hand = state.hand;
  if (!hand) throw new PokerEngineError("HAND_NOT_RUNNING", "No hand is running");
  const winner = hand.players.find(isLive);
  if (!winner) throw new PokerEngineError("INVALID_STATE", "A folded hand has no winner");
  const amount = getPotTotal(state);
  awardPot(state, winner.playerId, amount);
  const pots = buildSidePots(hand.players);
  hand.street = "showdown";
  hand.pendingSeats = [];
  setTurn(hand, null, now, state.config.actionTimeoutMs);
  hand.settlement = {
    reason: "fold",
    pots,
    awards: [{ potIndex: 0, playerId: winner.playerId, amount, hand: null }],
    completedAt: now,
  };
  state.status = "waiting";
  events.push({ type: "hand-settled", at: now, playerId: winner.playerId, amount });
}

function winnerOrder(state: GameState, winnerIds: readonly string[]): string[] {
  const hand = state.hand;
  if (!hand || state.dealerSeat === null) return [...winnerIds];
  const winners = new Set(winnerIds);
  return orderedSeatsAfter(
    state.dealerSeat,
    hand.players.map((player) => player.seat),
  )
    .map((seat) => handPlayerBySeat(hand, seat).playerId)
    .filter((playerId) => winners.has(playerId));
}

function settleShowdown(state: GameState, now: number, events: GameEvent[]): void {
  const hand = state.hand;
  if (!hand) throw new PokerEngineError("HAND_NOT_RUNNING", "No hand is running");
  if (hand.board.length !== 5) {
    throw new PokerEngineError("INVALID_STATE", "Showdown requires five community cards");
  }
  const evaluated = new Map(
    hand.players
      .filter(isLive)
      .map((player) => [player.playerId, evaluateBestHand([...player.holeCards, ...hand.board])] as const),
  );
  const pots = buildSidePots(hand.players);
  const awards: PotAward[] = [];

  pots.forEach((pot, potIndex) => {
    let winners: string[] = [];
    for (const playerId of pot.eligiblePlayerIds) {
      if (winners.length === 0) {
        winners = [playerId];
        continue;
      }
      const comparison = compareHands(evaluated.get(playerId)!, evaluated.get(winners[0])!);
      if (comparison > 0) winners = [playerId];
      else if (comparison === 0) winners.push(playerId);
    }
    const orderedWinners = winnerOrder(state, winners);
    const baseShare = Math.floor(pot.amount / orderedWinners.length);
    let remainder = pot.amount % orderedWinners.length;
    orderedWinners.forEach((playerId) => {
      const amount = baseShare + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      awardPot(state, playerId, amount);
      awards.push({ potIndex, playerId, amount, hand: evaluated.get(playerId)! });
    });
  });

  hand.street = "showdown";
  hand.pendingSeats = [];
  setTurn(hand, null, now, state.config.actionTimeoutMs);
  hand.settlement = { reason: "showdown", pots, awards, completedAt: now };
  state.status = "waiting";
  events.push({ type: "hand-settled", at: now });
}

function dealNextStreet(hand: HandState): BettingStreet {
  hand.burned.push(...draw(hand, 1));
  if (hand.street === "preflop") {
    hand.board.push(...draw(hand, 3));
    hand.street = "flop";
  } else if (hand.street === "flop") {
    hand.board.push(...draw(hand, 1));
    hand.street = "turn";
  } else if (hand.street === "turn") {
    hand.board.push(...draw(hand, 1));
    hand.street = "river";
  } else {
    throw new PokerEngineError("INVALID_STATE", "There is no next street to deal");
  }
  return hand.street;
}

function advanceBettingRound(state: GameState, now: number, events: GameEvent[]): void {
  const hand = state.hand;
  if (!hand) throw new PokerEngineError("HAND_NOT_RUNNING", "No hand is running");

  if (hand.street === "river") {
    settleShowdown(state, now, events);
    return;
  }

  while (true) {
    const dealtStreet = dealNextStreet(hand);
    events.push({ type: "street-dealt", at: now, street: dealtStreet });
    hand.players.forEach((player) => {
      player.roundBet = 0;
      player.actedSinceLastFullRaise = false;
      player.lastAction = null;
    });
    hand.currentBet = 0;
    hand.minRaise = state.config.bigBlind;
    hand.lastAggressorSeat = null;
    hand.pendingSeats = actionables(state).map((player) => player.seat);
    normalizePending(state);

    if (hand.pendingSeats.length > 0) {
      const currentSeat = nextSeatAfter(state.dealerSeat ?? -1, hand.pendingSeats);
      setTurn(hand, currentSeat, now, state.config.actionTimeoutMs);
      return;
    }
    if (dealtStreet === "river") break;
  }

  settleShowdown(state, now, events);
}

function nextPendingSeat(hand: HandState, afterSeat: number): number | null {
  return hand.pendingSeats.length > 0
    ? nextSeatAfter(afterSeat, hand.pendingSeats)
    : null;
}

export function startHand(state: GameState, options: StartHandOptions): GameTransition {
  validateActionId(options.commandId);
  if (hasProcessed(state, options.commandId)) {
    return { state, events: [], duplicate: true };
  }
  assertVersion(state, options.expectedVersion);
  if (state.status === "playing" || (state.hand && state.hand.street !== "showdown")) {
    throw new PokerEngineError("HAND_IN_PROGRESS", "A hand is already running");
  }
  if (state.status === "paused" || state.status === "closed") {
    throw new PokerEngineError("INVALID_STATE", "The table cannot start a hand in its current state");
  }

  const next = cloneState(state);
  const eligible = next.players.filter(
    (player) => player.ready && !player.sittingOut && player.stack > 0,
  );
  if (eligible.length < 2) {
    throw new PokerEngineError("NOT_ENOUGH_PLAYERS", "At least two ready players need chips");
  }
  const eligibleSeats = eligible.map((player) => player.seat);
  const dealerSeat =
    next.dealerSeat === null
      ? Math.min(...eligibleSeats)
      : nextSeatAfter(next.dealerSeat, eligibleSeats);
  const smallBlindSeat =
    eligible.length === 2 ? dealerSeat : nextSeatAfter(dealerSeat, eligibleSeats);
  const bigBlindSeat = nextSeatAfter(smallBlindSeat, eligibleSeats);
  const deck = options.deck ? cloneCards(options.deck) : createShuffledDeck();
  validateDeck(deck, eligible.length * 2 + 8);
  const now = options.now ?? Date.now();
  const handNumber = next.handNumber + 1;
  const handPlayers: HandPlayerState[] = eligible
    .map((player) => ({
      playerId: player.id,
      seat: player.seat,
      holeCards: [],
      status: "active" as const,
      roundBet: 0,
      totalBet: 0,
      actedSinceLastFullRaise: false,
      lastAction: null,
    }))
    .sort((left, right) => left.seat - right.seat);
  next.hand = {
    id: options.handId ?? `${next.tableId}-${handNumber}`,
    street: "preflop",
    board: [],
    deck,
    burned: [],
    players: handPlayers,
    smallBlindSeat,
    bigBlindSeat,
    currentSeat: null,
    pendingSeats: [],
    currentBet: 0,
    minRaise: next.config.bigBlind,
    lastAggressorSeat: bigBlindSeat,
    actionStartedAt: null,
    actionDeadlineAt: null,
    startedAt: now,
    settlement: null,
  };
  next.status = "playing";
  next.handNumber = handNumber;
  next.dealerSeat = dealerSeat;
  next.version += 1;
  recordAction(next, options.commandId);

  const hand = next.hand;
  const dealOrder = orderedSeatsAfter(dealerSeat, eligibleSeats);
  for (let round = 0; round < 2; round += 1) {
    for (const seat of dealOrder) {
      handPlayerBySeat(hand, seat).holeCards.push(...draw(hand, 1));
    }
  }

  const events: GameEvent[] = [{ type: "hand-started", at: now }];
  const smallBlind = handPlayerBySeat(hand, smallBlindSeat);
  const smallAmount = commitChips(next, smallBlind, next.config.smallBlind);
  events.push({ type: "blind-posted", at: now, playerId: smallBlind.playerId, amount: smallAmount });
  const bigBlind = handPlayerBySeat(hand, bigBlindSeat);
  const bigAmount = commitChips(next, bigBlind, next.config.bigBlind);
  events.push({ type: "blind-posted", at: now, playerId: bigBlind.playerId, amount: bigAmount });
  // A short all-in big blind does not reduce the table's nominal preflop bring-in.
  hand.currentBet = next.config.bigBlind;
  hand.pendingSeats = actionables(next).map((player) => player.seat);
  normalizePending(next);

  if (hand.pendingSeats.length === 0) {
    advanceBettingRound(next, now, events);
  } else {
    setTurn(hand, nextPendingSeat(hand, bigBlindSeat), now, next.config.actionTimeoutMs);
  }
  return { state: next, events, duplicate: false };
}

function emptyLegalActions(): LegalActions {
  return {
    isTurn: false,
    toCall: 0,
    minBetTo: null,
    minRaiseTo: null,
    maxTo: 0,
    canFold: false,
    canCheck: false,
    canCall: false,
    canBet: false,
    canRaise: false,
    canAllIn: false,
  };
}

export function getLegalActions(state: GameState, playerId: string): LegalActions {
  const hand = state.hand;
  if (!hand || state.status !== "playing" || hand.street === "showdown") {
    return emptyLegalActions();
  }
  const player = hand.players.find((candidate) => candidate.playerId === playerId);
  const seated = state.players.find((candidate) => candidate.id === playerId);
  if (!player || !seated || hand.currentSeat !== player.seat || !canAct(state, player)) {
    return emptyLegalActions();
  }
  const toCall = Math.max(0, hand.currentBet - player.roundBet);
  const maxTo = player.roundBet + seated.stack;
  const raiseIsReopened = !player.actedSinceLastFullRaise;
  return {
    isTurn: true,
    toCall,
    minBetTo: hand.currentBet === 0 && maxTo >= state.config.bigBlind ? state.config.bigBlind : null,
    minRaiseTo:
      hand.currentBet > 0 && raiseIsReopened && maxTo >= hand.currentBet + hand.minRaise
        ? hand.currentBet + hand.minRaise
        : null,
    maxTo,
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0 && seated.stack > 0,
    canBet: hand.currentBet === 0 && maxTo >= state.config.bigBlind,
    canRaise:
      hand.currentBet > 0 &&
      raiseIsReopened &&
      maxTo >= hand.currentBet + hand.minRaise,
    canAllIn:
      seated.stack > 0 &&
      !(maxTo > hand.currentBet && hand.currentBet > 0 && !raiseIsReopened),
  };
}

function requireTurn(state: GameState, playerId: string): {
  hand: HandState;
  player: HandPlayerState;
  seated: TablePlayer;
} {
  const hand = state.hand;
  if (!hand || state.status !== "playing" || hand.street === "showdown") {
    throw new PokerEngineError("HAND_NOT_RUNNING", "No betting hand is running");
  }
  const player = handPlayerById(hand, playerId);
  const seated = tablePlayer(state, playerId);
  if (hand.currentSeat !== player.seat || !canAct(state, player)) {
    throw new PokerEngineError("NOT_YOUR_TURN", "It is not this player's turn");
  }
  return { hand, player, seated };
}

function validateTargetAmount(amount: number | undefined): number {
  if (!Number.isSafeInteger(amount) || (amount ?? 0) <= 0) {
    throw new PokerEngineError("INVALID_BET", "A positive integer target amount is required");
  }
  return amount!;
}

function applyAggressiveAction(
  state: GameState,
  player: HandPlayerState,
  target: number,
  originalBet: number,
): void {
  const hand = state.hand!;
  const raiseSize = target - originalBet;
  const opensBetting = originalBet === 0;
  const fullRaise = opensBetting ? target >= state.config.bigBlind : raiseSize >= hand.minRaise;

  hand.currentBet = target;
  hand.lastAggressorSeat = player.seat;
  if (fullRaise) hand.minRaise = opensBetting ? target : raiseSize;

  if (opensBetting || fullRaise) {
    hand.players.forEach((candidate) => {
      if (candidate.playerId !== player.playerId && canAct(state, candidate)) {
        candidate.actedSinceLastFullRaise = false;
      }
    });
  }
  hand.pendingSeats = hand.players
    .filter(
      (candidate) =>
        candidate.playerId !== player.playerId &&
        canAct(state, candidate) &&
        candidate.roundBet < target,
    )
    .map((candidate) => candidate.seat);
}

export function applyPlayerAction(state: GameState, action: PlayerAction): GameTransition {
  validateActionId(action.actionId);
  if (hasProcessed(state, action.actionId)) {
    return { state, events: [], duplicate: true };
  }
  assertVersion(state, action.expectedVersion);
  const next = cloneState(state);
  const { hand, player, seated } = requireTurn(next, action.playerId);
  const now = action.now ?? Date.now();
  const toCall = Math.max(0, hand.currentBet - player.roundBet);
  const originalBet = hand.currentBet;
  const maxTo = player.roundBet + seated.stack;
  let committed = 0;
  let aggressiveTarget: number | null = null;

  switch (action.type) {
    case "fold":
      player.status = "folded";
      break;
    case "check":
      if (toCall !== 0) {
        throw new PokerEngineError("INVALID_ACTION", "Cannot check while facing a bet");
      }
      break;
    case "call":
      if (toCall <= 0) {
        throw new PokerEngineError("INVALID_ACTION", "There is no bet to call");
      }
      committed = commitChips(next, player, toCall);
      break;
    case "bet": {
      if (hand.currentBet !== 0) {
        throw new PokerEngineError("INVALID_ACTION", "Use raise when a bet already exists");
      }
      const target = validateTargetAmount(action.amount);
      if (target > maxTo || target <= player.roundBet) {
        throw new PokerEngineError("INVALID_BET", "Bet is outside the player's stack");
      }
      if (target < next.config.bigBlind && target !== maxTo) {
        throw new PokerEngineError("INVALID_BET", "Opening bet is below the minimum");
      }
      committed = commitChips(next, player, target - player.roundBet);
      aggressiveTarget = target;
      break;
    }
    case "raise": {
      if (hand.currentBet === 0) {
        throw new PokerEngineError("INVALID_ACTION", "Use bet when no bet exists");
      }
      if (player.actedSinceLastFullRaise) {
        throw new PokerEngineError("ACTION_NOT_REOPENED", "A short all-in did not reopen raising");
      }
      const target = validateTargetAmount(action.amount);
      if (target <= hand.currentBet || target > maxTo) {
        throw new PokerEngineError("INVALID_BET", "Raise target is outside the legal range");
      }
      if (target < hand.currentBet + hand.minRaise && target !== maxTo) {
        throw new PokerEngineError("INVALID_BET", "Raise is below the minimum full raise");
      }
      committed = commitChips(next, player, target - player.roundBet);
      aggressiveTarget = target;
      break;
    }
    case "all-in": {
      if (seated.stack <= 0) {
        throw new PokerEngineError("INVALID_ACTION", "Player has no chips to move all-in");
      }
      const target = maxTo;
      if (target > hand.currentBet && hand.currentBet > 0 && player.actedSinceLastFullRaise) {
        throw new PokerEngineError("ACTION_NOT_REOPENED", "A short all-in did not reopen raising");
      }
      committed = commitChips(next, player, seated.stack);
      if (target > originalBet) aggressiveTarget = target;
      break;
    }
    default:
      throw new PokerEngineError("INVALID_ACTION", "Unknown poker action");
  }

  player.lastAction = action.type;
  player.actedSinceLastFullRaise = true;
  hand.pendingSeats = hand.pendingSeats.filter((seat) => seat !== player.seat);
  if (aggressiveTarget !== null) {
    applyAggressiveAction(next, player, aggressiveTarget, originalBet);
    player.actedSinceLastFullRaise = true;
  }
  normalizePending(next);
  next.version += 1;
  recordAction(next, action.actionId);
  const events: GameEvent[] = [
    {
      type: "player-acted",
      at: now,
      playerId: player.playerId,
      action: action.type,
      amount: committed,
    },
  ];

  if (hand.players.filter(isLive).length === 1) {
    settleByFold(next, now, events);
  } else if (hand.pendingSeats.length === 0) {
    advanceBettingRound(next, now, events);
  } else {
    setTurn(hand, nextPendingSeat(hand, player.seat), now, next.config.actionTimeoutMs);
  }
  return { state: next, events, duplicate: false };
}

export function applyTurnTimeout(
  state: GameState,
  command: VersionedCommand,
): GameTransition {
  validateActionId(command.commandId);
  if (hasProcessed(state, command.commandId)) {
    return { state, events: [], duplicate: true };
  }
  assertVersion(state, command.expectedVersion);
  const hand = state.hand;
  const now = command.now ?? Date.now();
  if (!hand || hand.currentSeat === null || hand.actionDeadlineAt === null) {
    throw new PokerEngineError("HAND_NOT_RUNNING", "There is no active turn");
  }
  if (now < hand.actionDeadlineAt) {
    throw new PokerEngineError("TIMEOUT_NOT_REACHED", "The action deadline has not passed");
  }
  const player = handPlayerBySeat(hand, hand.currentSeat);
  const toCall = Math.max(0, hand.currentBet - player.roundBet);
  return applyPlayerAction(state, {
    actionId: command.commandId,
    expectedVersion: command.expectedVersion,
    playerId: player.playerId,
    type: toCall === 0 ? "check" : "fold",
    now,
  });
}

function applySimplePlayerCommand(
  state: GameState,
  playerId: string,
  command: VersionedCommand,
  update: (player: TablePlayer) => void,
  eventType: "connection-changed" | "sit-out-changed",
): GameTransition {
  validateActionId(command.commandId);
  if (hasProcessed(state, command.commandId)) {
    return { state, events: [], duplicate: true };
  }
  assertVersion(state, command.expectedVersion);
  const next = cloneState(state);
  update(tablePlayer(next, playerId));
  next.version += 1;
  recordAction(next, command.commandId);
  return {
    state: next,
    events: [{ type: eventType, at: command.now ?? Date.now(), playerId }],
    duplicate: false,
  };
}

export function setPlayerConnection(
  state: GameState,
  playerId: string,
  connected: boolean,
  command: VersionedCommand,
): GameTransition {
  return applySimplePlayerCommand(
    state,
    playerId,
    command,
    (player) => {
      player.connected = connected;
    },
    "connection-changed",
  );
}

export function setPlayerSittingOut(
  state: GameState,
  playerId: string,
  sittingOut: boolean,
  command: VersionedCommand,
): GameTransition {
  return applySimplePlayerCommand(
    state,
    playerId,
    command,
    (player) => {
      player.sittingOut = sittingOut;
      if (sittingOut) player.ready = false;
    },
    "sit-out-changed",
  );
}

/** Adds a seated player. During a running hand they are present at the table but join next hand. */
export function addPlayer(
  state: GameState,
  input: TablePlayerInput,
  command: VersionedCommand,
): GameTransition {
  validateActionId(command.commandId);
  if (hasProcessed(state, command.commandId)) {
    return { state, events: [], duplicate: true };
  }
  assertVersion(state, command.expectedVersion);
  if (state.players.some((player) => player.id === input.id)) {
    throw new PokerEngineError("DUPLICATE_PLAYER", "Player is already seated");
  }
  if (state.players.some((player) => player.seat === input.seat)) {
    throw new PokerEngineError("SEAT_UNAVAILABLE", "Seat is already occupied");
  }
  if (state.players.length >= state.config.maxSeats) {
    throw new PokerEngineError("SEAT_UNAVAILABLE", "The table is full");
  }
  const next = cloneState(state);
  next.players.push(normalizePlayer(input, next.config));
  next.players.sort((left, right) => left.seat - right.seat);
  next.version += 1;
  recordAction(next, command.commandId);
  return { state: next, events: [], duplicate: false };
}

/**
 * Removes a player who is not in the current hand. Active-hand removal is deliberately
 * rejected so a host cannot invalidate an all-in or alter side-pot eligibility.
 */
export function removePlayer(
  state: GameState,
  playerId: string,
  command: VersionedCommand,
): GameTransition {
  validateActionId(command.commandId);
  if (hasProcessed(state, command.commandId)) {
    return { state, events: [], duplicate: true };
  }
  assertVersion(state, command.expectedVersion);
  tablePlayer(state, playerId);
  if (state.hand && state.hand.street !== "showdown" && state.hand.players.some((player) => player.playerId === playerId)) {
    throw new PokerEngineError(
      "HAND_IN_PROGRESS",
      "A player in the current hand can only be removed after it settles",
    );
  }
  const next = cloneState(state);
  next.players = next.players.filter((player) => player.id !== playerId);
  next.version += 1;
  recordAction(next, command.commandId);
  return { state: next, events: [], duplicate: false };
}

/** Adds play chips between hands; chips added here can never enter the current hand. */
export function topUpPlayer(
  state: GameState,
  playerId: string,
  amount: number,
  command: VersionedCommand,
): GameTransition {
  validateActionId(command.commandId);
  if (hasProcessed(state, command.commandId)) {
    return { state, events: [], duplicate: true };
  }
  assertVersion(state, command.expectedVersion);
  if (!isPositiveInteger(amount)) {
    throw new PokerEngineError("INVALID_BET", "Top-up amount must be a positive integer");
  }
  if (state.hand && state.hand.street !== "showdown" && state.hand.players.some((player) => player.playerId === playerId)) {
    throw new PokerEngineError(
      "HAND_IN_PROGRESS",
      "A player in the current hand can only top up after it settles",
    );
  }
  const next = cloneState(state);
  const player = tablePlayer(next, playerId);
  if (!Number.isSafeInteger(player.stack + amount)) {
    throw new PokerEngineError("INVALID_BET", "Top-up would exceed the safe chip range");
  }
  player.stack += amount;
  next.version += 1;
  recordAction(next, command.commandId);
  return { state: next, events: [], duplicate: false };
}

/** Replaces a stack between hands, for owner-authorized table resets. */
export function setPlayerStack(
  state: GameState,
  playerId: string,
  stack: number,
  command: VersionedCommand,
): GameTransition {
  validateActionId(command.commandId);
  if (hasProcessed(state, command.commandId)) {
    return { state, events: [], duplicate: true };
  }
  assertVersion(state, command.expectedVersion);
  if (!Number.isSafeInteger(stack) || stack < 0) {
    throw new PokerEngineError("INVALID_BET", "Stack must be a non-negative safe integer");
  }
  if (state.hand && state.hand.street !== "showdown" && state.hand.players.some((player) => player.playerId === playerId)) {
    throw new PokerEngineError(
      "HAND_IN_PROGRESS",
      "A player in the current hand can only reset chips after it settles",
    );
  }
  const next = cloneState(state);
  tablePlayer(next, playerId).stack = stack;
  next.version += 1;
  recordAction(next, command.commandId);
  return { state: next, events: [], duplicate: false };
}

export function setPlayerReady(
  state: GameState,
  playerId: string,
  ready: boolean,
  command: VersionedCommand,
): GameTransition {
  return applySimplePlayerCommand(
    state,
    playerId,
    command,
    (player) => {
      player.ready = ready;
      if (ready) player.sittingOut = false;
    },
    "sit-out-changed",
  );
}

/** Updates lobby rules before the first hand and normalizes every seated stack. */
export function updateGameConfig(
  state: GameState,
  configPatch: Partial<GameConfig>,
  command: VersionedCommand,
): GameTransition {
  validateActionId(command.commandId);
  if (hasProcessed(state, command.commandId)) {
    return { state, events: [], duplicate: true };
  }
  assertVersion(state, command.expectedVersion);
  if (state.handNumber !== 0 || (state.hand && state.hand.street !== "showdown")) {
    throw new PokerEngineError(
      "HAND_IN_PROGRESS",
      "Table rules can only change before the first hand",
    );
  }
  const config = { ...state.config, ...configPatch };
  validateConfig(config);
  if (state.players.some((player) => player.seat >= config.maxSeats)) {
    throw new PokerEngineError(
      "SEAT_UNAVAILABLE",
      "The new seat limit would exclude a seated player",
    );
  }
  const next = cloneState(state);
  next.config = config;
  next.players.forEach((player) => {
    player.stack = config.startingStack;
  });
  next.version += 1;
  recordAction(next, command.commandId);
  return { state: next, events: [], duplicate: false };
}

export function setTableStatus(
  state: GameState,
  status: TableStatus,
  command: VersionedCommand,
): GameTransition {
  validateActionId(command.commandId);
  if (hasProcessed(state, command.commandId)) {
    return { state, events: [], duplicate: true };
  }
  assertVersion(state, command.expectedVersion);
  const hasActiveHand = Boolean(state.hand && state.hand.street !== "showdown");
  if ((status === "waiting" || status === "closed") && hasActiveHand) {
    throw new PokerEngineError("HAND_IN_PROGRESS", "Cannot discard an active hand");
  }
  if (status === "playing" && !hasActiveHand) {
    throw new PokerEngineError("HAND_NOT_RUNNING", "There is no hand to resume");
  }
  const next = cloneState(state);
  next.status = status;
  if (status === "playing" && next.hand && next.hand.currentSeat !== null) {
    const now = command.now ?? Date.now();
    next.hand.actionStartedAt = now;
    next.hand.actionDeadlineAt = now + next.config.actionTimeoutMs;
  }
  next.version += 1;
  recordAction(next, command.commandId);
  return { state: next, events: [], duplicate: false };
}
