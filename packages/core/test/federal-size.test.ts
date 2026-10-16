import { describe, expect, it } from "vitest";
import { evaluate, type BusinessProfile } from "../src";

const base = (employeeCount: number, extra: Partial<BusinessProfile> = {}): BusinessProfile => ({
  entityType: "llc",
  zip: "78701",
  city: "Austin",
  county: "Travis",
  state: "TX",
  employeeCount,
  ...extra,
});
const titles = (p: BusinessProfile) =>
  evaluate(p, { asOf: "2026-10-16" })
    .items.filter((i) => /^fed\.(aca|eeo1|osha)/.test(i.ruleId))
    .map((i) => i.title);

describe("size-triggered federal filings", () => {
  it("adds nothing for a small employer", () => {
    expect(titles(base(8))).toEqual([]);
  });

  it("starts OSHA recordkeeping above 10 employees", () => {
    expect(titles(base(11))).toEqual([
      "Keep OSHA injury and illness records and post the annual summary (Form 300A)",
    ]);
  });

  it("adds ACA reporting at 50 full-time employees", () => {
    expect(titles(base(60, { fullTimeEmployeeCount: 40 })).some((t) => /1095-C/.test(t))).toBe(false);
    const t = titles(base(60, { fullTimeEmployeeCount: 55 }));
    expect(t).toContain("Furnish Form 1095-C to full-time employees");
    expect(t).toContain("File Forms 1094-C and 1095-C with the IRS");
  });

  it("adds EEO-1 at 100 employees and electronic OSHA submission at 250", () => {
    expect(titles(base(99)).some((t) => /EEO-1/.test(t))).toBe(false);
    expect(titles(base(100)).some((t) => /EEO-1/.test(t))).toBe(true);
    expect(titles(base(249)).some((t) => /electronically/.test(t))).toBe(false);
    expect(titles(base(250)).some((t) => /electronically/.test(t))).toBe(true);
  });

  it("dates the ACA filing for early March and the end of March", () => {
    const items = evaluate(base(60), { asOf: "2026-10-16" }).items;
    expect(items.find((i) => i.title.startsWith("Furnish Form 1095-C"))?.nextDue).toBe("2027-03-01");
    expect(items.find((i) => i.title.startsWith("File Forms 1094-C"))?.nextDue).toBe("2027-03-31");
  });
});
