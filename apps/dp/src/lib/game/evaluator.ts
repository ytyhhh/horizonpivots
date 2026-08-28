import type { Card, EvaluatedHand, HandCategory } from "./types";
import { PokerEngineError } from "./types";

const RANK_VALUES: Record<Card["rank"], number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const CATEGORY_LABELS: Record<HandCategory, string> = {
  "high-card": "High card",
  "one-pair": "One pair",
  "two-pair": "Two pair",
  "three-of-a-kind": "Three of a kind",
  straight: "Straight",
  flush: "Flush",
  "full-house": "Full house",
  "four-of-a-kind": "Four of a kind",
  "straight-flush": "Straight flush",
};

function straightHigh(values: readonly number[]): number | null {
  const unique = [...new Set(values)].sort((left, right) => right - left);
  if (unique.includes(14)) unique.push(1);
  for (let index = 0; index <= unique.length - 5; index += 1) {
    const window = unique.slice(index, index + 5);
    if (window.every((value, offset) => value === window[0] - offset)) {
      return window[0] === 1 ? 5 : window[0];
    }
  }
  return null;
}

function makeEvaluation(
  category: HandCategory,
  categoryRank: number,
  ranks: number[],
  cards: Card[],
): EvaluatedHand {
  return {
    category,
    categoryRank,
    ranks,
    cards: cards.map((card) => ({ ...card })),
    label: CATEGORY_LABELS[category],
  };
}

export function evaluateFive(cards: readonly Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new PokerEngineError("INVALID_STATE", "Exactly five cards are required");
  }

  const values = cards.map((card) => RANK_VALUES[card.rank]);
  const descending = [...values].sort((left, right) => right - left);
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const groups = [...counts.entries()].sort(
    ([leftRank, leftCount], [rightRank, rightCount]) =>
      rightCount - leftCount || rightRank - leftRank,
  );
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const highStraight = straightHigh(values);

  if (flush && highStraight !== null) {
    return makeEvaluation("straight-flush", 8, [highStraight], [...cards]);
  }
  if (groups[0][1] === 4) {
    return makeEvaluation(
      "four-of-a-kind",
      7,
      [groups[0][0], groups[1][0]],
      [...cards],
    );
  }
  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return makeEvaluation(
      "full-house",
      6,
      [groups[0][0], groups[1][0]],
      [...cards],
    );
  }
  if (flush) {
    return makeEvaluation("flush", 5, descending, [...cards]);
  }
  if (highStraight !== null) {
    return makeEvaluation("straight", 4, [highStraight], [...cards]);
  }
  if (groups[0][1] === 3) {
    return makeEvaluation(
      "three-of-a-kind",
      3,
      [groups[0][0], ...groups.slice(1).map(([rank]) => rank).sort((a, b) => b - a)],
      [...cards],
    );
  }
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const pairs = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
    const kicker = groups.find(([, count]) => count === 1)?.[0] ?? 0;
    return makeEvaluation("two-pair", 2, [...pairs, kicker], [...cards]);
  }
  if (groups[0][1] === 2) {
    return makeEvaluation(
      "one-pair",
      1,
      [groups[0][0], ...groups.slice(1).map(([rank]) => rank).sort((a, b) => b - a)],
      [...cards],
    );
  }
  return makeEvaluation("high-card", 0, descending, [...cards]);
}

function combinationsOfFive(cards: readonly Card[]): Card[][] {
  const combinations: Card[][] = [];
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            combinations.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
          }
        }
      }
    }
  }
  return combinations;
}

export function compareHands(left: EvaluatedHand, right: EvaluatedHand): number {
  if (left.categoryRank !== right.categoryRank) {
    return Math.sign(left.categoryRank - right.categoryRank);
  }
  const count = Math.max(left.ranks.length, right.ranks.length);
  for (let index = 0; index < count; index += 1) {
    const difference = (left.ranks[index] ?? 0) - (right.ranks[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function evaluateBestHand(cards: readonly Card[]): EvaluatedHand {
  if (cards.length < 5 || cards.length > 7) {
    throw new PokerEngineError(
      "INVALID_STATE",
      "A best-hand evaluation needs five to seven cards",
    );
  }
  const hands = combinationsOfFive(cards).map(evaluateFive);
  return hands.reduce((best, candidate) =>
    compareHands(candidate, best) > 0 ? candidate : best,
  );
}
