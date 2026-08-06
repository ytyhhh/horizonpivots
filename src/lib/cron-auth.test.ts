import { afterEach, describe, expect, it, vi } from "vitest";
import { isCronAuthorized } from "@/lib/cron-auth";

afterEach(() => vi.unstubAllEnvs());

describe("cron authentication", () => {
  it("accepts the exact bearer secret and rejects all other values", () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    expect(isCronAuthorized(new Request("https://example.com", { headers: { Authorization: "Bearer test-secret" } }))).toBe(true);
    expect(isCronAuthorized(new Request("https://example.com", { headers: { Authorization: "Bearer wrong" } }))).toBe(false);
    expect(isCronAuthorized(new Request("https://example.com"))).toBe(false);
  });
});

