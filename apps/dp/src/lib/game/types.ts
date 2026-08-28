export const POKER_RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
] as const;

export const POKER_SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;

export type CardRank = (typeof POKER_RANKS)[number];
export type CardSuit = (typeof POKER_SUITS)[number];

export interface Card {
  rank: CardRank;
  suit: CardSuit;
}

export type HandCategory =
  | "high-card"
  | "one-pair"
  | "two-pair"
  | "three-of-a-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush";

export interface EvaluatedHand {
  category: HandCategory;
  /** Higher values win. Categories range from 0 (high card) to 8 (straight flush). */
  categoryRank: number;
  /** Lexicographic tie breakers, ordered from most to least significant. */
  ranks: number[];
  cards: Card[];
  label: string;
}

export interface GameConfig {
  maxSeats: number;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  actionTimeoutMs: number;
}

export interface TablePlayer {
  id: string;
  name: string;
  seat: number;
  stack: number;
  connected: boolean;
  ready: boolean;
  /** Applies to the next hand. A player already in a hand remains until folding or showdown. */
  sittingOut: boolean;
}

export type TableStatus = "waiting" | "playing" | "paused" | "closed";
export type BettingStreet = "preflop" | "flop" | "turn" | "river" | "showdown";
export type HandPlayerStatus = "active" | "folded" | "all-in";
export type PlayerActionType =
  | "fold"
  | "check"
  | "call"
  | "bet"
  | "raise"
  | "all-in";

export interface HandPlayerState {
  playerId: string;
  seat: number;
  holeCards: Card[];
  status: HandPlayerStatus;
  roundBet: number;
  totalBet: number;
  /** A short all-in raise does not reset this flag for players who already acted. */
  actedSinceLastFullRaise: boolean;
  lastAction: PlayerActionType | null;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface PotAward {
  potIndex: number;
  playerId: string;
  amount: number;
  hand: EvaluatedHand | null;
}

export interface HandSettlement {
  reason: "fold" | "showdown";
  pots: SidePot[];
  awards: PotAward[];
  completedAt: number;
}

export interface HandState {
  id: string;
  street: BettingStreet;
  board: Card[];
  deck: Card[];
  burned: Card[];
  players: HandPlayerState[];
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentSeat: number | null;
  /** Seats that still owe an action in the current betting round. */
  pendingSeats: number[];
  currentBet: number;
  /** The minimum size of the next full raise. */
  minRaise: number;
  lastAggressorSeat: number | null;
  actionStartedAt: number | null;
  actionDeadlineAt: number | null;
  startedAt: number;
  settlement: HandSettlement | null;
}

export interface GameState {
  tableId: string;
  version: number;
  status: TableStatus;
  config: GameConfig;
  handNumber: number;
  dealerSeat: number | null;
  players: TablePlayer[];
  hand: HandState | null;
  /** A bounded retry cache. Persistence must additionally enforce a unique action id. */
  processedActionIds: string[];
}

export interface PlayerAction {
  actionId: string;
  expectedVersion: number;
  playerId: string;
  type: PlayerActionType;
  /** For bet/raise, this is the player's target total contribution for this street. */
  amount?: number;
  now?: number;
}

export interface StartHandOptions {
  commandId: string;
  expectedVersion: number;
  now?: number;
  handId?: string;
  /** The first element is the top of the deck. Primarily intended for deterministic tests. */
  deck?: Card[];
}

export interface GameEvent {
  type:
    | "hand-started"
    | "blind-posted"
    | "player-acted"
    | "street-dealt"
    | "hand-settled"
    | "connection-changed"
    | "sit-out-changed";
  at: number;
  playerId?: string;
  action?: PlayerActionType;
  amount?: number;
  street?: BettingStreet;
}

export interface GameTransition {
  state: GameState;
  events: GameEvent[];
  duplicate: boolean;
}

export interface LegalActions {
  isTurn: boolean;
  toCall: number;
  minBetTo: number | null;
  minRaiseTo: number | null;
  maxTo: number;
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  canBet: boolean;
  canRaise: boolean;
  canAllIn: boolean;
}

export interface PublicPlayerSnapshot {
  id: string;
  name: string;
  seat: number;
  stack: number;
  connected: boolean;
  ready: boolean;
  sittingOut: boolean;
  handStatus: HandPlayerStatus | null;
  roundBet: number;
  totalBet: number;
  lastAction: PlayerActionType | null;
  /** Only the viewer's cards, or non-folded cards after showdown, are populated. */
  holeCards: Card[] | null;
}

export interface PublicHandSnapshot {
  id: string;
  street: BettingStreet;
  board: Card[];
  pot: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentSeat: number | null;
  currentBet: number;
  minRaise: number;
  actionDeadlineAt: number | null;
  settlement: HandSettlement | null;
}

export interface PublicGameSnapshot {
  tableId: string;
  version: number;
  status: TableStatus;
  config: GameConfig;
  handNumber: number;
  dealerSeat: number | null;
  players: PublicPlayerSnapshot[];
  hand: PublicHandSnapshot | null;
  legalActions: LegalActions | null;
}

export type GameErrorCode =
  | "INVALID_CONFIG"
  | "INVALID_STATE"
  | "VERSION_CONFLICT"
  | "DUPLICATE_PLAYER"
  | "SEAT_UNAVAILABLE"
  | "PLAYER_NOT_FOUND"
  | "HAND_IN_PROGRESS"
  | "HAND_NOT_RUNNING"
  | "NOT_ENOUGH_PLAYERS"
  | "NOT_YOUR_TURN"
  | "INVALID_ACTION"
  | "INVALID_BET"
  | "ACTION_NOT_REOPENED"
  | "TIMEOUT_NOT_REACHED"
  | "DECK_INVALID";

export class PokerEngineError extends Error {
  constructor(
    public readonly code: GameErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PokerEngineError";
  }
}
