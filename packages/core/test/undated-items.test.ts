import { describe, expect, it } from "vitest";
import { evaluate } from "../src";

const nextDue = (profile: Parameters<typeof evaluate>[0], idPrefix: string) =>
  evaluate(profile, { asOf: "2026-10-16" }).items.find((i) => i.id.startsWith(idPrefix))?.nextDue;

describe("items whose deadline used to be text only", () => {
  const llc = { entityType: "llc", formationDate: "2024-03-01" } as const;

  it("Birmingham AL licenses expire December 31", () => {
    const p = { ...llc, zip: "35203", city: "Birmingham", county: "Jefferson" };
    expect(nextDue(p, "local.seeded-city:AL")).toBe("2026-12-31");
  });

  it("Bernalillo County NM personal property returns are due the last day of February", () => {
    const p = { ...llc, zip: "87101", city: "Albuquerque", county: "Bernalillo" };
    expect(nextDue(p, "local.seeded-county:NM")).toBe("2027-02-28");
  });

  it("the CA LLC statement of information is due at the end of the anniversary month, every two years", () => {
    const p = { ...llc, zip: "94105", city: "San Francisco", county: "San Francisco" };
    expect(nextDue(p, "state.annual-report:CA")).toBe("2028-03-31");
  });
});
