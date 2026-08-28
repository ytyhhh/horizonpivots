import {
  POKER_RANKS,
  POKER_SUITS,
  PokerEngineError,
  type Card,
  type CardRank,
  type CardSuit,
} from "./types";

export type RandomIndex = (maxExclusive: number) => number;

const SUIT_SYMBOLS: Record<CardSuit, string> = {
  clubs: "c",
  diamonds: "d",
  hearts: "h",
  spades: "s",
};

const SYMBOL_SUITS: Record<string, CardSuit> = {
  c: "clubs",
  d: "diamonds",
  h: "hearts",
  s: "spades",
};

export function createDeck(): Card[] {
  return POKER_SUITS.flatMap((suit) =>
    POKER_RANKS.map((rank) => ({ rank, suit })),
  );
}

/** Uniform random integer backed by Web Crypto rejection sampling. */
export function secureRandomIndex(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError("maxExclusive must be a positive safe integer");
  }
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("A cryptographically secure random source is required");
  }

  const range = 0x1_0000_0000;
  const limit = range - (range % maxExclusive);
  const buffer = new Uint32Array(1);
  let value = limit;
  while (value >= limit) {
    globalThis.crypto.getRandomValues(buffer);
    value = buffer[0];
  }
  return value % maxExclusive;
}

export function shuffleDeck(
  deck: readonly Card[] = createDeck(),
  randomIndex: RandomIndex = secureRandomIndex,
): Card[] {
  const shuffled = deck.map((card) => ({ ...card }));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) {
      throw new RangeError("randomIndex returned an out-of-range value");
    }
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export function createShuffledDeck(randomIndex?: RandomIndex): Card[] {
  return shuffleDeck(createDeck(), randomIndex);
}

export function cardKey(card: Card): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

export function parseCard(value: string): Card {
  const normalized = value.trim();
  const rawRank = normalized.slice(0, -1).toUpperCase();
  const rank = (rawRank === "T" ? "10" : rawRank) as CardRank;
  const suit = SYMBOL_SUITS[normalized.slice(-1).toLowerCase()];
  if (!POKER_RANKS.includes(rank) || !suit) {
    throw new PokerEngineError("DECK_INVALID", `Invalid card: ${value}`);
  }
  return { rank, suit };
}

export function validateDeck(deck: readonly Card[], minimumCards = 52): void {
  if (deck.length < minimumCards) {
    throw new PokerEngineError(
      "DECK_INVALID",
      `Deck needs at least ${minimumCards} cards`,
    );
  }
  const keys = new Set<string>();
  for (const card of deck) {
    if (!POKER_RANKS.includes(card.rank) || !POKER_SUITS.includes(card.suit)) {
      throw new PokerEngineError("DECK_INVALID", "Deck contains an invalid card");
    }
    const key = cardKey(card);
    if (keys.has(key)) {
      throw new PokerEngineError("DECK_INVALID", `Duplicate card: ${key}`);
    }
    keys.add(key);
  }
}
