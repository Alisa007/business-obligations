import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { evaluate, type BusinessProfile } from "../src";
import { EMPLOYER_ITEMS } from "../src/data/employers";

const root = path.resolve(__dirname, "..");
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

describe("employer mandates by state", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(read("schema/common.schema.json"));
  ajv.addSchema(read("schema/local-item.schema.json"));
  const validate = ajv.compile(read("schema/employer-items.schema.json"));

  it("lists every file in data/employers", () => {
    const files = fs.readdirSync(path.join(root, "data/employers")).map((f) => f.replace(".json", ""));
    expect(Object.keys(EMPLOYER_ITEMS).sort()).toEqual(files.sort());
  });

  for (const [state, items] of Object.entries(EMPLOYER_ITEMS)) {
    describe(state, () => {
      it("matches the schema", () => {
        expect(validate(items)).toBe(true);
        expect(validate.errors ?? []).toEqual([]);
      });

      it("has unique ids, in the state's own namespace, and applies to employers", () => {
        const ids = items.map((i) => i.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const it of items) {
          expect(it.id).toMatch(new RegExp(`^${state.toLowerCase()}\\.`));
          expect(it.appliesTo).toEqual(["employees"]);
        }
      });
    });
  }
});

describe("the employer mandates rule", () => {
  const base = (
    state: string,
    employeeCount: number,
    extra: Partial<BusinessProfile> = {},
  ): BusinessProfile => ({
    entityType: "llc",
    zip: "00000",
    city: "Anywhere",
    county: "Anywhere",
    state,
    employeeCount,
    ...extra,
  });
  const titles = (p: BusinessProfile) =>
    evaluate(p, { asOf: "2026-10-16" })
      .items.filter((i) => i.ruleId === "state.employer-mandates")
      .map((i) => i.title);

  it("applies headcount thresholds in the state", () => {
    expect(titles(base("CA", 3)).some((t) => /CalSavers/.test(t))).toBe(true);
    expect(titles(base("CA", 3)).some((t) => /harassment/.test(t))).toBe(false);
    expect(titles(base("CA", 5)).some((t) => /harassment/.test(t))).toBe(true);
  });

  it("requires E-Verify in Florida only from 25 employees", () => {
    expect(titles(base("FL", 10)).some((t) => /E-Verify/.test(t))).toBe(false);
    expect(titles(base("FL", 25)).some((t) => /E-Verify/.test(t))).toBe(true);
    expect(titles(base("AZ", 1)).some((t) => /E-Verify/.test(t))).toBe(true);
  });

  it("adds nothing without employees or in states with no mandate", () => {
    expect(titles(base("CA", 0))).toEqual([]);
    expect(titles(base("TX", 50))).toEqual([]);
  });
});
