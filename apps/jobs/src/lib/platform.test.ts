import { describe, expect, it } from "vitest";
import { isAllowedReturnUrl, loginUrl, products } from "@horizon/platform";

describe("Horizon Pivots login return URLs", () => {
  it("accepts known product and local origins", () => {
    expect(isAllowedReturnUrl("https://phd.horizonpivots.com/research")).toBe(true);
    expect(isAllowedReturnUrl("https://jobs.horizonpivots.com/profile")).toBe(true);
    expect(isAllowedReturnUrl("https://cuhksz.horizonpivots.com/#courses")).toBe(true);
    expect(isAllowedReturnUrl("https://dp.horizonpivots.com/room/public-id")).toBe(true);
    expect(isAllowedReturnUrl("http://localhost:3002")).toBe(true);
    expect(isAllowedReturnUrl("http://localhost:3004")).toBe(true);
  });

  it("rejects external and script return URLs", () => {
    expect(isAllowedReturnUrl("https://example.com/login")).toBe(false);
    expect(isAllowedReturnUrl("https://dp.horizonpivots.com.evil.example/room")).toBe(false);
    expect(isAllowedReturnUrl("javascript:alert(1)")).toBe(false);
  });

  it("creates the central login URL for a PhD callback", () => {
    const url = new URL(loginUrl("https://phd.horizonpivots.com"));
    expect(url.origin).toBe("https://horizonpivots.com");
    expect(url.searchParams.get("redirect_url")).toBe("https://phd.horizonpivots.com");
  });

  it("keeps the private DP origin out of public product navigation", () => {
    expect(products.map((product) => String(product.id))).not.toContain("dp");
  });
});
