import { describe, expect, it } from "vitest";
import { buildBetPresets, recommendedBetAmount, resolveQueuedAction } from "./smart-actions";

describe("smart bet presets", () => {
  it("builds blind-rounded fractions for an unopened pot", () => {
    const presets = buildBetPresets({
      kind: "bet",
      pot: 900,
      currentBet: 0,
      viewerBet: 0,
      bigBlind: 50,
      min: 100,
      max: 2_000,
    });

    expect(presets.map((preset) => preset.amount)).toEqual([300, 450, 600, 900]);
    expect(recommendedBetAmount(presets, 100)).toBe(600);
  });

  it("uses a post-call pot when calculating raise targets", () => {
    const presets = buildBetPresets({
      kind: "raise",
      pot: 900,
      currentBet: 300,
      viewerBet: 100,
      bigBlind: 50,
      min: 500,
      max: 2_000,
    });

    expect(presets.map((preset) => preset.amount)).toEqual([650, 850, 1_050, 1_400]);
  });

  it("clamps to the legal range and removes duplicate amounts", () => {
    const presets = buildBetPresets({
      kind: "bet",
      pot: 120,
      currentBet: 0,
      viewerBet: 0,
      bigBlind: 100,
      min: 100,
      max: 150,
    });

    expect(presets.map((preset) => preset.amount)).toEqual([100]);
    expect(presets.every((preset) => preset.amount >= 100 && preset.amount <= 150)).toBe(true);
  });
});

describe("queued action resolution", () => {
  it("checks when a check-fold pre-action can check", () => {
    expect(resolveQueuedAction(
      { handNumber: 4, kind: "check_fold" },
      [{ type: "fold" }, { type: "check" }],
    )).toEqual({ status: "act", type: "check" });
  });

  it("folds when a check-fold pre-action faces a bet", () => {
    expect(resolveQueuedAction(
      { handNumber: 4, kind: "check_fold" },
      [{ type: "fold" }, { type: "call", amount: 300 }],
    )).toEqual({ status: "act", type: "fold" });
  });

  it("cancels a capped call when the price grows above the cap", () => {
    expect(resolveQueuedAction(
      { handNumber: 4, kind: "call_cap", cap: 200 },
      [{ type: "fold" }, { type: "call", amount: 300 }],
    )).toEqual({ status: "cancel" });
  });

  it("checks for free when a capped call no longer faces a bet", () => {
    expect(resolveQueuedAction(
      { handNumber: 4, kind: "call_cap", cap: 200 },
      [{ type: "fold" }, { type: "check" }, { type: "bet", min: 100, max: 900 }],
    )).toEqual({ status: "act", type: "check" });
  });
});
