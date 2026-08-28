export type CardSuit = "clubs" | "diamonds" | "hearts" | "spades";
export type CardRank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface PlayingCardData {
  rank: CardRank;
  suit: CardSuit;
}

export type RoomStatus = "waiting" | "playing" | "paused" | "finished";
export type HandPhase = "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown";
export type ParticipantStatus = "waiting" | "ready" | "active" | "folded" | "all_in" | "away" | "out" | "spectating";
export type ViewerRole = "owner" | "player" | "spectator";
export type ActionKind = "fold" | "check" | "call" | "bet" | "raise" | "all_in" | "ready" | "sit_out" | "resume_seat" | "timeout";

export interface RoomSummary {
  id: string;
  code?: string;
  status: RoomStatus;
  version: number;
  maxSeats: number;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  actionSeconds: number;
  locked: boolean;
  spectatorsAllowed: boolean;
  expiresAt?: string | null;
  realtimeTopic?: string | null;
}

export interface ParticipantState {
  id: string;
  nickname: string;
  seat: number | null;
  stack: number;
  bet: number;
  status: ParticipantStatus;
  isDealer?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  isCurrent?: boolean;
  isOwner?: boolean;
  cardsVisible?: boolean;
  cards?: PlayingCardData[];
  joinedAt?: string;
}

export interface ViewerState {
  participantId?: string | null;
  nickname?: string | null;
  role: ViewerRole;
  isOwner: boolean;
  seat?: number | null;
}

export interface AvailableAction {
  type: ActionKind;
  label?: string;
  amount?: number;
  min?: number;
  max?: number;
}

export interface WinningHandState {
  participantId: string;
  nickname: string;
  amount: number;
  label: string;
  cards: PlayingCardData[];
}

export interface HandState {
  handNumber: number;
  phase: HandPhase;
  board: PlayingCardData[];
  holeCards: PlayingCardData[];
  pot: number;
  sidePots?: number[];
  currentBet: number;
  minRaise: number;
  actingParticipantId?: string | null;
  deadlineAt?: string | null;
  result?: {
    title: string;
    detail?: string;
    winners?: string[];
    reason?: "fold" | "showdown";
    winningHands?: WinningHandState[];
  } | null;
}

export interface ChatMessage {
  id: string;
  participantId?: string | null;
  nickname: string;
  body: string;
  kind: "text" | "reaction" | "system";
  createdAt: string;
}

export interface HandHistoryItem {
  id: string;
  handNumber: number;
  summary: string;
  createdAt: string;
}

export interface RoomState {
  room: RoomSummary;
  viewer: ViewerState;
  participants: ParticipantState[];
  hand: HandState | null;
  messages: ChatMessage[];
  history: HandHistoryItem[];
  availableActions: AvailableAction[];
}

export interface CreateRoomPayload {
  maxSeats: number;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  actionSeconds: number;
}

export interface CreateRoomResponse {
  room: RoomSummary;
  roomId?: string;
  shareText?: string;
}

export interface JoinRoomResponse {
  roomId?: string;
  id?: string;
  publicId?: string;
}
