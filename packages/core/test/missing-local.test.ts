import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS module
import { findMissing, findUnverified } from "../scripts/missing-local.mjs";

describe("findUnverified", () => {
  it("lists only unverified entries, oldest check first", () => {
    const rows = findUnverified({ count: 40 });
    expect(rows).toHaveLength(40);
    for (const r of rows) expect(["city", "county"]).toContain(r.kind);
    const dates = rows.map((r: { checkedOn: string }) => r.checkedOn);
    expect([...dates].sort()).toEqual(dates);
  });

  it("returns nothing when no revisit is asked for, and honours the state filter", () => {
    expect(findUnverified({ count: 0 })).toEqual([]);
    const tx = findUnverified({ count: 5, state: "TX" });
    expect(tx.length).toBe(5);
    expect(tx.every((r: { state: string }) => r.state === "TX")).toBe(true);
  });

  it("never lists settled entries", () => {
    const names = new Set(
      findUnverified({ count: 1000 }).map(
        (r: { kind: string; state: string; name: string }) => `${r.kind}:${r.state}:${r.name}`,
      ),
    );
    expect(names.has("city:TX:Austin")).toBe(true); // Austin is still unverified
    expect(names.has("city:MN:Minneapolis")).toBe(false); // has rules
  });

  it("still lists the unseeded places", () => {
    expect(findMissing({ cities: 1, counties: 1 }).cities).toHaveLength(1);
  });
});
