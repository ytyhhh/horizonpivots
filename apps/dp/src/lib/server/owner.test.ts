import { beforeEach, describe, expect, it, vi } from "vitest";
import { ownerIdentity, ownsRoom } from "./owner";

const authMock = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));

beforeEach(() => authMock.mockReset());

describe("DP room ownership", () => {
  it("allows the signed-in creator to manage their own room", () => {
    expect(ownsRoom("user_a", "user_a")).toBe(true);
  });

  it("does not grant ownership to another signed-in account", () => {
    expect(ownsRoom("user_b", "user_a")).toBe(false);
  });

  it("does not treat an anonymous visitor as a room owner", () => {
    expect(ownsRoom(null, "user_a")).toBe(false);
  });

  it("uses the current Clerk session instead of a configured owner ID", async () => {
    authMock.mockResolvedValueOnce({ userId: "user_a" });
    authMock.mockResolvedValueOnce({ userId: null });
    expect(await ownerIdentity()).toEqual({ userId: "user_a" });
    expect(await ownerIdentity()).toEqual({ userId: null });
  });
});
