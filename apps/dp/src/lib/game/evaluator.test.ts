import { describe, expect, it } from "vitest";
import { parseCard } from "./deck";
import { compareHands, evaluateBestHand, evaluateFive } from "./evaluator";

function cards(values: string) {
  return values.split(/\s+/).map(parseCard);
}

describe("Texas Hold'em hand evaluator", () => {
  it.each([
    ["As Kd 9c 7h 3s", "high-card"],
    ["As Ad 9c 7h 3s", "one-pair"],
    ["As Ad 9c 9h 3s", "two-pair"],
    ["As Ad Ac 7h 3s", "three-of-a-kind"],
    ["As 2d 3c 4h 5s", "straight"],
    ["As Js 9s 7s 3s", "flush"],
    ["As Ad Ac 7h 7s", "full-house"],
    ["As Ad Ac Ah 3s", "four-of-a-kind"],
    ["9s Ts Js Qs Ks", "straight-flush"],
  ] as const)("recognizes %s as %s", (input, category) => {
    expect(evaluateFive(cards(input)).category).toBe(category);
  });

  it("treats ace as low only in a wheel", () => {
    const wheel = evaluateFive(cards("As 2d 3c 4h 5s"));
    const sixHigh = evaluateFive(cards("2s 3d 4c 5h 6s"));
    expect(wheel.ranks).toEqual([5]);
    expect(compareHands(sixHigh, wheel)).toBe(1);
  });

  it("uses the best five of seven and applies kickers", () => {
    const aceKicker = evaluateBestHand(cards("Ks Kd As 9c 7h 4s 2d"));
    const queenKicker = evaluateBestHand(cards("Kh Kc Qs 9d 7c 4h 2s"));
    expect(aceKicker.category).toBe("one-pair");
    expect(compareHands(aceKicker, queenKicker)).toBe(1);
  });

  it("ties when the board is the best hand for both players", () => {
    const first = evaluateBestHand(cards("2c 3d As Ks Qc Jh Td"));
    const second = evaluateBestHand(cards("9c 9d As Ks Qc Jh Td"));
    expect(compareHands(first, second)).toBe(0);
  });
});
