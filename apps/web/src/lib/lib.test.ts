import { describe, expect, it } from "vitest";
import { createAnalytics, sanitize, type PostHogClient } from "./analytics";
import { CONFIDENCE, formatDate, frequencyLabel, hostOf, money, relativeDays, safeUrl } from "./format";
import { analyze, buildProfile, countBy, groupObligations, today, type FormValues } from "./plan";

const form: FormValues = {
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
    expect(p).toMatchObject({ entityType: "llc", zip: "60601", city: "Chicago", employeeCount: 3 });
    expect(p.industry).toBe("restaurant");
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
    const d = analyze(buildProfile(form, place), { asOf: "2026-10-13", isNew: true });
    expect(d.plan.steps.length).toBeGreaterThan(5);
    expect(d.result.items.length).toBeGreaterThan(5);
    expect(d.ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(d.costs.currency).toBe("USD");
    expect(Array.isArray(d.analysis.sensitivity)).toBe(true);
  });
});

describe("formatting", () => {
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

  it("links only http(s) urls", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://example.gov/page")).toBe("https://example.gov/page");
    expect(hostOf("https://www.irs.gov/businesses")).toBe("irs.gov");
  });

  it("labels frequencies and confidence", () => {
    expect(frequencyLabel("annual")).toBe("Annual");
    expect(frequencyLabel("weird")).toBe("weird");
    expect(CONFIDENCE.checked).toMatch(/official/);
    expect(relativeDays("2026-10-20", "2026-10-13", "en-US")).toMatch(/7 days|in 1 week/);
  });
});

describe("today", () => {
  it("is the local calendar date", () => {
    expect(today(new Date(2026, 9, 15, 20, 30))).toBe("2026-10-15");
    expect(today(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
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
      industry: "general",
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
        { entityType: "llc", industry: "general", isNew: true, zip: "78701", employees: 5 },
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

describe("obligation helpers", () => {
  const base = { authority: "", description: "", reason: "" };
  const items = [
    { ...base, id: "a", title: "B thing", jurisdiction: "state", category: "tax", nextDue: "2027-02-01" },
    { ...base, id: "b", title: "A thing", jurisdiction: "state", category: "license", nextDue: "2027-01-01" },
    { ...base, id: "c", title: "Fed thing", jurisdiction: "federal", category: "tax" },
  ] as const;
  const list = [...items] as unknown as Parameters<typeof groupObligations>[0];

  it("groups, filters and sorts", () => {
    const all = groupObligations(list);
    expect(all.map((g) => g.jurisdiction)).toEqual(["federal", "state"]);
    expect(all.find((g) => g.jurisdiction === "state")!.items.map((i) => i.title)).toEqual([
      "A thing",
      "B thing",
    ]);
    expect(groupObligations(list, { category: "tax" }).flatMap((g) => g.items)).toHaveLength(2);
    expect(groupObligations(list, { query: "fed" }).flatMap((g) => g.items)).toHaveLength(1);
  });

  it("counts ignoring its own filter", () => {
    expect(countBy(list, "category", { category: "license" })).toEqual({ tax: 2, license: 1 });
  });
});
