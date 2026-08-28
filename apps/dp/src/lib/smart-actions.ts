import type { AvailableAction } from "@/types/game";

export const betFractions = [
  { id: "third", label: "1/3 池", fraction: 1 / 3, shortcut: "1", recommended: false },
  { id: "half", label: "1/2 池", fraction: 1 / 2, shortcut: "2", recommended: false },
  { id: "two-thirds", label: "2/3 池", fraction: 2 / 3, shortcut: "3", recommended: true },
  { id: "pot", label: "满池", fraction: 1, shortcut: "4", recommended: false },
] as const;

export interface BetPreset {
  id: string;
  label: string;
  amount: number;
  shortcut: string;
  recommended: boolean;
}

export interface BetPresetInput {
  kind: "bet" | "raise";
  pot: number;
  currentBet: number;
  viewerBet: number;
  bigBlind: number;
  min: number;
  max: number;
}

export type QueuedAction =
  | { handNumber: number; kind: "check" }
  | { handNumber: number; kind: "check_fold" }
  | { handNumber: number; kind: "call_cap"; cap: number };

export type QueuedActionResolution =
  | { status: "act"; type: "check" | "fold" | "call" }
  | { status: "cancel" };

export function buildBetPresets(input: BetPresetInput): BetPreset[] {
  if (!isValidRange(input.min, input.max)) return [];

  const step = positiveInteger(input.bigBlind, 1);
  const pot = nonNegativeInteger(input.pot);
  const currentBet = nonNegativeInteger(input.currentBet);
  const viewerBet = nonNegativeInteger(input.viewerBet);
  const toCall = Math.max(0, currentBet - viewerBet);
  const potAfterCall = pot + toCall;
  const presets = new Map<number, BetPreset>();

  for (const option of betFractions) {
    const rawTarget = input.kind === "bet"
      ? option.fraction * pot
      : viewerBet + toCall + option.fraction * potAfterCall;
    const amount = clamp(roundToStep(rawTarget, step), input.min, input.max);
    const next: BetPreset = {
      id: option.id,
      label: option.label,
      amount,
      shortcut: option.shortcut,
      recommended: option.recommended,
    };
    const existing = presets.get(amount);
    if (!existing || next.recommended) presets.set(amount, next);
  }

  return [...presets.values()].sort((left, right) => left.amount - right.amount);
}

export function recommendedBetAmount(presets: BetPreset[], fallback: number) {
  return presets.find((preset) => preset.recommended)?.amount ?? presets.at(-1)?.amount ?? fallback;
}

export function resolveQueuedAction(
  queued: QueuedAction,
  availableActions: AvailableAction[],
): QueuedActionResolution {
  const has = (type: AvailableAction["type"]) => availableActions.some((action) => action.type === type);

  if (queued.kind === "check") {
    return has("check") ? { status: "act", type: "check" } : { status: "cancel" };
  }
  if (queued.kind === "check_fold") {
    if (has("check")) return { status: "act", type: "check" };
    return has("fold") ? { status: "act", type: "fold" } : { status: "cancel" };
  }

  if (has("check")) return { status: "act", type: "check" };
  const call = availableActions.find((action) => action.type === "call");
  return call && (call.amount ?? Number.MAX_SAFE_INTEGER) <= queued.cap
    ? { status: "act", type: "call" }
    : { status: "cancel" };
}

export function queuedActionLabel(queued: QueuedAction) {
  if (queued.kind === "check") return "自动过牌";
  if (queued.kind === "check_fold") return "过牌，否则弃牌";
  return `跟注不超过 ${new Intl.NumberFormat("zh-CN").format(queued.cap)}`;
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isValidRange(min: number, max: number) {
  return Number.isSafeInteger(min) && Number.isSafeInteger(max) && min > 0 && max >= min;
}

function nonNegativeInteger(value: number) {
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function positiveInteger(value: number, fallback: number) {
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
