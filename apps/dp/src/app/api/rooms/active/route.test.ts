import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  userId: null as string | null,
  rooms: [] as Array<{ id: string; public_id: string }>,
}));

vi.mock("@/lib/server/owner", () => ({ ownerIdentity: async () => ({ userId: mock.userId }) }));
vi.mock("@/lib/server/http", () => ({
  json: (value: unknown) => Response.json(value),
  apiError: (status: number, code: string, message: string) => Response.json({ code, message }, { status }),
}));
vi.mock("@/lib/server/rooms", () => ({
  activeRoomsForOwner: async () => mock.rooms,
  actorForRoom: async () => ({ participantId: "owner", role: "owner", isOwner: true }),
  roomStatePayload: async (room: { public_id: string }) => ({ room: { id: room.public_id }, participants: [] }),
  adminAuditForRoom: async () => [],
}));

import { GET } from "./route";

describe("owner room management", () => {
  beforeEach(() => {
    mock.userId = null;
    mock.rooms = [];
  });

  it("requires a signed-in owner", async () => {
    expect((await GET()).status).toBe(401);
  });

  it("returns every active room for the owner", async () => {
    mock.userId = "user_owner";
    mock.rooms = [
      { id: "private_a", public_id: "public_a" },
      { id: "private_b", public_id: "public_b" },
    ];
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      maxRooms: 3,
      rooms: [{ room: { id: "public_a" } }, { room: { id: "public_b" } }],
    });
  });
});
