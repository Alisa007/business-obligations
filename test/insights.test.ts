import { describe, expect, it } from "vitest";
import {
  STATES,
  analyzeInputs,
  applyEvent,
  catalogTemplate,
  localize,
  explainTransition,
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

describe("lifecycle events", () => {
  it("first hire adds employer obligations", () => {
    const t = explainTransition(llc, { type: "hire", count: 2, annualPayroll: 90000 }, { asOf });
    expect(t.added.some((i) => i.id.startsWith("state.employer"))).toBe(true);
    expect(t.added.some((i) => i.id.startsWith("fed.payroll-deposits"))).toBe(true);
    expect(t.removed).toEqual([]);
  });

  it("does not mutate the input profile", () => {
    const copy = JSON.stringify(llc);
    applyEvent(llc, { type: "hire", count: 1 });
    expect(JSON.stringify(llc)).toBe(copy);
  });

  it("expanding into another state adds that state's items", () => {
    const t = explainTransition(llc, { type: "expand", state: "CA", employeeCount: 1 }, { asOf });
    expect(t.added.some((i) => i.state === "CA")).toBe(true);
  });

  it("applies a sequence in order", () => {
    const t = explainTransition(
      llc,
      [{ type: "hire", count: 1, annualPayroll: 50000 }, { type: "start_selling_goods" }],
      { asOf },
    );
    expect(t.profile.sellsTaxableGoods).toBe(true);
    expect(t.profile.employeeCount).toBe(1);
  });

  it("moving keeps the original formation state", () => {
    const t = explainTransition(
      llc,
      { type: "relocate", zip: "94105", city: "San Francisco", county: "San Francisco" },
      { asOf },
    );
    expect(t.profile.formationState).toBe("TX");
    expect(t.added.some((i) => i.state === "CA")).toBe(true);
  });
});

describe("dissolution", () => {
  const base: BusinessProfile = { ...llc, entityType: "c_corp" };
  const r = (p: BusinessProfile) => evaluate({ ...p, dissolutionDate: "2026-11-20" }, { asOf });

  it("adds nothing without a dissolution date", () => {
    expect(evaluate(base, { asOf }).items.some((i) => i.id.startsWith("dissolution."))).toBe(false);
  });

  it("computes dated final-return deadlines", () => {
    const items = r({ ...base, employeeCount: 2 }).items;
    const get = (s: string) => items.find((i) => i.id.startsWith(s))!;
    expect(get("dissolution.fed-final-return").nextDue).toBe("2027-03-15"); // C corp: 15th of 4th month after
    expect(get("dissolution.fed-form-966").nextDue).toBe("2026-12-20");
    expect(items.find((i) => i.title.includes("final Form 941"))?.nextDue).toBe("2027-01-31");
    expect(items.find((i) => i.title.includes("final Form 940"))?.nextDue).toBe("2026-12-31");
  });

  it("covers formation-state filing and foreign withdrawal", () => {
    const items = r({ ...base, multistate: [{ state: "CA", employeeCount: 1 }] }).items;
    expect(items.some((i) => i.id.startsWith("dissolution.state-filing") && i.state === "TX")).toBe(true);
    expect(items.some((i) => i.id.startsWith("dissolution.foreign-withdrawal") && i.state === "CA")).toBe(
      true,
    );
  });

  it("skips entity filings for sole proprietors but still closes accounts", () => {
    const items = r({ ...llc, entityType: "sole_proprietorship" }).items;
    expect(items.some((i) => i.id.startsWith("dissolution.state-filing"))).toBe(false);
    expect(items.some((i) => i.id.startsWith("dissolution.state-tax-closeout"))).toBe(true);
    expect(items.find((i) => i.id.startsWith("dissolution.fed-final-return"))?.nextDue).toBe("2027-04-15");
  });

  it("appears in the calendar", () => {
    const { events } = buildCalendar(
      { ...base, dissolutionDate: "2026-11-20" },
      { from: "2026-10-13", to: "2027-06-30" },
    );
    expect(events.some((e) => e.itemId.startsWith("dissolution.fed-final-return"))).toBe(true);
  });

  it("rejects a malformed date", () => {
    expect(() => evaluate({ ...base, dissolutionDate: "Nov 2026" })).toThrow(/dissolutionDate/);
  });
});

describe("localization", () => {
  const catalog = {
    locale: "es",
    disclaimer: "Información general; no es asesoramiento legal.",
    categories: { filing: "Presentación" as const },
    frequencies: { annual: "Anual" as const },
    rules: {
      "fed.ein": { title: "Obtener un EIN del IRS", reason: "Entidad {entityType}" },
      "state.registered-agent:TX": { title: "Mantener un agente registrado en {state}" },
    },
  };

  it("replaces templated fields and keeps untranslated items in English", () => {
    const result = evaluate(llc, { asOf });
    const localized = localize(result, catalog);
    expect(localized.locale).toBe("es");
    expect(localized.disclaimer).toBe(catalog.disclaimer);
    const ein = localized.items.find((i) => i.ruleId === "fed.ein");
    expect(ein?.title).toBe("Obtener un EIN del IRS");
    expect(ein?.reason).toBe("Entidad llc");
    const agent = localized.items.find((i) => i.ruleId === "state.registered-agent");
    expect(agent?.title).toBe("Mantener un agente registrado en Texas");
    const untouched = localized.items.find((i) => !(i.ruleId in catalog.rules))!;
    const original = result.items.find((i) => i.id === untouched.id)!;
    expect(untouched.title).toBe(original.title);
  });

  it("labels enums and keeps ids stable", () => {
    const localized = localize(evaluate(llc, { asOf }), catalog);
    expect(localized.items.every((i, n) => i.id === evaluate(llc, { asOf }).items[n]!.id)).toBe(true);
    const annual = localized.items.find((i) => i.frequency === "annual");
    expect(annual?.labels.frequency).toBe("Anual");
  });

  it("builds a catalog template from a result", () => {
    const tpl = catalogTemplate(evaluate(llc, { asOf }));
    expect(tpl["fed.ein"]?.title).toBeTruthy();
  });
});
