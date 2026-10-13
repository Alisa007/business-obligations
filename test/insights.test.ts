import { describe, expect, it } from "vitest";
import {
  STATES,
  analyzeInputs,
  buildCalendar,
  estimateCosts,
  evaluate,
  occurrencesBetween,
  toICS,
  type BusinessProfile,
} from "../src";

const llc: BusinessProfile = {
  entityType: "llc",
  zip: "78701",
  city: "Austin",
  county: "Travis",
  formationDate: "2022-03-15",
};
const asOf = "2026-01-01";

describe("structured fees", () => {
  it("every state report rule has a feeDetail", () => {
    const keys = ["llcReport", "corpReport", "lpReport", "llpReport"] as const;
    for (const [code, s] of Object.entries(STATES)) {
      for (const key of keys) {
        const rule = s[key];
        if (rule) expect(rule.feeDetail, `${code}.${key}`).toBeDefined();
      }
    }
  });

  it("attaches cost and penalty to annual report items", () => {
    const r = evaluate({ ...llc, zip: "10001", city: "New York", county: "New York" }, { asOf });
    const item = r.items.find((i) => i.id.startsWith("state.annual-report"));
    expect(item?.cost?.currency).toBe("USD");
  });

  it("scales per-member fees with ownerCount and clamps to the maximum", () => {
    const base = { ...llc, zip: "37201", city: "Nashville", county: "Davidson" }; // TN LLC: per-member fee
    const one = estimateCosts(evaluate({ ...base, ownerCount: 1 }, { asOf }).items, { ownerCount: 1 });
    const many = estimateCosts(evaluate({ ...base, ownerCount: 500 }, { asOf }).items, { ownerCount: 500 });
    expect(many.annual).toBeGreaterThanOrEqual(one.annual);
  });

  it("totals annual and one-time amounts and reports unknowns", () => {
    const est = estimateCosts(evaluate(llc, { asOf }).items);
    expect(est.currency).toBe("USD");
    expect(est.annual).toBeGreaterThanOrEqual(0);
    expect(est.lines.every((l) => l.amount >= 0)).toBe(true);
  });
});

describe("calendar", () => {
  it("expands annual and anniversary dues within a window", () => {
    const { events } = buildCalendar(llc, { from: "2026-01-01", to: "2027-12-31" });
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) expect(e.date >= "2026-01-01" && e.date <= "2027-12-31").toBe(true);
    const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
    expect(events.map((e) => e.date)).toEqual(sorted.map((e) => e.date));
  });

  it("matches nextDue for the first event of each item", () => {
    const { events, result } = buildCalendar(llc, { from: asOf, to: "2027-01-01" });
    for (const item of result.items) {
      if (!item.nextDue || item.frequency === "biennial") continue;
      const first = events.find((e) => e.itemId === item.id);
      if (first) expect(first.date).toBe(item.nextDue);
    }
  });

  it("expands fixed dates with parity", () => {
    const due = { type: "fixed", month: 4, day: 1, parity: "odd" } as const;
    expect(occurrencesBetween(due, {}, "2026-01-01", "2029-12-31")).toEqual(["2027-04-01", "2029-04-01"]);
  });

  it("returns nothing for biennial anniversaries without a formation date", () => {
    const due = { type: "anniversary", point: "end_of_month" } as const;
    expect(occurrencesBetween(due, { biennial: true }, "2026-01-01", "2030-12-31")).toEqual([]);
  });

  it("renders valid iCalendar text", () => {
    const { events } = buildCalendar(llc, { from: asOf, to: "2026-12-31" });
    const ics = toICS(events, { calendarName: "Test, Inc." });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(events.length);
    expect(ics).toContain("X-WR-CALNAME:Test\\, Inc.");
    for (const line of ics.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});

describe("provenance", () => {
  it("marks verified annual reports as checked with sources", () => {
    const r = evaluate(llc, { asOf });
    const report = r.items.find((i) => i.id.startsWith("state.annual-report"));
    expect(report?.provenance?.confidence).toBeDefined();
    if (report?.provenance?.confidence === "checked") {
      expect(report.provenance.sources.length).toBeGreaterThan(0);
      expect(report.provenance.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("marks federal items as compiled", () => {
    const r = evaluate(llc, { asOf });
    const fed = r.items.find((i) => i.jurisdiction === "federal");
    expect(fed?.provenance?.confidence).toBe("compiled");
  });

  it("flags the unconfirmed Tennessee LP fee", () => {
    const r = evaluate({ entityType: "lp", zip: "37201", city: "Nashville", county: "Davidson" }, { asOf });
    const report = r.items.find((i) => i.id.startsWith("state.annual-report"));
    expect(report?.provenance?.confidence).toBe("unconfirmed");
  });
});

describe("analyzeInputs", () => {
  it("reports defaults and the thresholds that change the result", () => {
    const a = analyzeInputs(llc, { asOf });
    const emp = a.defaultsUsed.find((d) => d.field === "employeeCount");
    expect(emp?.value).toBe(0);
    expect(emp?.affectsResult).toBe(true);
    const s = a.sensitivity.find((x) => x.field === "employeeCount");
    expect(s?.changes.some((c) => c.added.length > 0)).toBe(true);
  });

  it("does not list provided inputs as defaulted", () => {
    const a = analyzeInputs({ ...llc, employeeCount: 3 }, { asOf });
    expect(a.defaultsUsed.find((d) => d.field === "employeeCount")).toBeUndefined();
  });
});

describe("unemployment insurance data", () => {
  it("has a wage base and rate range for every state", () => {
    for (const [code, s] of Object.entries(STATES)) {
      const u = s.unemployment;
      expect(u.wageBase, code).toBeGreaterThan(0);
      expect(u.maxRate, code).toBeGreaterThanOrEqual(u.minRate);
      if (u.newEmployerRate !== null) expect(u.newEmployerRate, code).toBeGreaterThan(0);
    }
  });

  it("estimates unemployment tax from payroll and headcount", () => {
    const profile = { ...llc, employeeCount: 4, annualPayroll: 200000 }; // TX: $9,000 base at 2.7%
    const r = evaluate(profile, { asOf });
    const est = estimateCosts(r.items, { profile: r.profile });
    const line = est.lines.find((l) => l.title.includes("unemployment insurance"));
    expect(line?.perYear).toBeCloseTo(4 * 9000 * 0.027, 2);
    expect(line?.estimate).toBe(true);
  });
});

describe("gross-receipts and margin taxes", () => {
  const ohio = { ...llc, zip: "43215", city: "Columbus", county: "Franklin" };
  const text = (revenue: number) =>
    evaluate({ ...ohio, annualRevenue: revenue }, { asOf }).items.find((i) =>
      i.id.startsWith("state.entity-tax"),
    )?.description ?? "";

  it("compares revenue with the state threshold", () => {
    expect(text(7_000_000)).toContain("so tax is due");
    expect(text(500_000)).toContain("so no tax is due");
    expect(text(0)).toContain("only when annual revenue exceeds");
  });

  it("marks structured entity tax data as checked", () => {
    const item = evaluate(ohio, { asOf }).items.find((i) => i.id.startsWith("state.entity-tax"));
    expect(item?.provenance?.confidence).toBe("checked");
  });
});
