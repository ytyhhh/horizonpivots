export const MAX_OWNER_ROOMS = 3;

export function isRoomLimitConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown };
  if (candidate.code === "23514" && candidate.message === "dp_room_limit_reached") return true;
  return candidate.code === "23505"
    && [candidate.message, candidate.details].some((value) => typeof value === "string" && (value.includes("dp_rooms_one_open_room_idx") || value.includes("dp_rooms_one_open_room_per_owner_idx")));
}
