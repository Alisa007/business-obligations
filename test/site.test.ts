import { describe, expect, it } from "vitest";
import * as lib from "../src";
// @ts-expect-error plain JS module
import { createAnalytics, sanitize } from "../site/analytics.js";
import {
  analyze,
  buildProfile,
  countBy,
  formatDate,
  frequencyLabel,
  groupObligations,
  hostOf,
  link,
  money,
  relativeDays,
  safeUrl,
  // @ts-expect-error plain JS module
} from "../site/app.js";

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

describe("playground analytics", () => {
  const load = (calls: unknown[][]) => () =>
    Promise.resolve({
      init: (...a: unknown[]) => calls.push(["init", ...a]),
      capture: (...a: unknown[]) => calls.push(["capture", ...a]),
    });

  it("is off without a key, on localhost, or with Do Not Track", async () => {
    const calls: unknown[][] = [];
    for (const opts of [
      { key: "", hostname: "example.org" },
      { key: "phc_x", hostname: "localhost" },
      { key: "phc_x", hostname: "example.org", doNotTrack: true },
    ]) {
      const a = createAnalytics({ ...opts, host: "https://us.i.posthog.com", load: load(calls) });
      expect(a.enabled).toBe(false);
      a.track("tab_viewed", { tab: "plan" });
    }
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toEqual([]);
  });

  it("initialises without cookies or autocapture and sends only allowed properties", async () => {
    const calls: unknown[][] = [];
    const a = createAnalytics({
      key: "phc_x",
      host: "https://us.i.posthog.com",
      hostname: "example.org",
      load: load(calls),
    });
    expect(a.enabled).toBe(true);
    a.track("plan_generated", {
      entityType: "llc",
      industry: "general",
      isNew: true,
      zip: "78701",
      employees: 5,
    });
    a.track("not_allowed", { zip: "78701" });
    await new Promise((r) => setTimeout(r, 0));
    const init = calls.find((c) => c[0] === "init")!;
    expect(init[2]).toMatchObject({
      autocapture: false,
      persistence: "memory",
      disable_session_recording: true,
    });
    expect(calls.filter((c) => c[0] === "capture")).toEqual([
      ["capture", "plan_generated", { entityType: "llc", industry: "general", isNew: true }],
    ]);
  });

  it("sanitizes property values", () => {
    expect(sanitize("tab_viewed", { tab: { nested: 1 } })).toEqual({});
    expect(sanitize("ics_downloaded", { events: 12, extra: "x" })).toEqual({ events: 12 });
  });
});

describe("obligation helpers", () => {
  const items = [
    {
      id: "a",
      title: "B thing",
      jurisdiction: "state",
      category: "tax",
      nextDue: "2027-02-01",
      frequency: "annual",
    },
    {
      id: "b",
      title: "A thing",
      jurisdiction: "state",
      category: "license",
      nextDue: "2027-01-01",
      frequency: "once",
    },
    { id: "c", title: "Fed thing", jurisdiction: "federal", category: "tax", frequency: "annual" },
  ];
  it("groups, filters and sorts", () => {
    const all = groupObligations(items as never);
    expect(all.map((g: { jurisdiction: string }) => g.jurisdiction)).toEqual(["federal", "state"]);
    const st = all.find((g: { jurisdiction: string }) => g.jurisdiction === "state");
    expect(st.items.map((i: { id: string }) => i.id)).toEqual(["b", "a"]);
    expect(
      groupObligations(items as never, { category: "tax" }).flatMap((g: { items: unknown[] }) => g.items),
    ).toHaveLength(2);
    expect(
      groupObligations(items as never, { query: "fed" }).flatMap((g: { items: unknown[] }) => g.items),
    ).toHaveLength(1);
  });
  it("counts ignoring its own filter", () => {
    expect(countBy(items as never, "category", { category: "license" })).toEqual({ tax: 2, license: 1 });
  });
  it("labels and relative days", () => {
    expect(frequencyLabel("annual")).toBe("Annual");
    expect(frequencyLabel("weird")).toBe("weird");
    expect(relativeDays("2026-10-20", "2026-10-13", "en-US")).toMatch(/7 days|in 1 week/);
  });
});
