import { describe, expect, it } from "vitest";
import { parseRoomSettings } from "./settings";
import { isRoomLimitConflict } from "./room-limit";

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

describe("DP owner room limit", () => {
  it("recognizes the database-enforced three-room limit", () => {
    expect(isRoomLimitConflict({ code: "23514", message: "dp_room_limit_reached" })).toBe(true);
    expect(isRoomLimitConflict({ code: "23514", message: "other_check_failed" })).toBe(false);
  });

  it("still handles the previous one-room index during deployment", () => {
    expect(isRoomLimitConflict({ code: "23505", message: "dp_rooms_one_open_room_per_owner_idx" })).toBe(true);
  });
});
