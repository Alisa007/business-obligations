import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { evaluate, type BusinessProfile } from "../src";
import { STATES } from "../src";
import { LOCAL_JURISDICTIONS } from "../src/data";

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
    }
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
