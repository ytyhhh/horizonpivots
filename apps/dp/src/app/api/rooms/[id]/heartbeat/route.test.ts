import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  actor: null as { participantId: string; role: "player" | "owner"; isOwner: boolean } | null,
  room: { id: "private", public_id: "public", status: "active", version: 7 } as { id: string; public_id: string; status: string; version: number },
  advance: vi.fn(async () => false),
}));

vi.mock("@/lib/server/http", () => ({
  json: (value: unknown) => Response.json(value),
  apiError: (status: number, code: string) => Response.json({ code }, { status }),
}));
vi.mock("@/lib/server/rooms", () => ({
  roomByPublicId: async () => mock.room,
  actorForRoom: async () => mock.actor,
}));
vi.mock("@/lib/server/advance", () => ({ advanceRoomIfDue: mock.advance }));
vi.mock("@/lib/server/operations", () => ({ isVersionConflict: () => false }));

import { GET } from "./route";

const context = { params: Promise.resolve({ id: "public" }) };

describe("room version heartbeat", () => {
  beforeEach(() => {
    mock.actor = null;
    mock.room.status = "active";
    mock.advance.mockClear();
  });

  it("returns no room data to unauthorised callers", async () => {
    const response = await GET(new Request("http://localhost/api/rooms/public/heartbeat"), context);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: "ROOM_NOT_FOUND" });
  });

  it("lets an authenticated guest check only the current version", async () => {
    mock.actor = { participantId: "guest", role: "player", isOwner: false };
    const response = await GET(new Request("http://localhost/api/rooms/public/heartbeat"), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ version: 7 });
    expect(mock.advance).not.toHaveBeenCalled();
  });

  it("allows the owner to advance a waiting room", async () => {
    mock.actor = { participantId: "owner", role: "owner", isOwner: true };
    mock.room.status = "lobby";
    const response = await GET(new Request("http://localhost/api/rooms/public/heartbeat"), context);
    expect(response.status).toBe(200);
    expect(mock.advance).toHaveBeenCalledOnce();
  });
});
