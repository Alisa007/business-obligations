import {
  PROFILE_DEFAULTS,
  isVerified,
  profileFromChoices,
  type ProfileChoices,
} from "business-obligations-ui";
import { describe, expect, it } from "vitest";
import { createAnalytics, sanitize, stripQuery, type PostHogClient } from "./analytics";
import { analyze, summarize } from "./plan";

const choices: ProfileChoices = {
  ...PROFILE_DEFAULTS,
  zip: "60601",
  entityType: "llc",
  naics: "722511",
  employeeCount: 3,
  annualPayroll: 90000,
  annualRevenue: 250000,
  ownerCount: 1,
  sellsTaxableGoods: true,
};
const buildProfile = (overrides: Partial<ProfileChoices>, where = place) =>
  profileFromChoices({ ...choices, ...overrides }, where);
const place = { city: "Chicago", county: "Cook", state: "IL" };

describe("playground logic", () => {
  it("produces every view without errors", () => {
    const d = analyze(buildProfile({}), { asOf: "2026-10-13", isNew: true });
    expect(d.plan.steps.length).toBeGreaterThan(5);
    expect(d.result.items.length).toBeGreaterThan(5);
    expect(d.ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(d.costs.currency).toBe("USD");
    expect(Array.isArray(d.analysis.sensitivity)).toBe(true);
  });

  it("a new business has no income tax return on the calendar, a formed one does", () => {
    const profile = buildProfile({});
    const asOf = "2026-10-13";
    const returns = (isNew: boolean) =>
      analyze(profile, { asOf, isNew }).events.filter((e) => e.itemId === "fed.income-tax-return");
    expect(returns(true)).toHaveLength(0);
    expect(returns(false).length).toBeGreaterThan(0);
  });
});

describe("conditionally applicable items", () => {
  const profile = buildProfile({ employeeCount: undefined });

  it("come from the details that are still unknown", () => {
    const result = analyze(profile, { asOf: "2026-11-02" });
    const fields = result.conditional.flatMap(({ when }) => when.map((w) => w.field));
    expect(result.conditional.length).toBeGreaterThan(0);
    expect(fields).toContain("employeeCount");
    // none of them is in the result already
    const have = new Set(result.result.items.map((item) => item.id));
    expect(result.conditional.every(({ item }) => !have.has(item.id))).toBe(true);
  });

  it("drop a detail that was answered no, as well as one answered yes", () => {
    // Arizona, where selling taxable goods adds a transaction privilege tax licence
    const gilbert = { city: "Gilbert", county: "Maricopa", state: "AZ" };
    const base = { zip: "85234", employeeCount: 3, naics: "" };
    const open = analyze(buildProfile({ ...base, sellsTaxableGoods: undefined }, gilbert), {
      asOf: "2026-11-02",
    });
    const no = analyze(buildProfile({ ...base, sellsTaxableGoods: false }, gilbert), { asOf: "2026-11-02" });
    const fields = (a: typeof open) => a.conditional.flatMap(({ when }) => when.map((w) => w.field));
    expect(fields(open)).toContain("sellsTaxableGoods");
    expect(fields(no)).not.toContain("sellsTaxableGoods");
  });

  it("do not come from a detail the person gave", () => {
    const given = analyze({ ...profile, employeeCount: 3 }, { asOf: "2026-11-02" });
    const fields = given.conditional.flatMap(({ when }) => when.map((w) => w.field));
    expect(fields).not.toContain("employeeCount");
  });
});

describe("analytics", () => {
  const recorder = () => {
    const calls: unknown[][] = [];
    const client: PostHogClient = {
      init: (...a) => void calls.push(["init", ...a]),
      capture: (...a) => void calls.push(["capture", ...a]),
      logger: {
        info: (...a) => void calls.push(["info", ...a]),
        warn: (...a) => void calls.push(["warn", ...a]),
      },
    };
    return { calls, load: () => Promise.resolve(client) };
  };
  const tick = () => new Promise((r) => setTimeout(r, 0));

  it("is off without a key or host, on localhost, or with Do Not Track", async () => {
    const { calls, load } = recorder();
    for (const opts of [
      { key: "", host: "https://us.i.posthog.com", hostname: "example.org" },
      { key: "phc_x", host: "", hostname: "example.org" },
      { key: "phc_x", host: "https://us.i.posthog.com", hostname: "localhost" },
      { key: "phc_x", host: "https://us.i.posthog.com", hostname: "example.org", doNotTrack: true },
    ]) {
      const a = createAnalytics({ ...opts, load });
      expect(a.enabled).toBe(false);
      a.track("tab_viewed", { tab: "plan" });
      a.log("plan_generated", { entityType: "llc" });
    }
    await tick();
    expect(calls).toEqual([]);
  });

  it("initialises without cookies or autocapture and sends only allowed properties", async () => {
    const { calls, load } = recorder();
    const a = createAnalytics({
      key: "phc_x",
      host: "https://us.i.posthog.com",
      hostname: "example.org",
      load,
    });
    expect(a.enabled).toBe(true);
    a.track("plan_generated", {
      entityType: "llc",
      naics: "722511",
      isNew: true,
      zip: "78701",
      employees: 5,
      city: "Austin",
    });
    a.track("not_allowed" as never, { zip: "78701" });
    a.log("plan_generation_failed", { reason: "unknown_zip", zip: "78701" });
    await tick();
    const init = calls.find((c) => c[0] === "init")!;
    expect(init[2]).toMatchObject({
      autocapture: false,
      persistence: "memory",
      disable_session_recording: true,
      respect_dnt: true,
    });
    expect(calls.filter((c) => c[0] === "capture")).toEqual([
      [
        "capture",
        "plan_generated",
        { entityType: "llc", naics: "722511", isNew: true, zip: "78701", employees: 5 },
      ],
    ]);
    expect(calls.filter((c) => c[0] === "warn")).toEqual([
      ["warn", "Compliance plan generation failed", { reason: "unknown_zip" }],
    ]);
  });

  it("sanitizes property values", () => {
    expect(sanitize("tab_viewed", { tab: { nested: 1 } })).toEqual({});
    expect(sanitize("ics_downloaded", { events: 12, extra: "x" })).toEqual({ events: 12 });
    expect(sanitize("field_used", { field: "zip", value: "78701" })).toEqual({ field: "zip" });
    expect(
      sanitize("plan_generated", {
        zip: "78701",
        payroll: 90000,
        isNew: true,
        secret: "x",
        nested: { a: 1 },
      }),
    ).toEqual({ zip: "78701", payroll: 90000, isNew: true });
    expect(sanitize("nope")).toBeUndefined();
  });
});

describe("result summary", () => {
  const data = analyze(buildProfile({}), { asOf: "2026-10-14", isNew: true });
  const s = summarize(data.result);

  it("summarises size, the nearest deadline and how much data is verified", () => {
    expect(s.total).toBe(data.result.items.length);
    expect(s.verified).toBeGreaterThan(0);
    expect(s.verified).toBeLessThanOrEqual(s.total);
    if (s.next) expect(s.next.nextDue >= data.result.asOf).toBe(true);
  });

  it("treats a checked item past its review date as unverified", () => {
    expect(isVerified({ provenance: { confidence: "checked", sources: [], stale: true } })).toBe(false);
    expect(isVerified({ provenance: { confidence: "checked", sources: [] } })).toBe(true);
    expect(isVerified({ provenance: { confidence: "compiled", sources: [] } })).toBe(false);
  });
});

describe("analytics page URLs", () => {
  it("drops the query string and fragment so form values are not sent with page views", () => {
    expect(stripQuery("https://example.org/?zip=78701&payroll=90000")).toBe("https://example.org/");
    expect(stripQuery("https://example.org/page#top")).toBe("https://example.org/page");
    expect(stripQuery("https://example.org/")).toBe("https://example.org/");
  });
});
