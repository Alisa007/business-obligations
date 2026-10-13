import { describe, expect, it } from "vitest";
import * as lib from "../src";
// @ts-expect-error plain JS module
import { analyze, buildProfile, formatDate, hostOf, link, money, safeUrl } from "../site/app.js";

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

describe("playground formatting", () => {
  it("formats calendar dates in the given locale without shifting the day", () => {
    expect(formatDate("2027-01-31", "en-US")).toBe("Jan 31, 2027");
    expect(formatDate("2027-01-31", "de-DE")).toBe("31.01.2027");
    expect(formatDate("2027-03-01", "en-US")).toBe("Mar 1, 2027");
  });

  it("passes through anything that is not an ISO date", () => {
    expect(formatDate("April 15")).toBe("April 15");
    expect(formatDate(undefined)).toBe("");
  });

  it("formats dollars per locale", () => {
    expect(money(1272, "en-US")).toBe("$1,272");
    expect(money(12.345, "en-US")).toBe("$12.35");
  });

  it("links only http(s) urls and escapes text", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://example.gov/page")).toBe("https://example.gov/page");
    expect(link("https://example.gov/a?b=1&c=2", "Fees <b>")).toBe(
      '<a href="https://example.gov/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">Fees &lt;b&gt;</a>',
    );
    expect(link(undefined, "<x>")).toBe("&lt;x&gt;");
    expect(hostOf("https://www.irs.gov/businesses")).toBe("irs.gov");
  });
});
