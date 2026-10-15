import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCalendar,
  evaluate,
  InvalidProfileError,
  planLaunch,
  previewChanges,
  toICS,
  validateProfile,
  type BusinessProfile,
} from "../src";
import { isIsoDate, todayIso } from "../src/iso";

/**
 * Convention:
 *  - Every machine-readable date is ISO 8601 `YYYY-MM-DD`, and must be a real calendar date.
 *  - Human-readable deadline text uses the full month name and a plain day number: "April 15", or
 *    "April 15, 2027" when it names one specific date. No ordinals, abbreviations or numeric d/m/y forms.
 */
const root = path.join(__dirname, "..");
const DATE_KEYS = /(^|[a-z])(Date|On|effective|announced|asOf|nextDue|from|to|date)$/;
const MONTH = "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
const BAD_TEXT: Array<[string, RegExp]> = [
  ["abbreviated month", /\b(?:Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.? \d{1,2}\b/],
  ["ordinal day", new RegExp(`\\b${MONTH} \\d{1,2}(?:st|nd|rd|th)\\b`)],
  ["day-month order", new RegExp(`\\b\\d{1,2} ${MONTH}\\b`)],
  ["numeric date", /(?<![\d./:-])\d{1,2}\/\d{1,2}(?:\/\d{2,4})?(?![\d/])/],
  ["dotted date", /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/],
];

function walk(value: unknown, visit: (key: string, v: unknown, where: string) => void, where = ""): void {
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, visit, `${where}[${i}]`));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      visit(k, v, `${where}.${k}`);
      walk(v, visit, `${where}.${k}`);
    }
}

const dataFiles = [
  ...fs.readdirSync(path.join(root, "data/states")).map((f) => path.join("data/states", f)),
  ...fs.readdirSync(path.join(root, "data/cities")).map((f) => path.join("data/cities", f)),
  ...fs.readdirSync(path.join(root, "data/counties")).map((f) => path.join("data/counties", f)),
  "data/changes.json",
  "data/professions.json",
];

