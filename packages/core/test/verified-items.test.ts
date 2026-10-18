import { describe, expect, it } from "vitest";
import verified from "../data/verified-items.json";
import { evaluate } from "../src";

describe("data/verified-items.json", () => {
  const entries = Object.entries(verified as Record<string, { checkedOn: string; sources: string[] }>);

  it("keys are rule item ids, with a date and official https sources", () => {
    for (const [id, v] of entries) {
      expect(id, id).toMatch(/^(fed|state|local)\.[a-z0-9-]+(:[A-Z]{2})?(#\d+)?$/);
      expect(v.checkedOn, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(v.sources.length, id).toBeGreaterThan(0);
      for (const url of v.sources) expect(url, id).toMatch(/^https:\/\/[^\s]+$/);
    }
  });

  it("marks a listed item as checked", () => {
    const item = evaluate({
      entityType: "llc",
      state: "DE",
      zip: "19901",
      city: "Dover",
      county: "Kent",
    }).items.find((i) => i.id in verified);
    if (item) expect(item.provenance?.confidence).toBe("checked");
  });
});
