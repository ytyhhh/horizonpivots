import { randomUUID } from "node:crypto";
import { ownerIdentity } from "@/lib/server/owner";
import { apiError, assertMutationOrigin, json, readJson } from "@/lib/server/http";
import { createRoomRecord, isOpenRoomConflict, parseRoomSettings } from "@/lib/server/operations";
import { generateOpaqueToken, generateRoomCode, hashRoomCode, sealOwnerRoomCode } from "@/lib/server/security";
import { ownerCodeCookie } from "@/lib/server/session";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!assertMutationOrigin(request)) return apiError(403, "ORIGIN_REJECTED", "请求来源无效。");
  const owner = await ownerIdentity();
  if (!owner.isOwner || !owner.userId) return apiError(403, "OWNER_ONLY", "只有房主可以创建牌桌。");
  const body = await readJson(request);
  if (!body) return apiError(400, "INVALID_JSON", "牌桌设置格式无效。");
  const settings = parseRoomSettings(body);
  if (!settings) return apiError(422, "INVALID_SETTINGS", "请检查座位、筹码、盲注和行动时间。");

  const roomId = randomUUID();
  const publicId = randomUUID();
  const ownerParticipantId = randomUUID();
  const code = generateRoomCode();
  try {
    const created = await createRoomRecord({
      roomId,
      publicId,
      ownerParticipantId,
      codeHash: hashRoomCode(code),
      broadcastTopic: generateOpaqueToken(),
      ownerUserId: owner.userId,
      ownerName: "房主",
      settings,
    });
    const expiresAt = new Date(created.expires_at);
    const response = json({
      roomId: created.public_id,
      shareText: `来好友牌桌一起玩。房间号：${code}`,
      room: {
        id: created.public_id,
        code,
        status: "waiting",
        version: created.version,
        maxSeats: settings.maxSeats,
        startingStack: settings.startingStack,
        smallBlind: settings.smallBlind,
        bigBlind: settings.bigBlind,
        actionSeconds: settings.actionSeconds,
        locked: false,
        spectatorsAllowed: false,
        expiresAt: created.expires_at,
      },
    }, { status: 201 });
    const sealed = sealOwnerRoomCode(created.room_id, code);
    const cookie = ownerCodeCookie(sealed, expiresAt);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (caught) {
    if (isOpenRoomConflict(caught)) return apiError(409, "ACTIVE_ROOM_EXISTS", "同一时间只能保留一个活动牌桌，请先前往管理页。");
    const error = caught && typeof caught === "object"
      ? caught as { code?: unknown; message?: unknown; status?: unknown }
      : null;
    console.error(JSON.stringify({
      level: "error",
      event: "dp_room_create_failed",
      code: typeof error?.code === "string" ? error.code : null,
      status: typeof error?.status === "number" ? error.status : null,
      message: typeof error?.message === "string" ? error.message.slice(0, 240) : "Unknown room creation error",
    }));
    return apiError(500, "ROOM_CREATE_FAILED", "暂时无法创建牌桌，请稍后再试。");
  }
}
