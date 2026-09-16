import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchJsonWithClerkRetry } from "./api-client";

afterEach(() => vi.unstubAllGlobals());

describe("Clerk session recovery for DP API requests", () => {
  it("retries an identity 404 with a fresh Clerk token", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: "ROOM_NOT_FOUND", message: "会话暂不可用" }, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ room: { id: "room_a" } }));
    vi.stubGlobal("fetch", request);
    const getToken = vi.fn().mockResolvedValue("signed-session-token");

    const result = await fetchJsonWithClerkRetry<{ room: { id: string } }>("/api/rooms/room_a/state", undefined, getToken);
    expect(result.room.id).toBe("room_a");
    expect(request).toHaveBeenCalledTimes(2);
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[1][1].headers.Authorization).toBe("Bearer signed-session-token");
  });

  it("does not retry an invalid poker action or an anonymous request", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ code: "INVALID_ACTION", message: "非法动作" }, { status: 422 }));
    vi.stubGlobal("fetch", request);
    const getToken = vi.fn();
    await expect(fetchJsonWithClerkRetry("/api/rooms/room_a/actions", { method: "POST" }, getToken)).rejects.toBeInstanceOf(ApiError);
    expect(getToken).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("keeps a missing-session response when Clerk has no token", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ code: "SIGN_IN_REQUIRED", message: "请登录" }, { status: 401 }));
    vi.stubGlobal("fetch", request);
    await expect(fetchJsonWithClerkRetry("/api/rooms/room_a/state", undefined, async () => null)).rejects.toMatchObject({ status: 401 });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
