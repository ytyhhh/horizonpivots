import type { PlayingCardData } from "@/types/game";

const suits = {
  clubs: { symbol: "♣", name: "梅花", tone: "black" },
  diamonds: { symbol: "♦", name: "方片", tone: "red" },
  hearts: { symbol: "♥", name: "红桃", tone: "red" },
  spades: { symbol: "♠", name: "黑桃", tone: "black" },
} as const;

export function PlayingCard({ card, faceDown = false, compact = false }: { card?: PlayingCardData; faceDown?: boolean; compact?: boolean }) {
  if (faceDown || !card) {
    return <span className={`playing-card playing-card--back${compact ? " playing-card--compact" : ""}`} aria-label="未公开的底牌"><span aria-hidden="true">HP</span></span>;
  }

  const suit = suits[card.suit];
  return (
    <span className={`playing-card playing-card--${suit.tone}${compact ? " playing-card--compact" : ""}`} aria-label={`${suit.name}${card.rank}`}>
      <span className="playing-card__rank">{card.rank}</span>
      <span className="playing-card__suit" aria-hidden="true">{suit.symbol}</span>
    </span>
  );
}
