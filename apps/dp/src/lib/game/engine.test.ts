import { describe, expect, it } from "vitest";
import {
  PokerEngineError,
  addPlayer,
  applyPlayerAction,
  applyTurnTimeout,
  buildSidePots,
  cardKey,
  createDeck,
  createGameState,
  createPublicSnapshot,
  parseCard,
  setPlayerConnection,
  setPlayerStack,
  setTableStatus,
  startHand,
  topUpPlayer,
  type Card,
  type GameState,
  type HandPlayerState,
  type PlayerActionType,
  updateGameConfig,
} from "./index";

function riggedDeck(...topCards: string[]): Card[] {
  const top = topCards.map(parseCard);
  const used = new Set(top.map(cardKey));
  const rest = createDeck().filter((card) => !used.has(cardKey(card)));
  return [...top, ...rest];
}

function table(stacks = [1_000, 1_000, 1_000]): GameState {
  return createGameState({
    tableId: "table-1",
    config: { smallBlind: 50, bigBlind: 100, startingStack: 1_000 },
    players: stacks.map((stack, seat) => ({
      id: `p${seat}`,
      name: `Player ${seat}`,
      seat,
      stack,
    })),
  });
}

function start(state: GameState, deck = riggedDeck()): GameState {
  return startHand(state, {
    commandId: `start-${state.handNumber + 1}`,
    expectedVersion: state.version,
    now: 1_000,
    deck,
  }).state;
}

function act(
  state: GameState,
  playerId: string,
  type: PlayerActionType,
  amount?: number,
): GameState {
  return applyPlayerAction(state, {
    actionId: `action-${state.version}-${playerId}-${type}`,
    expectedVersion: state.version,
    playerId,
    type,
    amount,
    now: 2_000 + state.version,
  }).state;
}

describe("table and hand lifecycle", () => {
  it("updates first-hand rules and normalizes existing stacks", () => {
    let state = table([400, 700, 900]);
    state = updateGameConfig(
      state,
      { maxSeats: 4, startingStack: 20_000, smallBlind: 100, bigBlind: 200 },
      { commandId: "new-rules", expectedVersion: state.version },
    ).state;
    expect(state.config).toMatchObject({
      maxSeats: 4,
      startingStack: 20_000,
      smallBlind: 100,
      bigBlind: 200,
    });
    expect(state.players.map((player) => player.stack)).toEqual([20_000, 20_000, 20_000]);
  });

  it("rejects a seat limit that would exclude an occupied seat", () => {
    const state = createGameState({
      tableId: "wide-table",
      config: { maxSeats: 9 },
      players: [
        { id: "p0", name: "One", seat: 0 },
        { id: "p8", name: "Nine", seat: 8 },
      ],
    });
    expect(() =>
      updateGameConfig(
        state,
        { maxSeats: 6 },
        { commandId: "shrink", expectedVersion: state.version },
      ),
    ).toThrowError(expect.objectContaining({ code: "SEAT_UNAVAILABLE" }));
  });

  it("posts blinds, deals privately, and advances all four streets", () => {
    let state = start(table());
    expect(state.dealerSeat).toBe(0);
    expect(state.hand?.smallBlindSeat).toBe(1);
    expect(state.hand?.bigBlindSeat).toBe(2);
    expect(state.hand?.currentSeat).toBe(0);
    expect(state.hand?.players.map((player) => player.holeCards)).toEqual([
      [parseCard("4c"), parseCard("7c")],
      [parseCard("2c"), parseCard("5c")],
      [parseCard("3c"), parseCard("6c")],
    ]);

    state = act(state, "p0", "call");
    state = act(state, "p1", "call");
    state = act(state, "p2", "check");
    expect(state.hand?.street).toBe("flop");
    expect(state.hand?.board).toHaveLength(3);
    expect(state.hand?.currentSeat).toBe(1);

    for (const street of ["turn", "river", "showdown"] as const) {
      state = act(state, "p1", "check");
      state = act(state, "p2", "check");
      state = act(state, "p0", "check");
      expect(state.hand?.street).toBe(street);
    }
    expect(state.status).toBe("waiting");
    expect(state.hand?.settlement?.reason).toBe("showdown");
  });

  it("rotates the dealer after a completed hand", () => {
    let state = start(table([1_000, 1_000]));
    expect(state.dealerSeat).toBe(0);
    state = act(state, "p0", "fold");
    state = start(state);
    expect(state.dealerSeat).toBe(1);
    expect(state.hand?.smallBlindSeat).toBe(1);
    expect(state.hand?.bigBlindSeat).toBe(0);
  });

  it("lets a mid-hand arrival join only the next hand", () => {
    let state = start(table([1_000, 1_000]));
    state = addPlayer(
      state,
      { id: "late", name: "Late", seat: 2 },
      { commandId: "join-late", expectedVersion: state.version, now: 1_500 },
    ).state;
    expect(state.hand?.players.map((player) => player.playerId)).not.toContain("late");
    state = act(state, "p0", "fold");
    state = start(state);
    expect(state.hand?.players.map((player) => player.playerId)).toContain("late");
  });

  it("rejects topping up a player in the current hand", () => {
    const state = start(table([1_000, 1_000]));
    expect(() =>
      topUpPlayer(state, "p0", 500, {
        commandId: "top-up",
        expectedVersion: state.version,
      }),
    ).toThrowError(PokerEngineError);
  });

  it("lets the owner reset a settled stack to an exact amount", () => {
    let state = start(table([1_000, 1_000]));
    state = act(state, "p0", "fold");
    state = setPlayerStack(state, "p0", 10_000, {
      commandId: "reset-stack",
      expectedVersion: state.version,
    }).state;
    expect(state.players.find((player) => player.id === "p0")?.stack).toBe(10_000);
  });
});

