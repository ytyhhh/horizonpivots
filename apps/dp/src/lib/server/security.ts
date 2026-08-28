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

function ownerCodeKey() {
  return createHash("sha256").update(dpSessionSecret()).update("\0owner-code").digest();
}

export function sealOwnerRoomCode(roomId: string, code: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ownerCodeKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ roomId, code }), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function openOwnerRoomCode(value: string | undefined) {
  if (!value) return null;
  try {
    const packed = Buffer.from(value, "base64url");
    if (packed.length < 29) return null;
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const encrypted = packed.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", ownerCodeKey(), iv);
    decipher.setAuthTag(tag);
    const parsed = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const roomId = "roomId" in parsed ? parsed.roomId : null;
    const code = "code" in parsed ? parsed.code : null;
    return typeof roomId === "string" && typeof code === "string" ? { roomId, code } : null;
  } catch {
    return null;
  }
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

export function sanitizeChat(value: unknown) {
  if (typeof value !== "string") return null;
  const body = value.normalize("NFKC").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  if (body.length < 1 || body.length > 240) return null;
  if (/(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|cn|net|org|io|xyz)\b)/iu.test(body)) return null;
  return body;
}

export const fixedReactions = ["👍", "👏", "😂", "🤔", "好运", "好牌"] as const;

export function isFixedReaction(value: unknown): value is (typeof fixedReactions)[number] {
  return typeof value === "string" && fixedReactions.includes(value as (typeof fixedReactions)[number]);
}
