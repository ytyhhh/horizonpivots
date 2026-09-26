import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  userId: null as string | null,
  rows: {} as Record<string, Record<string, unknown>>,
  selectedUserId: "",
}));

vi.mock("@/lib/auth", () => ({ getCurrentUserId: async () => state.userId }));
vi.mock("@/lib/vector-sync", () => ({ syncProfileEmbedding: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (field: string, value: string) => {
          if (field !== "user_id") throw new Error("Unexpected ownership filter");
          state.selectedUserId = value;
          return { maybeSingle: async () => ({ data: state.rows[value] ?? null, error: null }) };
        },
      }),
    }),
  }),
}));

import { GET } from "@/app/api/profile/route";

function row(userId: string, school: string) {
  return {
    user_id: userId,
    version: 1,
    confirmed: false,
    skills: [],
    experiences: [],
    project_domains: [],
    preferred_locations: [],
    preferred_industries: [],
    preferred_roles: [],
    excluded_companies: [],
    educations: [{ school, degree: "本科", major: "计算机", startMonth: "", endMonth: "", coursework: "" }],
  };
}

describe("profile API ownership", () => {
  beforeEach(() => {
    state.userId = null;
    state.selectedUserId = "";
    state.rows = { user_a: row("user_a", "甲学校"), user_b: row("user_b", "乙学校") };
  });

  it("requires a Clerk session", async () => {
    expect((await GET()).status).toBe(401);
    expect(state.selectedUserId).toBe("");
  });

  it("returns only the caller's manual entries", async () => {
    state.userId = "user_a";
    const response = await GET();
    expect(response.status).toBe(200);
    expect(state.selectedUserId).toBe("user_a");
    const payload = await response.json();
    expect(payload.data.educations[0].school).toBe("甲学校");
    expect(JSON.stringify(payload)).not.toContain("乙学校");
  });
});
