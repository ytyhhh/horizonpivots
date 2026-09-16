import { describe, expect, it } from "vitest";
import { parseRoomSettings } from "./settings";

describe("DP room settings", () => {
  it("accepts a 5/10 blind structure", () => {
    expect(parseRoomSettings({
      maxSeats: 6,
      startingStack: 10_000,
      smallBlind: 5,
      bigBlind: 10,
      actionSeconds: 45,
    })).toEqual({
      maxSeats: 6,
      startingStack: 10_000,
      smallBlind: 5,
      bigBlind: 10,
      actionSeconds: 45,
    });
  });

  it("still rejects malformed or unsafe settings", () => {
    expect(parseRoomSettings({ maxSeats: 6, startingStack: 10_000, smallBlind: 10, bigBlind: 5, actionSeconds: 45 })).toBeNull();
    expect(parseRoomSettings({ maxSeats: 6, startingStack: 10_000, smallBlind: 5.5, bigBlind: 10, actionSeconds: 45 })).toBeNull();
  });
});
