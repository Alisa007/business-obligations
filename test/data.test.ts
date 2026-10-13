import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
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
    }
  });
});
