import { describe, expect, it } from "vitest";
import { evaluate } from "../src";

describe("state rule provenance", () => {
  it("marks formation data as checked from the state's verification record", () => {
    const items = evaluate({
      entityType: "llc",
      state: "NY",
      zip: "10001",
      city: "New York",
      county: "New York",
      isFormed: false,
      hasSignage: true,
    }).items;
    const item = items.find((entry) => entry.id === "state.formation:NY");
    expect(item?.provenance?.confidence).toBe("checked");
    expect(item?.provenance?.checkedOn).toBe("2026-10-13");
    expect(items.find((entry) => entry.id === "state.llc-publication:NY")?.url).toEqual([
      "https://dos.ny.gov/form-corporation-or-business",
    ]);
    const local = items.find((entry) => entry.id === "local.business-license:NY");
    expect(local?.provenance?.confidence).toBe("checked");
    expect(local?.url).toEqual(items.find((entry) => entry.id === "local.certificate-of-occupancy:NY")?.url);
    expect(items.find((entry) => entry.id === "local.sign-permit:NY")?.url).toEqual(local?.url);

    const albanyItems = evaluate({
      entityType: "llc",
      state: "NY",
      zip: "12207",
      city: "Albany",
      county: "Albany",
      isFormed: false,
    }).items;
    expect(albanyItems.find((entry) => entry.id === "local.business-license:NY")?.url).toEqual(local?.url);
  });
});
