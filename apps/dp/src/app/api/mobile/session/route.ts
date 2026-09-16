import { apiError, assertMutationOrigin, json, readJson } from "@/lib/server/http";
import { exchangeMobileAuthorizationCode, issueMobileOwnerToken } from "@/lib/server/security";

export const runtime = "nodejs";
export const preferredRegion = "sin1";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!assertMutationOrigin(request)) return apiError(403, "ORIGIN_REJECTED", "请求来源无效。");
  const body = await readJson(request);
  if (!body) return apiError(400, "INVALID_JSON", "登录授权格式无效。");
  const identity = exchangeMobileAuthorizationCode(body.code, body.codeVerifier);
  if (!identity) return apiError(401, "MOBILE_SESSION_INVALID", "登录授权已失效，请返回 App 重新登录。");
  const session = issueMobileOwnerToken(identity.userId);
  return json(session, { status: 201 });
}