describe("betting rules", () => {
  it("enforces the minimum full raise", () => {
    let state = start(table());
    state = act(state, "p0", "raise", 300);
    expect(state.hand?.minRaise).toBe(200);
    expect(() => act(state, "p1", "raise", 450)).toThrowError(
      expect.objectContaining({ code: "INVALID_BET" }),
    );
  });

  it("does not reopen raising after a short all-in", () => {
    let state = start(table([1_000, 150, 1_000]));
    state = act(state, "p0", "call");
    state = act(state, "p1", "all-in");
    expect(state.hand?.currentBet).toBe(150);
    expect(state.hand?.minRaise).toBe(100);
    state = act(state, "p2", "call");
    expect(state.hand?.currentSeat).toBe(0);
    expect(() => act(state, "p0", "raise", 300)).toThrowError(
      expect.objectContaining({ code: "ACTION_NOT_REOPENED" }),
    );
    state = act(state, "p0", "call");
    expect(state.hand?.street).toBe("flop");
  });

  it("keeps the nominal big-blind bring-in when the big blind is short", () => {
    let state = start(table([1_000, 1_000, 40]));
    expect(state.hand?.currentBet).toBe(100);
    expect(state.hand?.players.find((player) => player.playerId === "p2")?.totalBet).toBe(40);
    expect(state.hand?.currentSeat).toBe(0);
    state = act(state, "p0", "call");
    expect(state.hand?.players.find((player) => player.playerId === "p0")?.roundBet).toBe(100);
  });

  it("returns duplicate actions without applying chips twice", () => {
    const state = start(table());
    const action = {
      actionId: "retry-call",
      expectedVersion: state.version,
      playerId: "p0",
      type: "call" as const,
      now: 2_000,
    };
    const first = applyPlayerAction(state, action);
    const retry = applyPlayerAction(first.state, action);
    expect(retry.duplicate).toBe(true);
    expect(retry.state).toBe(first.state);
    expect(retry.state.players.find((player) => player.id === "p0")?.stack).toBe(900);
  });

  it("rejects a stale non-duplicate action", () => {
    const state = start(table());
    expect(() =>
      applyPlayerAction(state, {
        actionId: "stale",
        expectedVersion: 0,
        playerId: "p0",
        type: "call",
      }),
    ).toThrowError(expect.objectContaining({ code: "VERSION_CONFLICT" }));
  });
});

