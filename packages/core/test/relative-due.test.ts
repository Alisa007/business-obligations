import { describe, expect, it } from "vitest";
import { nextDueDate, occurrencesBetween } from "../src/dates";
import { describeSchedule, parseRRule, toRRule } from "../src/rrule";

const due = (rrule: string, anchor?: string) => parseRRule(rrule, anchor);

describe("a due date counted from a reference date", () => {
  it("reads the license anniversary, and the days and months counted from it", () => {
    expect(due("FREQ=YEARLY", "license_issued")).toEqual({
      due: { type: "relative", from: "license_issued" },
      frequency: "annual",
    });
    expect(due("FREQ=YEARLY;BYMONTHDAY=-1;X-MONTHS=1", "license_issued").due).toEqual({
      type: "relative",
      from: "license_issued",
      day: -1,
      monthsAfter: 1,
    });
    expect(due("FREQ=YEARLY;BYMONTHDAY=20;X-MONTHS=1", "license_issued").due).toMatchObject({
      day: 20,
      monthsAfter: 1,
    });
    expect(due("FREQ=YEARLY;BYMONTHDAY=31;X-DAYS=30", "license_issued").due).toMatchObject({ daysAfter: 30 });
    expect(due("FREQ=YEARLY;BYMONTHDAY=15", "formation").due).toEqual({
      type: "relative",
      from: "formation",
      day: 15,
    });
    expect(due("FREQ=YEARLY;INTERVAL=3", "license_issued").frequency).toBe("every_three_years");
  });

  it("reads the fiscal year, which needs its day", () => {
    expect(due("FREQ=YEARLY;BYMONTHDAY=15;X-MONTHS=3", "fiscal_year_start").due).toEqual({
      type: "relative",
      from: "fiscal_year_start",
      day: 15,
      monthsAfter: 3,
    });
    expect(due("FREQ=YEARLY;BYMONTHDAY=15;X-MONTHS=5", "fiscal_year_end").due).toMatchObject({
      from: "fiscal_year_end",
    });
    expect(() => due("FREQ=YEARLY", "fiscal_year_start")).toThrow();
    expect(() => due("FREQ=YEARLY;X-MONTHS=3", "license_issued")).toThrow(); // months after what day?
  });

  it("reads a date the agency announces or assigns, and nothing else with it", () => {
    expect(due("FREQ=YEARLY", "announced").due).toEqual({ type: "relative", from: "announced" });
    expect(due("FREQ=YEARLY", "assigned").due).toEqual({ type: "relative", from: "assigned" });
    expect(() => due("FREQ=YEARLY;BYMONTHDAY=15", "announced")).toThrow();
    expect(() => due("FREQ=YEARLY;X-DAYS=5", "assigned")).toThrow();
  });

  it("reads the months of a cycle whose day the agency sets", () => {
    const monthly = due("FREQ=YEARLY;BYMONTH=1,2,3,4,5,6,7,8,9,10,11,12", "assigned");
    expect(monthly).toEqual({ due: { type: "relative", from: "assigned" }, frequency: "monthly" });
    expect(due("FREQ=YEARLY;BYMONTH=1,4,7,10", "assigned").frequency).toBe("quarterly");
    expect(toRRule(monthly.due, monthly.frequency)).toEqual({
      rrule: "FREQ=YEARLY;BYMONTH=1,2,3,4,5,6,7,8,9,10,11,12",
      anchor: "assigned",
    });
    expect(() => due("FREQ=YEARLY;BYMONTH=1,4,7,10")).toThrow(); // months without a day, and nobody who sets it
    expect(() => due("FREQ=YEARLY;BYMONTH=1,4,7", "assigned")).toThrow(); // not a cycle
  });

  it("never reads a recurrence that gives no date", () => {
    for (const rule of ["FREQ=YEARLY", "FREQ=YEARLY;INTERVAL=2", "FREQ=MONTHLY", "FREQ=MONTHLY;INTERVAL=3"])
      expect(() => due(rule), rule).toThrow();
    expect(() => due("FREQ=YEARLY", "somewhere")).toThrow();
    // the formation anniversary is a date
    expect(due("FREQ=YEARLY", "formation").due).toEqual({ type: "anniversary", point: "date" });
  });

  it("round-trips through the rule", () => {
    for (const [rule, anchor] of [
      ["FREQ=YEARLY", "license_issued"],
      ["FREQ=YEARLY;BYMONTHDAY=-1;X-MONTHS=1", "license_issued"],
      ["FREQ=YEARLY;BYMONTHDAY=31;X-DAYS=30", "license_issued"],
      ["FREQ=YEARLY;BYMONTHDAY=15;X-MONTHS=3", "fiscal_year_start"],
      ["FREQ=YEARLY;BYMONTHDAY=15;X-MONTHS=5", "fiscal_year_end"],
      ["FREQ=YEARLY;INTERVAL=3", "license_issued"],
      ["FREQ=YEARLY", "announced"],
    ] as const) {
      const s = due(rule, anchor);
      expect(toRRule(s.due, s.frequency), rule).toEqual({ rrule: rule, anchor });
    }
  });

  it("says each in words", () => {
    const text = (rule: string, anchor: string) => describeSchedule(due(rule, anchor));
    expect(text("FREQ=YEARLY", "license_issued")).toBe("On the anniversary of the license date");
    expect(text("FREQ=YEARLY;BYMONTHDAY=-1;X-MONTHS=1", "license_issued")).toBe(
      "Last day of the month after the license anniversary month",
    );
    expect(text("FREQ=YEARLY;BYMONTHDAY=20;X-MONTHS=1", "license_issued")).toBe(
      "Day 20 of the month after the license anniversary month",
    );
    expect(text("FREQ=YEARLY;BYMONTHDAY=31;X-DAYS=30", "license_issued")).toBe(
      "30 days after: day 31 of the license anniversary month",
    );
    expect(text("FREQ=YEARLY;BYMONTHDAY=15;X-MONTHS=3", "fiscal_year_start")).toBe(
      "Day 15 of month 4 of the tax year",
    );
    expect(text("FREQ=YEARLY;BYMONTHDAY=15;X-MONTHS=5", "fiscal_year_end")).toBe(
      "Day 15 of month 5 after the fiscal year ends",
    );
    expect(text("FREQ=YEARLY;INTERVAL=3", "license_issued")).toBe(
      "On the anniversary of the license date, every third year",
    );
    expect(text("FREQ=YEARLY", "announced")).toBe("Date the agency announces each year");
    expect(text("FREQ=YEARLY", "assigned")).toBe("Date the agency sets for you");
  });

  it("finds the date from the reference date the business gives", () => {
    const tax = due("FREQ=YEARLY;BYMONTHDAY=15;X-MONTHS=3", "fiscal_year_start").due!;
    expect(nextDueDate(tax, { asOf: "2026-10-19", biennial: false })).toBe("2027-04-15"); // calendar year: April 15
    expect(nextDueDate(tax, { asOf: "2026-01-01", biennial: false })).toBe("2026-04-15");
    // a fiscal year ending in June starts in July: its 4th month is October
    expect(nextDueDate(tax, { asOf: "2026-01-01", biennial: false, fiscalYearEndMonth: 6 })).toBe(
      "2026-10-15",
    );

    const report = due("FREQ=YEARLY;BYMONTHDAY=15;X-MONTHS=5", "fiscal_year_end").due!; // 15th of the 5th month after year end
    expect(nextDueDate(report, { asOf: "2026-01-01", biennial: false })).toBe("2026-05-15");
    expect(nextDueDate(report, { asOf: "2026-01-01", biennial: false, fiscalYearEndMonth: 9 })).toBe(
      "2026-02-15",
    );

    const license = due("FREQ=YEARLY;BYMONTHDAY=-1;X-MONTHS=1", "license_issued").due!;
    expect(nextDueDate(license, { asOf: "2026-10-19", biennial: false, licenseIssuedOn: "2025-01-10" })).toBe(
      "2027-02-28",
    );
    const within30 = due("FREQ=YEARLY;X-DAYS=30", "license_issued").due!;
    expect(() => due("FREQ=YEARLY;X-DAYS=30", "license_issued")).not.toThrow();
    expect(
      nextDueDate(within30, { asOf: "2026-10-19", biennial: false, licenseIssuedOn: "2024-12-31" }),
    ).toBe("2027-01-30");

    const formed = due("FREQ=YEARLY;BYMONTHDAY=15", "formation").due!;
    expect(nextDueDate(formed, { asOf: "2026-10-19", biennial: false, formationDate: "2023-03-02" })).toBe(
      "2027-03-15",
    );
  });

  it("gives no date without the reference, and none for a date only the agency knows", () => {
    const license = due("FREQ=YEARLY", "license_issued").due!;
    expect(nextDueDate(license, { asOf: "2026-10-19", biennial: false })).toBeUndefined();
    for (const from of ["announced", "assigned"] as const)
      expect(
        nextDueDate(
          { type: "relative", from },
          { asOf: "2026-10-19", biennial: false, licenseIssuedOn: "2025-01-10" },
        ),
      ).toBeUndefined();
  });

  it("lists every occurrence in a window, a cycle of three years included", () => {
    const license = due("FREQ=YEARLY;INTERVAL=3", "license_issued");
    expect(
      occurrencesBetween(
        license.due!,
        { licenseIssuedOn: "2020-06-15", intervalYears: 3 },
        "2026-01-01",
        "2034-12-31",
      ),
    ).toEqual(["2026-06-15", "2029-06-15", "2032-06-15"]);
    const tax = due("FREQ=YEARLY;BYMONTHDAY=15;X-MONTHS=3", "fiscal_year_start").due!;
    expect(occurrencesBetween(tax, {}, "2026-01-01", "2028-12-31")).toEqual([
      "2026-04-15",
      "2027-04-15",
      "2028-04-15",
    ]);
  });
});