describe("todayIso", () => {
  it("uses the local calendar date, not the UTC date", () => {
    // 8:30 pm local time: UTC may already be the next day, the local date must not be.
    expect(todayIso(new Date(2026, 9, 15, 20, 30))).toBe("2026-10-15");
    expect(todayIso(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
    expect(todayIso(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });
});

describe("isIsoDate", () => {
  it("accepts real dates and rejects impossible or differently formatted ones", () => {
    for (const ok of ["2026-10-13", "2024-02-29", "2026-12-31"]) expect(isIsoDate(ok), ok).toBe(true);
    for (const bad of [
      "2026-02-30",
      "2026-13-01",
      "2026-1-5",
      "10/13/2026",
      "2026.10.13",
      "2026-10-13T00:00:00Z",
      20261013,
    ])
      expect(isIsoDate(bad), String(bad)).toBe(false);
  });
});

describe("dates in data files", () => {
  it.each(dataFiles)("%s uses ISO dates for date fields", (file) => {
    const data = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
    const bad: string[] = [];
    walk(data, (key, v, where) => {
      if (typeof v === "string" && DATE_KEYS.test(key) && !isIsoDate(v)) bad.push(`${where} = ${v}`);
    });
    expect(bad).toEqual([]);
  });

  it.each(dataFiles)("%s writes dates in text the same way", (file) => {
    const data = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
    const bad: string[] = [];
    walk(data, (key, v, where) => {
      if (typeof v !== "string" || /url|source/i.test(key)) return;
      for (const [label, re] of BAD_TEXT) if (re.test(v)) bad.push(`${where}: ${label}: ${v}`);
    });
    expect(bad).toEqual([]);
  });

  it("changes registry versions use YYYY-MM-DD.n", () => {
    const { rulesetVersion } = JSON.parse(fs.readFileSync(path.join(root, "data/changes.json"), "utf8"));
    expect(rulesetVersion).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    expect(isIsoDate(rulesetVersion.split(".")[0])).toBe(true);
  });
});

describe("dates in output", () => {
  const profiles: BusinessProfile[] = [
    {
      entityType: "llc",
      zip: "78701",
      city: "Austin",
      county: "Travis",
      employeeCount: 2,
      annualPayroll: 80000,
    },
    { entityType: "c_corp", zip: "10001", city: "New York", county: "New York", formationDate: "2022-05-01" },
    {
      entityType: "pllc",
      profession: "attorney",
      zip: "94105",
      city: "San Francisco",
      county: "San Francisco",
      dissolutionDate: "2026-12-15",
      employeeCount: 1,
    },
    { entityType: "nonprofit", zip: "60601", city: "Chicago", county: "Cook", fiscalYearEndMonth: 6 },
  ];
  const asOf = "2026-10-13";

  it("uses ISO for every date field and the convention for text", () => {
    for (const profile of profiles) {
      const result = evaluate(profile, { asOf });
      expect(isIsoDate(result.asOf)).toBe(true);
      expect(isIsoDate(result.dataVersion)).toBe(true);
      for (const item of result.items) {
        if (item.nextDue) expect(isIsoDate(item.nextDue), `${item.id} nextDue`).toBe(true);
        if (item.due?.type === "date") expect(isIsoDate(item.due.date), `${item.id} due.date`).toBe(true);
        if (item.provenance?.checkedOn) expect(isIsoDate(item.provenance.checkedOn)).toBe(true);
        for (const text of [item.title, item.description, item.reason, item.deadline ?? ""])
          for (const [label, re] of BAD_TEXT)
            expect(re.test(text), `${item.id} ${label}: ${text}`).toBe(false);
        for (const n of item.upcomingChanges ?? []) expect(isIsoDate(n.effective)).toBe(true);
      }
      for (const n of [...result.upcomingChanges, ...result.recentChanges])
        expect(isIsoDate(n.effective)).toBe(true);
    }
  });

  it("uses ISO for plan, calendar and preview dates", () => {
    const plan = planLaunch(profiles[0]!, { startDate: asOf, openingDate: "2027-03-01" });
    for (const d of [plan.startDate, plan.formationDate, plan.readyDate]) expect(isIsoDate(d)).toBe(true);
    for (const s of plan.steps) {
      expect(isIsoDate(s.start)).toBe(true);
      if (s.target) expect(isIsoDate(s.target)).toBe(true);
    }
    const { events } = buildCalendar(profiles[1]!, { from: asOf, to: "2027-12-31" });
    for (const e of events) expect(isIsoDate(e.date)).toBe(true);
    const preview = previewChanges(profiles[0]!, { from: asOf, to: "2027-12-31" });
    expect(isIsoDate(preview.from) && isIsoDate(preview.to)).toBe(true);
  });

  it("writes iCalendar dates as basic-format values", () => {
    const { events } = buildCalendar(profiles[1]!, { from: asOf, to: "2027-12-31" });
    const ics = toICS(events);
    for (const line of ics.split("\r\n").filter((l) => /^(DTSTART|DTEND)/.test(l)))
      expect(line).toMatch(/^DT(START|END);VALUE=DATE:\d{8}$/);
    for (const line of ics.split("\r\n").filter((l) => l.startsWith("DTSTAMP")))
      expect(line).toMatch(/^DTSTAMP:\d{8}T000000Z$/);
  });
});

describe("date inputs", () => {
  const base = { entityType: "llc" as const, zip: "78701", city: "Austin", county: "Travis" };

  it("rejects impossible calendar dates", () => {
    expect(validateProfile({ ...base, formationDate: "2026-02-30" })[0]?.field).toBe("formationDate");
    expect(() => evaluate({ ...base, dissolutionDate: "2026-13-01" })).toThrow(InvalidProfileError);
    expect(() => evaluate(base, { asOf: "2026-02-30" })).toThrow(/asOf/);
  });

  it("rejects other formats", () => {
    for (const bad of ["10/13/2026", "2026-1-5", "Oct 13, 2026", "2026-10-13T00:00:00Z"])
      expect(validateProfile({ ...base, formationDate: bad })).toHaveLength(1);
  });

  it("validates calendar windows", () => {
    expect(() => buildCalendar(base, { from: "2026-10-13", to: "10/14/2026" })).toThrow(/`to`/);
    expect(() => buildCalendar(base, { from: "2026-10-13", to: "2026-10-01" })).toThrow(/before/);
  });
});
