export interface RoomSettings {
  maxSeats: number;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  actionSeconds: number;
}

export function parseRoomSettings(body: Record<string, unknown>): RoomSettings | null {
  const values = {
    maxSeats: Number(body.maxSeats),
    startingStack: Number(body.startingStack),
    smallBlind: Number(body.smallBlind),
    bigBlind: Number(body.bigBlind),
    actionSeconds: Number(body.actionSeconds),
  };
  if (!Object.values(values).every(Number.isSafeInteger)) return null;
  if (values.maxSeats < 2 || values.maxSeats > 9) return null;
  if (values.startingStack < 1_000 || values.startingStack > 1_000_000_000) return null;
  if (values.smallBlind < 1 || values.bigBlind < values.smallBlind || values.bigBlind > 200_000_000) return null;
  if (values.startingStack < values.bigBlind * 2) return null;
  if (values.actionSeconds < 15 || values.actionSeconds > 120) return null;
  return values;
}
