import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { defaultRules, evaluate, indexCities, seededCityRule, type BusinessProfile } from "../src";
import { PROFILE_FIELDS, STATES } from "../src";
import { COUNTY_JURISDICTIONS, LOCAL_JURISDICTIONS, findCity, findCounty } from "../src/data";
import type { LocalItem } from "../src/data/types";

const root = path.resolve(__dirname, "..");
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

describe("state data files", () => {
  const validate = ajv.compile(read("schema/state.schema.json"));
  const files = fs.readdirSync(path.join(root, "data/states")).filter((f) => f.endsWith(".json"));

  it("has one file per state and DC", () => expect(files).toHaveLength(51));

  it.each(files)("%s matches the schema", (f) => {
    const data = read(`data/states/${f}`);
    const ok = validate(data);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
    expect(data.code + ".json").toBe(f);
  });

  it("generated loader matches the JSON files", () => {
    for (const f of files) expect(STATES[f.slice(0, 2)]).toEqual(read(`data/states/${f}`));
  });
});

describe("business profile schema", () => {
  const validate = ajv.compile(read("schema/business-profile.schema.json"));
  it("accepts a complete profile", () => {
    expect(
      validate({ entityType: "llc", zip: "94105", city: "San Francisco", county: "San Francisco" }),
    ).toBe(true);
  });
  it("requires alcoholActivity for alcohol", () => {
    expect(validate({ entityType: "llc", zip: "94105", city: "SF", county: "SF", industry: "alcohol" })).toBe(
      false,
    );
  });
});

describe("local seed data", () => {
  it.each(LOCAL_JURISDICTIONS.map((j) => [j.city, j] as const))("%s is well-formed", (_city, j) => {
    expect(STATES[j.state]).toBeDefined();
    const ids = j.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const it of j.items) {
      expect(it.appliesTo.length).toBeGreaterThan(0);
      expect(it.title).toBeTruthy();
      if (it.url) expect(it.url).toMatch(/^https:\/\//);
      const local = it as LocalItem;
      for (const f of ["exemptions", "supersedes"] as const)
        if (local[f])
          expect(
            local[f]!.every((x) => typeof x === "string" && x.length > 0),
            `${j.city} ${f}`,
          ).toBe(true);
      for (const w of local.appliesWhen ?? [])
        expect(PROFILE_FIELDS, `${j.city} appliesWhen field`).toContain(w.field);
    }
  });
});

