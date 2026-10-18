import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS module
import { findMissing, findUnverified } from "../scripts/missing-local.mjs";

describe("findUnverified", () => {
  it("lists only unverified entries, oldest check first", () => {
    const rows = findUnverified({ count: 40 });
    expect(rows.length).toBeLessThanOrEqual(40);
    for (const r of rows) expect(["city", "county"]).toContain(r.kind);
    const dates = rows.map((r: { checkedOn: string }) => r.checkedOn);
    expect([...dates].sort()).toEqual(dates);
  });

  it("returns nothing when no revisit is asked for, and honours the state filter", () => {
    expect(findUnverified({ count: 0 })).toEqual([]);
    const ia = findUnverified({ count: 5, state: "IA" });
    expect(ia.length).toBeLessThanOrEqual(5);
    expect(ia.every((r: { state: string }) => r.state === "IA")).toBe(true);
  });

  it("never lists settled entries", () => {
    const names = new Set(
      findUnverified({ count: 1000 }).map(
        (r: { kind: string; state: string; name: string }) => `${r.kind}:${r.state}:${r.name}`,
      ),
    );
    expect(names.has("city:TX:Austin")).toBe(false); // Austin now has sourced city rules
    expect(names.has("city:MN:Minneapolis")).toBe(false); // has rules
  });

  it("still lists the unseeded places", () => {
    expect(findMissing({ cities: 1, counties: 1 }).cities).toHaveLength(1);
    expect(findMissing({ cities: 0, counties: 1 }).counties).toEqual([]);
  });
});
