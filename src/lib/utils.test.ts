import { describe, expect, it } from "vitest";
import {
  daysUntil,
  isExpired,
  normalizeUrl,
  slugifyFingerprint,
} from "@/lib/utils";

describe("URL normalization", () => {
  it("removes tracking parameters and fragments", () => {
    expect(
      normalizeUrl(
        "https://example.com/jobs/1/?utm_source=test&from=feed#details",
      ),
    ).toBe("https://example.com/jobs/1");
  });

  it("rejects malformed URLs", () => {
    expect(normalizeUrl("not a url")).toBeNull();
  });
});

describe("stable fingerprints", () => {
  it("returns the same value for the same normalized fields", () => {
    const first = slugifyFingerprint(["公司", "算法工程师", ["北京"], "正式批"]);
    const second = slugifyFingerprint(["公司", "算法工程师", ["北京"], "正式批"]);
    expect(first).toBe(second);
    expect(first).toMatch(/^job_/);
  });

  it("changes when a material field changes", () => {
    expect(slugifyFingerprint(["公司", "算法", ["北京"]])).not.toBe(
      slugifyFingerprint(["公司", "产品", ["北京"]]),
    );
  });
});

describe("deadline handling", () => {
  const now = new Date("2026-07-30T12:00:00+08:00");

  it("returns inclusive calendar days", () => {
    expect(daysUntil("2026-08-01", now)).toBe(3);
  });

  it("does not expire jobs without deadlines", () => {
    expect(isExpired(null, now)).toBe(false);
  });

  it("expires past deadlines", () => {
    expect(isExpired("2026-07-29", now)).toBe(true);
  });
});
