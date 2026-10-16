import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { evaluate, type BusinessProfile } from "../src";
import { INDUSTRY_ITEMS } from "../src/data/industries";
import { NAICS_CODES } from "../src/naics-entry";
import { parseRRule } from "../src/rrule";

const root = path.resolve(__dirname, "..");
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

describe("industry items by NAICS code", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(read("schema/common.schema.json"));
  ajv.addSchema(read("schema/local-item.schema.json"));
  const validate = ajv.compile(read("schema/industry-items.schema.json"));

  for (const [state, items] of Object.entries(INDUSTRY_ITEMS)) {
    describe(state, () => {
      it("matches the schema", () => {
        expect(validate(items)).toBe(true);
        expect(validate.errors ?? []).toEqual([]);
      });

      it("has unique ids, in the state's own namespace", () => {
        const ids = items.map((i) => i.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(id, id).toMatch(new RegExp(`^${state.toLowerCase()}\\.`));
      });

      it("names only prefixes that belong to real NAICS codes", () => {
        for (const item of items)
          for (const prefix of item.naics!)
            expect(
              NAICS_CODES.some((c) => c.code.startsWith(prefix)),
              `${item.id}: ${prefix}`,
            ).toBe(true);
      });

      it("has schedules that parse", () => {
        for (const item of items)
          if (item.rrule) expect(() => parseRRule(item.rrule!, item.anchor)).not.toThrow();
      });
    });
  }
});

describe("the NAICS licences rule", () => {
  const base: BusinessProfile = {
    entityType: "llc",
    zip: "10001",
    city: "New York",
    county: "New York",
    state: "NY",
  };
  const ids = (p: BusinessProfile) =>
    evaluate(p, { asOf: "2026-10-16" }).items.filter((i) => i.id.startsWith("industry.naics-licences"));

  it("adds a state's items for the business's NAICS code", () => {
    const salon = ids({ ...base, naics: "812112" });
    expect(salon.map((i) => i.title)).toContain("Obtain a New York appearance enhancement business license");
    const item = salon.find((i) => i.title.includes("appearance enhancement"))!;
    expect(item.jurisdiction).toBe("state");
    expect(item.provenance).toMatchObject({ confidence: "checked", checkedOn: "2026-10-16" });
    expect(item.reason).toContain("812112");
  });

  it("matches by prefix and ignores other codes", () => {
    expect(ids({ ...base, naics: "811111" }).map((i) => i.title)).toContain(
      "Register a motor vehicle repair shop with the NY DMV",
    );
    expect(ids({ ...base, naics: "541511" })).toEqual([]);
    expect(ids(base)).toEqual([]);
    expect(ids({ ...base, naics: "81" })).toEqual([]);
  });

  it("skips employee-only items for a business without employees", () => {
    const titles = (p: BusinessProfile) => ids(p).map((i) => i.title);
    expect(titles({ ...base, naics: "561612" })).not.toContain(
      "Register each security guard with the NY Department of State",
    );
    expect(titles({ ...base, naics: "561612", employeeCount: 3 })).toContain(
      "Register each security guard with the NY Department of State",
    );
  });

  it("does not apply to other states", () => {
    expect(
      ids({ ...base, state: "NJ", zip: "07101", city: "Newark", county: "Essex", naics: "812112" }),
    ).toEqual([]);
  });
});
