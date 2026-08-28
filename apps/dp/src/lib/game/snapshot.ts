import { getLegalActions, getPotTotal } from "./engine";
import type {
  Card,
  GameState,
  HandSettlement,
  PublicGameSnapshot,
} from "./types";

function cloneCards(cards: readonly Card[]): Card[] {
  return cards.map((card) => ({ ...card }));
}

function cloneSettlement(settlement: HandSettlement | null): HandSettlement | null {
  if (!settlement) return null;
  return {
    ...settlement,
    pots: settlement.pots.map((pot) => ({
      ...pot,
      eligiblePlayerIds: [...pot.eligiblePlayerIds],
    })),
    awards: settlement.awards.map((award) => ({
      ...award,
      hand: award.hand
        ? {
            ...award.hand,
            ranks: [...award.hand.ranks],
            cards: cloneCards(award.hand.cards),
          }
        : null,
    })),
  };
}

/**
 * Produces the only state shape suitable for clients. It never includes the deck,
 * burned cards, action ids, or another player's private cards during play.
 */
export function createPublicSnapshot(
  state: GameState,
  viewerPlayerId?: string | null,
): PublicGameSnapshot {
  const hand = state.hand;
  return {
    tableId: state.tableId,
    version: state.version,
    status: state.status,
    config: { ...state.config },
    handNumber: state.handNumber,
    dealerSeat: state.dealerSeat,
    players: state.players.map((player) => {
      const handPlayer = hand?.players.find((candidate) => candidate.playerId === player.id);
      const cardsArePublic = Boolean(
        hand &&
          hand.street === "showdown" &&
          hand.settlement?.reason === "showdown" &&
          handPlayer &&
          handPlayer.status !== "folded",
      );
      const canSeeCards = handPlayer && (player.id === viewerPlayerId || cardsArePublic);
      return {
        id: player.id,
        name: player.name,
        seat: player.seat,
        stack: player.stack,
        connected: player.connected,
        ready: player.ready,
        sittingOut: player.sittingOut,
        handStatus: handPlayer?.status ?? null,
        roundBet: handPlayer?.roundBet ?? 0,
        totalBet: handPlayer?.totalBet ?? 0,
        lastAction: handPlayer?.lastAction ?? null,
        holeCards: canSeeCards ? cloneCards(handPlayer.holeCards) : null,
      };
    }),
    hand: hand
      ? {
          id: hand.id,
          street: hand.street,
          board: cloneCards(hand.board),
          pot: getPotTotal(state),
          smallBlindSeat: hand.smallBlindSeat,
          bigBlindSeat: hand.bigBlindSeat,
          currentSeat: hand.currentSeat,
          currentBet: hand.currentBet,
          minRaise: hand.minRaise,
          actionDeadlineAt: hand.actionDeadlineAt,
          settlement: cloneSettlement(hand.settlement),
        }
      : null,
    legalActions: viewerPlayerId ? getLegalActions(state, viewerPlayerId) : null,
  };
}
