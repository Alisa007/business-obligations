import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, relativeDays, todayIso } from "./format";

describe("formatting", () => {
  it("formats calendar dates in the given locale without shifting the day", () => {
    expect(formatDate("2027-01-31", "en")).toBe("Jan 31, 2027");
    expect(formatDate("2027-03-01", "en")).toBe("Mar 1, 2027");
    expect(formatDate("2027-01-31", "de-DE")).toMatch(/^31\. Jan\.? 2027$/);
    expect(formatDate("2027-01-31", "es")).toMatch(/31 ene 2027/);
  });

  it("passes through anything that is not an ISO date", () => {
    expect(formatDate("April 15")).toBe("April 15");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("2027-13-45x")).toBe("2027-13-45x");
  });

  it("writes US dollars the US way, with cents only when there are some", () => {
    expect(formatMoney(1272, "en")).toBe("$1,272");
    expect(formatMoney(12.345, "en")).toBe("$12.35");
    expect(formatMoney(4.5, "es")).toBe("$4.50");
    expect(formatMoney(0)).toBe("$0");
  });

  it("says how far a date is from another", () => {
    expect(relativeDays("2026-10-20", "2026-10-13", "en")).toMatch(/7 days|in 1 week/);
    expect(relativeDays("2026-10-14", "2026-10-13", "en")).toBe("tomorrow");
    expect(relativeDays("soon", "2026-10-13")).toBe("");
    expect(relativeDays("2026-10-13", undefined)).toBe("");
  });

  it("knows today as the local calendar date", () => {
    expect(todayIso(new Date(2026, 9, 5, 23, 30))).toBe("2026-10-05");
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
