import { describe, expect, it } from "vitest";
import { dueToRRule, getComplianceItems, nextDueDate } from "../src";

const base = { city: "Austin", county: "Travis", zip: "78701" } as const;

describe("nextDueDate", () => {
  it("fixed annual dates roll to next year once passed", () => {
    const due = { type: "fixed", month: 4, day: 15 } as const;
    expect(nextDueDate(due, { asOf: "2026-01-10", biennial: false })).toBe("2026-04-15");
    expect(nextDueDate(due, { asOf: "2026-04-15", biennial: false })).toBe("2026-04-15");
    expect(nextDueDate(due, { asOf: "2026-04-16", biennial: false })).toBe("2027-04-15");
  });

  it("parity restricts biennial filings", () => {
    const due = { type: "fixed", month: 4, day: 1, parity: "odd" } as const;
    expect(nextDueDate(due, { asOf: "2026-01-01", biennial: true })).toBe("2027-04-01");
    expect(nextDueDate(due, { asOf: "2027-04-02", biennial: true })).toBe("2029-04-01");
  });

  it("five-year cycles fall on the fifth anniversary and every fifth year after", () => {
    const due = { type: "anniversary", point: "date" } as const;
    const ctx = { asOf: "2026-10-12", biennial: false, intervalYears: 5, formationDate: "2023-05-01" };
    expect(nextDueDate(due, ctx)).toBe("2028-05-01");
    expect(nextDueDate(due, { ...ctx, asOf: "2028-05-02" })).toBe("2033-05-01");
    expect(nextDueDate(due, { ...ctx, formationDate: undefined })).toBeUndefined();
  });

  it("biennial cycles anchored to formation year need formationDate", () => {
    const due = { type: "fixed", month: 4, day: 15, cycleFrom: "formation_year" } as const;
    expect(nextDueDate(due, { asOf: "2026-10-12", biennial: true })).toBeUndefined();
    expect(nextDueDate(due, { asOf: "2026-10-12", biennial: true, formationDate: "2023-05-01" })).toBe(
      "2027-04-15",
    );
  });

  it("multi picks the earliest upcoming date", () => {
    const due = {
      type: "multi",
      dates: [
        { month: 4, day: 15 },
        { month: 6, day: 15 },
        { month: 9, day: 15 },
        { month: 1, day: 15 },
      ],
    } as const;
    expect(nextDueDate(due, { asOf: "2026-05-01", biennial: false })).toBe("2026-06-15");
    expect(nextDueDate(due, { asOf: "2026-10-01", biennial: false })).toBe("2027-01-15");
  });

  it("anniversary dates use formationDate and first fall due the year after", () => {
    const due = { type: "anniversary", point: "end_of_month" } as const;
    expect(nextDueDate(due, { asOf: "2026-01-01", biennial: false })).toBeUndefined();
    expect(nextDueDate(due, { asOf: "2026-01-01", biennial: false, formationDate: "2026-02-10" })).toBe(
      "2027-02-28",
    );
    expect(nextDueDate(due, { asOf: "2026-03-01", biennial: false, formationDate: "2024-02-10" })).toBe(
      "2027-02-28",
    );
  });
});

describe("nextDue on items", () => {
  it("is computed for federal returns using the fiscal year end", () => {
    const get = (fye?: number) =>
      getComplianceItems(
        { ...base, entityType: "c_corp", fiscalYearEndMonth: fye },
        { asOf: "2026-10-12" },
      ).find((i) => i.id === "fed.income-tax-return")!;
    expect(get().nextDue).toBe("2027-04-15");
    expect(get(6).nextDue).toBe("2026-10-15");
  });

  it("uses asOf and formationDate for state reports", () => {
    const items = getComplianceItems(
      { ...base, entityType: "llc", state: "FL", formationDate: "2020-01-01" },
      { asOf: "2026-10-12" },
    );
    expect(items.find((i) => i.id.startsWith("state.annual-report:FL"))?.nextDue).toBe("2027-05-01");
  });
});

describe("dueToRRule", () => {
  it("writes annual fixed dates as iCalendar rules", () => {
    expect(dueToRRule({ type: "fixed", month: 5, day: 15 }, "annual")).toBe(
      "FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=15",
    );
    expect(dueToRRule({ type: "fixed", month: 2, day: 29 }, "annual")).toBe(
      "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1",
    );
    expect(
      dueToRRule(
        {
          type: "multi",
          dates: [
            { month: 4, day: 15 },
            { month: 10, day: 15 },
          ],
        },
        "annual",
      ),
    ).toBe("FREQ=YEARLY;BYMONTH=4,10;BYMONTHDAY=15");
  });

  it("returns nothing for rules a bare RRULE cannot express", () => {
    expect(dueToRRule({ type: "fixed", month: 5, day: 15, parity: "odd" }, "annual")).toBeUndefined();
    expect(dueToRRule({ type: "fixed", month: 5, day: 15 }, "biennial")).toBeUndefined();
    expect(dueToRRule({ type: "anniversary", point: "date" }, "annual")).toBeUndefined();
    expect(dueToRRule({ type: "date", date: "2027-01-01" }, "once")).toBeUndefined();
    expect(
      dueToRRule(
        {
          type: "multi",
          dates: [
            { month: 4, day: 15 },
            { month: 10, day: 1 },
          ],
        },
        "annual",
      ),
    ).toBeUndefined();
  });
});
