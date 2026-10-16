import { describe, expect, it } from "vitest";
import { industryFromNaics } from "../src";
import { NAICS_CODES, naicsTitle, searchNaics } from "../src/naics-entry";

describe("NAICS code list", () => {
  it("has the 1,012 six-digit 2022 codes, each once", () => {
    expect(NAICS_CODES).toHaveLength(1012);
    expect(new Set(NAICS_CODES.map((c) => c.code)).size).toBe(1012);
    for (const c of NAICS_CODES) {
      expect(c.code).toMatch(/^\d{6}$/);
      expect(c.title.length, c.code).toBeGreaterThan(3);
    }
  });

  it("looks up titles", () => {
    expect(naicsTitle("722511")).toBe("Full-Service Restaurants");
    expect(naicsTitle("000000")).toBeUndefined();
  });

  it("searches by code prefix and by words", () => {
    expect(searchNaics("7225").map((c) => c.code)).toContain("722511");
    expect(searchNaics("restaurant").map((c) => c.code)).toContain("722511");
    expect(searchNaics("beer wine").map((c) => c.code)).toContain("445320");
    expect(searchNaics("  ")).toEqual([]);
    expect(searchNaics("zzzzzz")).toEqual([]);
  });

  it("lists codes the engine has rules for first", () => {
    const flags = searchNaics("services", 100).map((c) => (industryFromNaics(c.code) ? 0 : 1));
    expect(flags).toContain(0);
    expect(flags).toContain(1);
    expect(flags).toEqual([...flags].sort());
  });
});
