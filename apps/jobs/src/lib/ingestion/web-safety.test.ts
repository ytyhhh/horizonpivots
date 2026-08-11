import { describe, expect, it } from "vitest";
import { assertSafePublicUrl, isPublicIp } from "@/lib/ingestion/web-safety";

describe("official crawler network safety", () => {
  it("rejects private and special-use IP addresses", () => {
    expect(isPublicIp("127.0.0.1")).toBe(false);
    expect(isPublicIp("10.1.2.3")).toBe(false);
    expect(isPublicIp("169.254.169.254")).toBe(false);
    expect(isPublicIp("::1")).toBe(false);
    expect(isPublicIp("8.8.8.8")).toBe(true);
  });

  it("rejects HTTP and direct private-IP URLs before fetching", async () => {
    await expect(assertSafePublicUrl("http://jobs.example.com")).rejects.toThrow("HTTPS");
    await expect(assertSafePublicUrl("https://127.0.0.1/jobs")).rejects.toThrow("Private IP");
    await expect(assertSafePublicUrl("https://user:pass@example.com/jobs")).rejects.toThrow("credentials");
  });
});

