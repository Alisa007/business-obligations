import { describe, expect, it } from "vitest";
import { DISCLAIMER, evaluate, getComplianceItems, listRules, InvalidProfileError } from "../src";
import { lookupZip, withZip } from "../src/zip-entry";

const base = { city: "Springfield", county: "Greene", zip: "65801" } as const;
const titles = (items: { title: string }[]) => items.map((i) => i.title);

describe("evaluate envelope", () => {
  it("returns items, resolved profile, disclaimer and data version", () => {
    const r = evaluate({ ...base, entityType: "llc" }, { asOf: "2026-10-12" });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.profile.state).toBe("MO");
    expect(r.asOf).toBe("2026-10-12");
    expect(r.disclaimer).toBe(DISCLAIMER);
    expect(r.dataVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rejects bad dates and unsupported countries", () => {
    expect(() => evaluate({ ...base, entityType: "llc" }, { asOf: "tomorrow" })).toThrow(InvalidProfileError);
    // @ts-expect-error unsupported country
    expect(() => evaluate({ ...base, entityType: "llc", country: "CA" })).toThrow(/Unsupported country/);
    expect(() => evaluate({ ...base, entityType: "llc", formationDate: "01/02/2020" })).toThrow(
      /formationDate/,
    );
    expect(() => evaluate({ ...base, entityType: "llc", fiscalYearEndMonth: 13 })).toThrow(
      /fiscalYearEndMonth/,
    );
  });
});

describe("rule introspection", () => {
  it("lists rules with unique ids and declared inputs", () => {
    const rules = listRules();
    expect(new Set(rules.map((r) => r.id)).size).toBe(rules.length);
    for (const r of rules) {
      expect(r.description.length).toBeGreaterThan(5);
      expect(r.inputs.length).toBeGreaterThan(0);
    }
  });
});

describe("entity types", () => {
  const run = (entityType: Parameters<typeof getComplianceItems>[0]["entityType"], extra = {}) =>
    titles(
      getComplianceItems({ ...base, entityType, formationState: "DE", ...extra }, { asOf: "2026-10-12" }),
    );

  it("PLLC follows LLC reporting and adds a licensing-board item", () => {
    const t = run("pllc", { profession: "attorney" });
    expect(t.some((x) => x.includes("Delaware") && x.includes("LLC annual tax"))).toBe(true);
    expect(t.some((x) => x.includes("licensing board (attorney)"))).toBe(true);
  });

  it("LP files as a partnership", () => {
    const items = getComplianceItems({ ...base, entityType: "lp" });
    expect(items.find((i) => i.id === "fed.income-tax-return")?.title).toMatch(/1065/);
    expect(titles(items).some((x) => x.includes("registered agent"))).toBe(true);
  });

  it("professional corporation and benefit corporation behave as corporations", () => {
    expect(
      getComplianceItems({ ...base, entityType: "pc" }).find((i) => i.id === "fed.income-tax-return")?.title,
    ).toMatch(/1120$/);
    expect(
      getComplianceItems({ ...base, entityType: "pc", sCorpElection: true }).find(
        (i) => i.id === "fed.income-tax-return",
      )?.title,
    ).toMatch(/1120-S/);
    expect(run("benefit_corp").some((x) => x.includes("benefit report"))).toBe(true);
  });
});

describe("paid sick leave and notices", () => {
  it("applies state mandates by employee count", () => {
    const has = (zip: string, n: number) =>
      titles(getComplianceItems({ ...base, zip, entityType: "llc", employeeCount: n })).some((t) =>
        t.includes("paid sick leave"),
      );
    expect(has("85001", 1)).toBe(true); // AZ
    expect(has("06103", 24)).toBe(false); // CT needs 25
    expect(has("06103", 25)).toBe(true);
    expect(has("65801", 50)).toBe(false); // MO: none
  });

  it("returns workplace notices once employees exist", () => {
    const items = getComplianceItems({ ...base, entityType: "llc", employeeCount: 1 });
    expect(titles(items)).toEqual(
      expect.arrayContaining([
        "Display required federal labor law posters",
        "Display required Missouri workplace notices",
      ]),
    );
  });
});

describe("seeded cities", () => {
  it("returns San Francisco items based on profile", () => {
    const items = getComplianceItems({
      entityType: "llc",
      zip: "94105",
      city: "San Francisco",
      county: "San Francisco",
      employeeCount: 2,
    });
    const t = titles(items);
    expect(t).toContain("Renew San Francisco Business Registration Certificate");
    expect(t).toContain("File San Francisco payroll expense tax return");
    const noEmp = titles(
      getComplianceItems({ entityType: "llc", zip: "94105", city: "San Francisco", county: "San Francisco" }),
    );
    expect(noEmp).not.toContain("File San Francisco payroll expense tax return");
  });

  it("NYC UBT applies to unincorporated, BCT to corporations", () => {
    const run = (entityType: "sole_proprietorship" | "c_corp") =>
      titles(getComplianceItems({ entityType, zip: "10001", city: "New York", county: "New York" }));
    expect(run("sole_proprietorship").some((t) => t.includes("Unincorporated Business Tax"))).toBe(true);
    expect(run("c_corp").some((t) => t.includes("Business Corporation Tax"))).toBe(true);
    expect(run("c_corp").some((t) => t.includes("Unincorporated Business Tax"))).toBe(false);
  });
});

describe("zip lookup subpath", () => {
  it("resolves city, county and state", () => {
    expect(lookupZip("94105")).toMatchObject({ state: "CA" });
    expect(lookupZip("10001")).toMatchObject({ city: "New York", state: "NY" });
    expect(lookupZip("00000")).toBeUndefined();
  });

  it("withZip fills missing fields and lets explicit values win", () => {
    const p = withZip({ entityType: "llc", zip: "60601" });
    expect(p).toMatchObject({ city: "Chicago", state: "IL" });
    expect(withZip({ entityType: "llc", zip: "60601", city: "Loop" }).city).toBe("Loop");
    expect(() => withZip({ entityType: "llc", zip: "00000" })).toThrow(/Unknown ZIP/);
    expect(getComplianceItems(withZip({ entityType: "llc", zip: "60601" })).length).toBeGreaterThan(5);
  });
});
