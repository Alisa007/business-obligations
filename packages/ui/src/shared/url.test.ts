import { describe, expect, it } from "vitest";
import { host, safeUrl } from "./url";

describe("urls", () => {
  it("links only http(s) urls", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl(undefined)).toBeUndefined();
    expect(safeUrl("https://example.gov/page")).toBe("https://example.gov/page");
    expect(host("https://www.irs.gov/businesses")).toBe("irs.gov");
    expect(host("not a url")).toBe("not a url");
  });
});
