import { describe, expect, it } from "vitest";
import * as lib from "../src";
// @ts-expect-error plain JS module
import { analyze, buildProfile } from "../site/app.js";

const form = {
  zip: "60601",
  entityType: "llc",
  industry: "restaurant",
  profession: "",
  employees: "3",
  payroll: "90000",
  revenue: "250000",
  owners: "1",
  sellsGoods: true,
  homeBased: false,
  tradeName: false,
  isNew: true,
  formationDate: "",
};
const place = { city: "Chicago", county: "Cook", state: "IL" };

describe("playground logic", () => {
  it("builds a profile from form values", () => {
    const p = buildProfile(form, place);
    expect(p).toMatchObject({
      entityType: "llc",
      zip: "60601",
      city: "Chicago",
      employeeCount: 3,
      industry: "restaurant",
    });
    expect(p.formationDate).toBeUndefined();
    expect(p.profession).toBeUndefined();
  });

  it("asks for a profession only for professional entities", () => {
    expect(buildProfile({ ...form, entityType: "pllc", profession: "attorney" }, place).profession).toBe(
      "attorney",
    );
    expect(buildProfile({ ...form, entityType: "pllc", profession: "" }, place).profession).toBe("other");
  });

  it("produces every view without errors", () => {
    const d = analyze(lib, buildProfile(form, place), { asOf: "2026-10-13", isNew: true });
    expect(d.plan.steps.length).toBeGreaterThan(5);
    expect(d.result.items.length).toBeGreaterThan(5);
    expect(d.ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(d.costs.currency).toBe("USD");
    expect(Array.isArray(d.analysis.sensitivity)).toBe(true);
  });
});
