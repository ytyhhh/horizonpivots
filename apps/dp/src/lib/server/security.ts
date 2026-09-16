import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { dpSessionSecret } from "./env";

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 10;

export const DP_COOKIE_NAME = process.env.NODE_ENV === "production"
  ? "__Host-dp-session"
  : "dp-session";
export const DP_OWNER_CODE_COOKIE_NAME = process.env.NODE_ENV === "production"
  ? "__Host-dp-owner-code"
  : "dp-owner-code";

function hmac(value: string, context: string) {
  return createHmac("sha256", dpSessionSecret())
    .update(context)
    .update("\0")
    .update(value)
    .digest("hex");
}

export function normalizeRoomCode(value: unknown) {
  if (typeof value !== "string") return "";
  return value.toUpperCase().replace(/[^2-9A-HJ-NP-Z]/g, "").slice(0, CODE_LENGTH);
}

export function generateRoomCode() {
  let result = "";
  const ceiling = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;
  while (result.length < CODE_LENGTH) {
    for (const byte of randomBytes(16)) {
      if (byte >= ceiling) continue;
      result += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (result.length === CODE_LENGTH) break;
    }
  }
  return result;
}

export function generateOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

function derivedKey(context: string) {
  return createHash("sha256").update(dpSessionSecret()).update(`\0${context}`).digest();
}

function sealPayload(payload: Record<string, unknown>, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derivedKey(context), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function openPayload(value: string | undefined, context: string) {
  if (!value) return null;
  try {
    const packed = Buffer.from(value, "base64url");
    if (packed.length < 29) return null;
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const encrypted = packed.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", derivedKey(context), iv);
    decipher.setAuthTag(tag);
    const parsed = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")) as unknown;
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function sealOwnerRoomCode(roomId: string, code: string) {
  return sealPayload({ roomId, code }, "owner-code");
}

export function openOwnerRoomCode(value: string | undefined) {
  const parsed = openPayload(value, "owner-code");
  const roomId = parsed?.roomId;
  const code = parsed?.code;
  return typeof roomId === "string" && typeof code === "string" ? { roomId, code } : null;
}

const mobileCodeLifetimeMs = 5 * 60 * 1_000;
const mobileSessionLifetimeMs = 7 * 24 * 60 * 60 * 1_000;
const codeChallengePattern = /^[A-Za-z0-9_-]{43}$/;
const codeVerifierPattern = /^[A-Za-z0-9._~-]{43,128}$/;

export function isMobileCodeChallenge(value: unknown): value is string {
  return typeof value === "string" && codeChallengePattern.test(value);
}

export function issueMobileAuthorizationCode(userId: string, codeChallenge: string, now = Date.now()) {
  if (!userId || userId.length > 160 || !isMobileCodeChallenge(codeChallenge)) {
    throw new Error("Invalid mobile authorization request.");
  }
  return sealPayload({
    kind: "mobile-authorization-code",
    userId,
    codeChallenge,
    expiresAt: now + mobileCodeLifetimeMs,
  }, "mobile-authorization-code");
}

export function exchangeMobileAuthorizationCode(value: unknown, codeVerifier: unknown, now = Date.now()) {
  if (typeof value !== "string" || typeof codeVerifier !== "string" || !codeVerifierPattern.test(codeVerifier)) return null;
  const parsed = openPayload(value, "mobile-authorization-code");
  if (parsed?.kind !== "mobile-authorization-code"
    || typeof parsed.userId !== "string"
    || typeof parsed.codeChallenge !== "string"
    || typeof parsed.expiresAt !== "number"
    || parsed.expiresAt < now) return null;
  const challenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return secureEqual(challenge, parsed.codeChallenge) ? { userId: parsed.userId } : null;
}

export function issueMobileOwnerToken(userId: string, now = Date.now()) {
  const expiresAt = now + mobileSessionLifetimeMs;
  return {
    token: sealPayload({ kind: "mobile-owner-session", userId, expiresAt }, "mobile-owner-session"),
    expiresAt,
  };
}

export function openMobileOwnerToken(value: string | undefined, now = Date.now()) {
  const parsed = openPayload(value, "mobile-owner-session");
  if (parsed?.kind !== "mobile-owner-session"
    || typeof parsed.userId !== "string"
    || typeof parsed.expiresAt !== "number"
    || parsed.expiresAt < now) return null;
  return { userId: parsed.userId, expiresAt: parsed.expiresAt };
}

export function hashRoomCode(code: string) {
  return hmac(normalizeRoomCode(code), "room-code");
}

export function hashGuestToken(token: string) {
  return hmac(token, "guest-session");
}

export function hashJoinIdentity(value: string) {
  return hmac(value, "join-identity");
}

export function secureEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sanitizeNickname(value: unknown) {
  if (typeof value !== "string") return null;
  const nickname = value.normalize("NFKC").replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (nickname.length < 1 || nickname.length > 20) return null;
  return nickname;
}