describe("side pots and showdown", () => {
  it("builds pots with folded chips included but folded players ineligible", () => {
    const players: HandPlayerState[] = [
      { playerId: "a", seat: 0, holeCards: [], status: "all-in", roundBet: 100, totalBet: 100, actedSinceLastFullRaise: true, lastAction: "all-in" },
      { playerId: "b", seat: 1, holeCards: [], status: "folded", roundBet: 300, totalBet: 300, actedSinceLastFullRaise: true, lastAction: "fold" },
      { playerId: "c", seat: 2, holeCards: [], status: "active", roundBet: 300, totalBet: 300, actedSinceLastFullRaise: true, lastAction: "call" },
    ];
    expect(buildSidePots(players)).toEqual([
      { amount: 300, eligiblePlayerIds: ["a", "c"] },
      { amount: 400, eligiblePlayerIds: ["c"] },
    ]);
  });

  it("awards the main and side pots to different hands", () => {
    const deck = riggedDeck(
      "Kc", "Qc", "Ac", "Kd", "Qd", "Ad",
      "3c", "2s", "7h", "9c", "4c", "Jh", "5c", "6d",
    );
    let state = start(table([100, 300, 300]), deck);
    state = act(state, "p0", "all-in");
    state = act(state, "p1", "all-in");
    state = act(state, "p2", "call");
    expect(state.hand?.settlement?.pots.map((pot) => pot.amount)).toEqual([300, 400]);
    expect(state.players.map((player) => player.stack)).toEqual([300, 400, 0]);
    expect(state.hand?.settlement?.awards.map((award) => award.playerId)).toEqual(["p0", "p1"]);
  });

  it("splits a tied pot and returns an unmatched blind tranche", () => {
    const state = startHand(
      createGameState({
        tableId: "odd-pot",
        config: { smallBlind: 1, bigBlind: 2 },
        players: [
          { id: "p0", name: "One", seat: 0, stack: 1 },
          { id: "p1", name: "Two", seat: 1, stack: 10 },
        ],
      }),
      {
        commandId: "start-odd",
        expectedVersion: 0,
        now: 1_000,
        deck: riggedDeck(
          "2c", "3c", "4d", "5d",
          "6h", "As", "Kd", "Qc", "7h", "Js", "8h", "Tc",
        ),
      },
    ).state;
    expect(state.hand?.street).toBe("showdown");
    expect(state.players.map((player) => player.stack)).toEqual([1, 10]);
    expect(state.hand?.settlement?.pots.map((pot) => pot.amount)).toEqual([2, 1]);
  });
});

describe("timeouts, disconnects, and privacy", () => {
  it("checks when free, folds when facing a bet, and waits for the deadline", () => {
    let state = start(table([1_000, 1_000]));
    const deadline = state.hand!.actionDeadlineAt!;
    expect(() =>
      applyTurnTimeout(state, {
        commandId: "too-soon",
        expectedVersion: state.version,
        now: deadline - 1,
      }),
    ).toThrowError(expect.objectContaining({ code: "TIMEOUT_NOT_REACHED" }));
    state = applyTurnTimeout(state, {
      commandId: "timed-out",
      expectedVersion: state.version,
      now: deadline,
    }).state;
    expect(state.hand?.settlement?.reason).toBe("fold");
  });

  it("records disconnection without exposing or automatically acting a hand", () => {
    let state = start(table([1_000, 1_000]));
    const currentSeat = state.hand?.currentSeat;
    state = setPlayerConnection(state, "p0", false, {
      commandId: "offline",
      expectedVersion: state.version,
      now: 2_000,
    }).state;
    expect(state.players.find((player) => player.id === "p0")?.connected).toBe(false);
    expect(state.hand?.currentSeat).toBe(currentSeat);
  });

  it("pauses actions and starts a fresh deadline when resumed", () => {
    let state = start(table([1_000, 1_000]));
    state = setTableStatus(state, "paused", {
      commandId: "pause",
      expectedVersion: state.version,
      now: 2_000,
    }).state;
    expect(() => act(state, "p0", "fold")).toThrowError(
      expect.objectContaining({ code: "HAND_NOT_RUNNING" }),
    );
    state = setTableStatus(state, "playing", {
      commandId: "resume",
      expectedVersion: state.version,
      now: 10_000,
    }).state;
    expect(state.hand?.actionDeadlineAt).toBe(55_000);
  });

  it("only includes the viewer's cards before showdown and never emits deck secrets", () => {
    const state = start(table());
    const p0 = createPublicSnapshot(state, "p0");
    expect(p0.players.find((player) => player.id === "p0")?.holeCards).toHaveLength(2);
    expect(p0.players.find((player) => player.id === "p1")?.holeCards).toBeNull();
    const serialized = JSON.stringify(p0);
    expect(serialized).not.toContain('"deck"');
    expect(serialized).not.toContain('"burned"');
    expect(serialized).not.toContain("processedActionIds");
  });
});
