import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  room: { id: "private", public_id: "public", status: "active", version: 7 } as { id: string; public_id: string; status: string; version: number },
  stored: { version: 7, state: { players: [{ id: "guest" }] } },
  ensure: vi.fn(async () => undefined),
  advance: vi.fn(async () => false),
  payload: vi.fn(async () => ({ room: { version: 7 } })),
}));

vi.mock("@/lib/server/http", () => ({
  json: (value: unknown) => Response.json(value),
  apiError: (status: number, code: string) => Response.json({ code }, { status }),
}));
vi.mock("@/lib/server/rooms", () => ({
  roomByPublicId: async () => mock.room,
  actorForRoom: async () => ({ participantId: "guest", role: "player", isOwner: false }),
  gameStateForRoom: async () => mock.stored,
  roomStatePayload: mock.payload,
}));
vi.mock("@/lib/server/operations", () => ({
  ensureParticipantInGame: mock.ensure,
  isVersionConflict: () => false,
}));
vi.mock("@/lib/server/advance", () => ({ advanceRoomIfDue: mock.advance }));
vi.mock("@/lib/server/owner", () => ({ ownerIdentity: async () => ({ userId: null }), ownsRoom: () => false }));
vi.mock("@/lib/server/session", () => ({ ownerRoomCode: async () => null }));

import { GET } from "./route";

const context = { params: Promise.resolve({ id: "public" }) };

describe("room state read", () => {
  beforeEach(() => {
    mock.room.status = "active";
    mock.stored.state.players = [{ id: "guest" }];
    mock.ensure.mockClear();
    mock.advance.mockClear();
    mock.payload.mockClear();
  });

  it("reuses the loaded game state on the normal action path", async () => {
    const response = await GET(new Request("http://localhost/api/rooms/public/state"), context);
    expect(response.status).toBe(200);
    expect(mock.ensure).not.toHaveBeenCalled();
    expect(mock.advance).not.toHaveBeenCalled();
    expect(mock.payload).toHaveBeenCalledWith(mock.room, expect.anything(), { stored: mock.stored });
  });

  it("still repairs a newly joined player not yet in the game state", async () => {
    mock.stored.state.players = [];
    const response = await GET(new Request("http://localhost/api/rooms/public/state"), context);
    expect(response.status).toBe(200);
    expect(mock.ensure).toHaveBeenCalledWith("private", "guest");
  });

  it("still checks automatic advancement between hands", async () => {
    mock.room.status = "lobby";
    const response = await GET(new Request("http://localhost/api/rooms/public/state"), context);
    expect(response.status).toBe(200);
    expect(mock.advance).toHaveBeenCalledWith(mock.room, mock.stored);
  });
});
