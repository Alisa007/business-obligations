import { describe, expect, it } from "vitest";
import { evaluate, seededCityRule, validateProfile } from "../src";
import { LOCAL_JURISDICTIONS, findCity } from "../src/data";

const austin = { entityType: "llc", zip: "78701", city: "Austin", county: "Travis" } as const;

describe("provenance review dates", () => {
  const find = (asOf: string) =>
    evaluate(austin, { asOf }).items.find(
      (i) => i.provenance?.checkedOn && i.provenance.confidence !== "compiled",
    )!;

  it("sets reviewBy a year after checkedOn and flags staleness against asOf", () => {
    const fresh = find("2026-10-14").provenance!;
    expect(fresh.reviewBy! > fresh.checkedOn!).toBe(true);
    expect(fresh.stale).toBe(false);
    const old = find("2030-01-01").provenance!;
    expect(old.stale).toBe(true);
  });

  it("describes each source with kind, retrieval date and an archive link", () => {
    const p = find("2026-10-14").provenance!;
    expect(p.sourceDetails).toHaveLength(p.sources.length);
    for (const s of p.sourceDetails!) {
      expect(s.archiveUrl).toBe(`https://web.archive.org/web/${s.url}`);
      expect(s.retrievedOn).toBe(p.checkedOn);
    }
    expect(
      p.sourceDetails!.some((s) => s.kind === "pdf" || s.kind === "agency_page" || s.kind === "dataset"),
    ).toBe(true);
  });
});

describe("item identity and feedback", () => {
  const { items } = evaluate(austin, { asOf: "2026-10-14" });

  it("gives every item a jurisdiction id and a data-correction link", () => {
    for (const i of items) {
      expect(i.jurisdictionId).toMatch(/^US(-[A-Z]{2}(\/(county|city)\/[a-z0-9-]+)?)?$/);
      expect(i.feedbackUrl).toContain("template=data-correction.yml");
      expect(decodeURIComponent(i.feedbackUrl!)).toContain(i.id);
    }
  });

  it("uses US for federal items and carries the state FIPS code for state items", () => {
    expect(items.find((i) => i.jurisdiction === "federal")!.jurisdictionId).toBe("US");
    const state = items.find((i) => i.jurisdiction === "state")!;
    expect(state.jurisdictionId).toBe("US-TX");
    expect(state.stateFips).toBe("48");
  });

  it("describes the EIN filing mechanics", () => {
    const ein = items.find((i) => i.ruleId === "fed.ein")!;
    expect(ein.formId).toBe("SS-4");
    expect(ein.filingMethod).toContain("online");
  });
});

describe("construction stormwater permit", () => {
  const base = { ...austin, industry: "construction" } as const;
  const has = (acres?: number) =>
    evaluate(acres === undefined ? base : { ...base, disturbedAcres: acres }).items.some(
      (i) => i.ruleId === "industry.construction-stormwater",
    );

  it("applies from one disturbed acre and states its condition", () => {
    expect(has(0.9)).toBe(false);
    expect(has()).toBe(false);
    expect(has(1)).toBe(true);
    const item = evaluate({ ...base, disturbedAcres: 5 }).items.find(
      (i) => i.ruleId === "industry.construction-stormwater",
    )!;
    expect(item.appliesWhen).toEqual([
      expect.objectContaining({ field: "disturbedAcres", op: ">=", value: 1 }),
    ]);
    expect(item.exemptions?.length).toBeGreaterThan(0);
  });
});

describe("new profile inputs", () => {
  it("accepts them and rejects wrong types", () => {
    expect(
      validateProfile({
        ...austin,
        naics: "236220",
        activities: ["roofing"],
        disturbedAcres: 2,
        hasSignage: true,
      }),
    ).toEqual([]);
    const issues = validateProfile({ ...austin, activities: "roofing", disturbedAcres: -1 });
    expect(issues.map((i) => i.field).sort()).toEqual(["activities", "disturbedAcres"]);
  });
});

describe("compiledOn and review dates for every item", () => {
  const r = evaluate(austin, { asOf: "2026-10-14" });

  it("gives every item a compilation date, a review date and a staleness flag", () => {
    for (const i of r.items) {
      expect(i.provenance?.compiledOn).toBe(r.dataVersion);
      expect(i.provenance?.reviewBy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof i.provenance?.stale).toBe("boolean");
    }
  });

  it("ages never-checked items from compilation and flags them as stale a year on", () => {
    const compiled = r.items.find((i) => i.provenance?.confidence === "compiled")!;
    expect(compiled.provenance!.checkedOn).toBeUndefined();
    expect(compiled.provenance!.stale).toBe(false);
    const later = evaluate(austin, { asOf: "2028-01-01" }).items.find((i) => i.id === compiled.id)!;
    expect(later.provenance!.stale).toBe(true);
  });

  it("lets seeded city items inherit the seed's checked date", () => {
    const seed = LOCAL_JURISDICTIONS.find((j) => j.items.length > 0 && j.checkedOn)!;
    const r = evaluate(
      {
        entityType: "llc",
        zip: "60601",
        state: seed.state,
        city: seed.city,
        county: seed.counties?.[0] ?? "X",
      },
      { rules: [seededCityRule(findCity)] },
    );
    const city = r.items;
    expect(city.length).toBeGreaterThan(0);
    for (const i of city) {
      expect(i.provenance?.confidence).toBe("checked");
      expect(i.provenance?.checkedOn).toBe(seed.checkedOn);
    }
  });
});
