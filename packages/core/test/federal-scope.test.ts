import { describe, expect, it } from "vitest";
import { analyzeInputs, buildCalendar, evaluate, InvalidProfileError, planLaunch } from "../src";

const noPlace = { entityType: "llc" as const, employeeCount: 2 };
const asOf = "2026-06-01";

describe("federal scope", () => {
  it("needs no place and returns only federal items", () => {
    const result = evaluate(noPlace, { asOf, scope: "federal" });
    expect(result.items.length).toBeGreaterThan(0);
    expect(new Set(result.items.map((item) => item.jurisdiction))).toEqual(new Set(["federal"]));
    expect(result.profile.state).toBe("");
  });

  it("still requires a place without the scope", () => {
    expect(() => evaluate(noPlace, { asOf })).toThrow(InvalidProfileError);
  });

  it("matches the federal items of a full evaluation", () => {
    const place = { ...noPlace, zip: "94105", city: "San Francisco", county: "San Francisco" };
    const full = evaluate(place, { asOf }).items.filter((item) => item.jurisdiction === "federal");
    const federal = evaluate(place, { asOf, scope: "federal" }).items;
    expect(federal.map((item) => item.id)).toEqual(full.map((item) => item.id));
  });

  it("applies to the launch plan, the calendar and the input analysis", () => {
    expect(() => planLaunch(noPlace, { startDate: asOf, scope: "federal" })).not.toThrow();
    expect(() => buildCalendar(noPlace, { from: asOf, scope: "federal" })).not.toThrow();
    expect(() => analyzeInputs(noPlace, { asOf, scope: "federal" })).not.toThrow();
  });
});
