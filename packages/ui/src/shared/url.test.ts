import { describe, expect, it } from "vitest";
import { host, isGovernmentUrl, safeUrl } from "./url";

describe("urls", () => {
  it("links only http(s) urls", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl(undefined)).toBeUndefined();
    expect(safeUrl("https://example.gov/page")).toBe("https://example.gov/page");
    expect(host("https://www.irs.gov/businesses")).toBe("irs.gov");
    expect(host("not a url")).toBe("not a url");
  });

  it("recognizes government domains without matching lookalikes", () => {
    expect(isGovernmentUrl("https://www.irs.gov/businesses")).toBe(true);
    expect(isGovernmentUrl("https://agency.gov./page")).toBe(true);
    expect(isGovernmentUrl("https://example.gov.evil.test")).toBe(false);
    expect(isGovernmentUrl("https://example.com")).toBe(false);
  });
});
