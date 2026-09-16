import { beforeEach, describe, expect, it, vi } from "vitest";
import { ownerIdentity, ownsRoom } from "./owner";
import { issueMobileOwnerToken } from "./security";

const authMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("next/headers", () => ({ headers: headersMock }));

beforeEach(() => {
  authMock.mockReset();
  headersMock.mockResolvedValue(new Headers());
  process.env.DP_SESSION_SECRET = "test-only-secret-with-more-than-32-characters";
});

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

  it("accepts a valid mobile owner session without exposing a Clerk token", async () => {
    const mobile = issueMobileOwnerToken("user_mobile");
    headersMock.mockResolvedValueOnce(new Headers({ "x-dp-mobile-token": mobile.token }));
    expect(await ownerIdentity()).toEqual({ userId: "user_mobile" });
    expect(authMock).not.toHaveBeenCalled();
  });
});
