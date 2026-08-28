import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  generateOpaqueToken,
  generateRoomCode,
  hashGuestToken,
  hashRoomCode,
  isFixedReaction,
  normalizeRoomCode,
  openOwnerRoomCode,
  sanitizeChat,
  sanitizeNickname,
  sealOwnerRoomCode,
} from "./security";

const previousSecret = process.env.DP_SESSION_SECRET;

beforeAll(() => {
  process.env.DP_SESSION_SECRET = "test-only-secret-with-more-than-32-characters";
});

afterAll(() => {
  if (previousSecret === undefined) delete process.env.DP_SESSION_SECRET;
  else process.env.DP_SESSION_SECRET = previousSecret;
});

describe("DP invitation and session security", () => {
  it("generates unambiguous, high-entropy room codes", () => {
    const codes = new Set(Array.from({ length: 200 }, generateRoomCode));
    expect(codes.size).toBe(200);
    for (const code of codes) expect(code).toMatch(/^[2-9A-HJ-NP-Z]{10}$/);
  });

  it("normalizes pasted codes without accepting ambiguous characters", () => {
    expect(normalizeRoomCode(" abcd-2345-xy ")).toBe("ABCD2345XY");
    expect(normalizeRoomCode("O0I1-2345")).toBe("2345");
  });

  it("stores only stable keyed hashes for codes and 256-bit guest tokens", () => {
    const token = generateOpaqueToken();
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(hashGuestToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRoomCode("ABCD2345XY")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRoomCode("ABCD2345XY")).not.toContain("ABCD2345XY");
  });

  it("seals an owner-only room code and rejects tampering", () => {
    const sealed = sealOwnerRoomCode("11111111-1111-4111-8111-111111111111", "ABCD2345XY");
    expect(openOwnerRoomCode(sealed)).toEqual({
      roomId: "11111111-1111-4111-8111-111111111111",
      code: "ABCD2345XY",
    });
    const replacement = sealed.startsWith("A") ? "B" : "A";
    expect(openOwnerRoomCode(`${replacement}${sealed.slice(1)}`)).toBeNull();
  });

  it("accepts plain short chat and rejects links or malformed identity text", () => {
    expect(sanitizeNickname("  小明  ")).toBe("小明");
    expect(sanitizeChat("这手打得好")).toBe("这手打得好");
    expect(sanitizeChat("看 https://example.com")).toBeNull();
    expect(isFixedReaction("👏")).toBe(true);
    expect(isFixedReaction("打开链接")).toBe(false);
  });
});
