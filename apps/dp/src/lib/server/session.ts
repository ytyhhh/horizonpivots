import { cookies } from "next/headers";
import { DP_COOKIE_NAME, DP_OWNER_CODE_COOKIE_NAME, hashGuestToken, openOwnerRoomCode } from "./security";

export async function guestTokenHash() {
  const token = (await cookies()).get(DP_COOKIE_NAME)?.value;
  return token ? hashGuestToken(token) : null;
}

export function guestCookie(token: string, expiresAt: Date) {
  return {
    name: DP_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
      expires: expiresAt,
    },
  };
}

export async function ownerRoomCode(publicId: string) {
  const jar = await cookies();
  return openOwnerRoomCode(
    jar.get(`${DP_OWNER_CODE_COOKIE_NAME}-${publicId}`)?.value
      ?? jar.get(DP_OWNER_CODE_COOKIE_NAME)?.value,
  );
}

export function ownerCodeCookie(value: string, expiresAt: Date, publicId: string) {
  return {
    name: `${DP_OWNER_CODE_COOKIE_NAME}-${publicId}`,
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
      expires: expiresAt,
    },
  };
}