describe("city data files", () => {
  const files = fs.readdirSync(path.join(root, "data/cities")).filter((f) => f.endsWith(".json"));
  it("has one file per state and DC", () => expect(files).toHaveLength(51));
  it.each(files)("%s only holds cities of its own state", (f) => {
    const list = read(`data/cities/${f}`) as Array<{ state: string; city: string }>;
    for (const c of list) expect(c.state + ".json").toBe(f);
    const names = list.map((c) => c.city);
    expect(new Set(names).size).toBe(names.length);
  });
  it("entries without items say why", () => {
    for (const j of LOCAL_JURISDICTIONS.filter((x) => x.items.length === 0)) {
      expect(["none", "unverified"], j.city).toContain(j.status);
      expect(j.checkedOn, j.city).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(j.note, j.city).toBeTruthy();
      if (j.status === "none") expect(j.sourceUrl, j.city).toMatch(/^https:\/\//);
    }
  });
  it("entries with items have no status other than rules", () => {
    for (const j of LOCAL_JURISDICTIONS.filter((x) => x.items.length > 0))
      expect(j.status ?? "rules").toBe("rules");
  });
  it("looks cities up regardless of punctuation and aliases", () => {
    expect(findCity("MO", "Saint Louis")?.city).toBe("St. Louis");
    expect(findCity("NY", "brooklyn")?.city).toBe("New York");
    expect(findCity("NY", "Nowhere")).toBeUndefined();
  });
  it("covers the 300 largest cities", () => {
    const top = read("data/top-cities.json").cities as Array<{ state: string; city: string }>;
    expect(top).toHaveLength(300);
    const missing = top.filter((c) => !findCity(c.state, c.city)).map((c) => `${c.city}, ${c.state}`);
    expect(missing).toEqual([]);
  });
});

describe("county data files", () => {
  const files = fs.readdirSync(path.join(root, "data/counties")).filter((f) => f.endsWith(".json"));
  it("has one file per state and DC", () => expect(files).toHaveLength(51));
  it.each(files)("%s only holds counties of its own state, once each", (f) => {
    const list = read(`data/counties/${f}`) as Array<{ state: string; county: string }>;
    for (const c of list) expect(c.state + ".json").toBe(f);
    const names = list.map((c) => c.county);
    expect(new Set(names).size).toBe(names.length);
  });
  it("entries are well-formed", () => {
    for (const j of COUNTY_JURISDICTIONS) {
      expect(STATES[j.state], j.county).toBeDefined();
      const ids = j.items.map((i) => i.id);
      expect(new Set(ids).size, j.county).toBe(ids.length);
      for (const it of j.items) {
        expect(it.appliesTo.length).toBeGreaterThan(0);
        if (it.url) expect(it.url, j.county).toMatch(/^https:\/\//);
      }
      if (j.items.length === 0) {
        expect(["none", "unverified"], j.county).toContain(j.status);
        expect(j.checkedOn, j.county).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(j.note, j.county).toBeTruthy();
        if (j.status === "none") expect(j.sourceUrl, j.county).toMatch(/^https:\/\//);
      }
    }
  });
  it("covers the 300 largest counties", () => {
    const top = read("data/top-counties.json").counties as Array<{ state: string; county: string }>;
    expect(top).toHaveLength(300);
    const missing = top.filter((c) => !findCounty(c.state, c.county)).map((c) => `${c.county}, ${c.state}`);
    expect(missing).toEqual([]);
  });
  it("matches names regardless of County/Parish suffixes", () => {
    expect(findCounty("CA", "Los Angeles County")?.county).toBe("Los Angeles");
    expect(findCounty("LA", "East Baton Rouge")?.county).toBe("East Baton Rouge Parish");
  });
  it("adds county items to results", () => {
    const r = evaluate(
      {
        entityType: "llc",
        zip: "90012",
        city: "Los Angeles",
        county: "Los Angeles",
        industry: "retail",
      } as BusinessProfile,
      { asOf: "2026-10-13" },
    );
    const item = r.items.find(
      (i) => i.jurisdiction === "county" && /business personal property/i.test(i.title),
    );
    expect(item?.url).toMatch(/^https:\/\//);
    expect(item?.nextDue).toBe("2027-04-01");
  });
});

describe("profession directory", () => {
  const prof = read("data/professions.json").professions as Record<
    string,
    Record<string, { name: string; url?: string }>
  >;
  it.each(Object.keys(prof))("%s has a board for all 51 jurisdictions", (p) => {
    expect(Object.keys(prof[p]!).sort()).toEqual(Object.keys(STATES).sort());
    for (const b of Object.values(prof[p]!)) {
      expect(b.name.length).toBeGreaterThan(5);
      if (b.url) expect(b.url).toMatch(/^https?:\/\//);
    }
  });
});

describe("coverage report", () => {
  it("COVERAGE.md is up to date (run `npm run coverage`)", async () => {
    // @ts-expect-error plain JS module
    const { buildCoverage } = await import("../scripts/coverage.mjs");
    // Prettier re-flows tables and long lines; compare content only.
    const norm = (t: string) => t.replace(/-{2,}/g, "-").replace(/\s+/g, " ").trim();
    const actual = fs.readFileSync(path.join(__dirname, "..", "COVERAGE.md"), "utf8");
    expect(norm(actual)).toBe(norm(buildCoverage()));
  });
});

describe("compliance result schema", () => {
  const validate = ajv.compile(read("schema/compliance-result.schema.json"));
  const profiles: BusinessProfile[] = [
    {
      entityType: "llc",
      zip: "78701",
      city: "Austin",
      county: "Travis",
      employeeCount: 3,
      annualPayroll: 120000,
    },
    { entityType: "c_corp", zip: "10001", city: "New York", county: "New York", sellsTaxableGoods: true },
    { entityType: "lp", zip: "37201", city: "Nashville", county: "Davidson", ownerCount: 3 },
    {
      entityType: "llc",
      zip: "94105",
      city: "San Francisco",
      county: "San Francisco",
      dissolutionDate: "2026-12-01",
      multistate: [{ state: "WA", employeeCount: 1 }],
    },
  ];
  it.each(profiles.map((p, i) => [i, p] as const))("validates results for profile %i", (_i, profile) => {
    const result = JSON.parse(JSON.stringify(evaluate(profile, { asOf: "2026-10-13" })));
    const ok = validate(result);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });
});

describe("source links", () => {
  const isBare = (u: string) => {
    const url = new URL(u);
    return (url.pathname === "/" || url.pathname === "") && !url.search;
  };

  it("every state has specific (non-home-page) links for the obligations it cites", () => {
    for (const [code, s] of Object.entries(STATES)) {
      const links = s.links;
      expect(links, code).toBeDefined();
      for (const key of ["formation", "annualReport", "uiRegistration", "entityTax"] as const)
        expect(isBare(links[key]), `${code}.links.${key} is a bare domain: ${links[key]}`).toBe(false);
      if (s.wageWithholding) expect(links.withholding, `${code} withholding`).toBeDefined();
      if (s.salesTax.statewide) expect(links.salesTax, `${code} salesTax`).toBeDefined();
      for (const [key, value] of Object.entries(links)) {
        expect(value, `${code}.links.${key}`).toMatch(/^https:\/\//);
        expect(isBare(value as string), `${code}.links.${key}`).toBe(false);
      }
    }
  });
});

describe("citation urls in output", () => {
  const isBare = (u: string) => {
    const url = new URL(u);
    return (url.pathname === "/" || url.pathname === "") && !url.search;
  };
  const sample: Array<Partial<BusinessProfile>> = [
    {
      entityType: "llc",
      employeeCount: 3,
      annualPayroll: 90000,
      sellsTaxableGoods: true,
      usesTradeName: true,
    },
    { entityType: "c_corp", employeeCount: 2, annualPayroll: 60000, sellsTaxableGoods: true },
    { entityType: "sole_proprietorship", usesTradeName: true, sellsTaxableGoods: true },
    { entityType: "pllc", profession: "attorney", industry: "professional_services" },
    { entityType: "llp", profession: "cpa" },
    { entityType: "llc", industry: "healthcare", profession: "physician", employeeCount: 1 },
    { entityType: "llc", profession: "architect", industry: "professional_services" },
    { entityType: "pc", profession: "engineer", industry: "professional_services" },
    { entityType: "lp" },
    { entityType: "llc", industry: "restaurant", employeeCount: 4, annualPayroll: 80000 },
  ];

  it("never cites a bare domain, for every state", () => {
    const bare: string[] = [];
    for (const [code, s] of Object.entries(STATES)) {
      // Any ZIP works: the state is passed explicitly.
      for (const p of sample) {
        const profile = {
          zip: "00000",
          city: "Sample",
          county: "Sample",
          state: code,
          ...p,
        } as BusinessProfile;
        let result;
        try {
          result = evaluate(profile, { asOf: "2026-10-13" });
        } catch {
          continue;
        }
        for (const item of result.items) {
          if (item.url && isBare(item.url)) bare.push(`${code} ${item.id}: ${item.url}`);
        }
      }
      void s;
    }
    expect([...new Set(bare)]).toEqual([]);
  });
});

describe("bring-your-own city data", () => {
  const profile: BusinessProfile = {
    entityType: "llc",
    zip: "78701",
    city: "Smallville",
    county: "Travis",
    state: "TX",
    industry: "retail",
  } as BusinessProfile;
  it("adds items for cities that are not bundled", () => {
    const seeds = [
      {
        state: "TX",
        city: "Smallville",
        items: [
          {
            id: "smallville.permit",
            title: "Smallville permit",
            category: "permit" as const,
            authority: "City of Smallville",
            description: "Test.",
            frequency: "once" as const,
            appliesTo: ["all" as const],
          },
        ],
      },
    ];
    const base = evaluate(profile, { asOf: "2026-10-13" });
    expect(base.items.some((i) => i.title === "Smallville permit")).toBe(false);
    const rules = [...defaultRules, seededCityRule(indexCities(seeds), "my.cities")];
    const result = evaluate(profile, { asOf: "2026-10-13", rules });
    expect(result.items.some((i) => i.title === "Smallville permit")).toBe(true);
  });
});
