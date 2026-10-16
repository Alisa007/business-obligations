import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { evaluate, type BusinessProfile } from "../src";
import { DUTY_ITEMS } from "../src/data/duties";
import { parseRRule } from "../src/rrule";

const root = path.resolve(__dirname, "..");
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

describe("state duties", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(read("schema/common.schema.json"));
  ajv.addSchema(read("schema/local-item.schema.json"));
  const validate = ajv.compile(read("schema/duties-items.schema.json"));

  it("lists every file in data/duties", () => {
    const files = fs.readdirSync(path.join(root, "data/duties")).map((f) => f.replace(".json", ""));
    expect(Object.keys(DUTY_ITEMS).sort()).toEqual(files.sort());
  });

  it("has an unclaimed property report for every state and DC", () => {
    const states = fs
      .readdirSync(path.join(root, "data/states"))
      .map((f) => f.replace(".json", ""))
      .sort();
    for (const s of states)
      expect(
        DUTY_ITEMS[s]?.some((i) => i.id === `${s.toLowerCase()}.unclaimed-property-report`),
        s,
      ).toBe(true);
  });

  for (const [state, items] of Object.entries(DUTY_ITEMS)) {
    describe(state, () => {
      it("matches the schema", () => {
        expect(validate(items)).toBe(true);
        expect(validate.errors ?? []).toEqual([]);
      });

      it("has unique ids in the state's own namespace and schedules that parse", () => {
        const ids = items.map((i) => i.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const it of items) {
          expect(it.id).toMatch(new RegExp(`^${state.toLowerCase()}\\.`));
          if (it.rrule) expect(() => parseRRule(it.rrule!, it.anchor)).not.toThrow();
        }
      });
    });
  }
});

describe("the state duties rule", () => {
  const base = (state: string, extra: Partial<BusinessProfile> = {}): BusinessProfile => ({
    entityType: "llc",
    zip: "00000",
    city: "Anywhere",
    county: "Anywhere",
    state,
    ...extra,
  });
  const found = (p: BusinessProfile) =>
    evaluate(p, { asOf: "2026-10-16" }).items.filter((i) => i.ruleId === "state.duties");

  it("gives every business its home state's unclaimed property report", () => {
    const report = found(base("DE")).find((i) => /unclaimed property/.test(i.title));
    expect(report?.title).toBe("File the annual unclaimed property holder report (Delaware)");
    expect(report?.nextDue).toBe("2027-03-01");
  });

  it("adds a state where the business has employees", () => {
    const items = found(base("TX", { multistate: [{ state: "CA", employeeCount: 2 }] }));
    expect(new Set(items.map((i) => i.state))).toEqual(new Set(["CA", "TX"]));
  });
});

describe("contractor duties follow what the business pays freelancers", () => {
  const base = (state: string, paid: number): BusinessProfile => ({
    entityType: "llc",
    zip: "00000",
    city: "Anywhere",
    county: "Anywhere",
    state,
    largestContractorPaymentUsd: paid,
  });
  const titles = (p: BusinessProfile) =>
    evaluate(p, { asOf: "2026-10-16" })
      .items.filter((i) => i.ruleId === "state.duties")
      .map((i) => i.title);

  it("requires a written contract at each state's threshold", () => {
    expect(titles(base("NY", 799)).some((t) => /freelance/i.test(t))).toBe(false);
    expect(titles(base("NY", 800)).some((t) => /freelance/i.test(t))).toBe(true);
    expect(titles(base("CA", 250)).some((t) => /freelance/i.test(t))).toBe(true);
    expect(titles(base("IL", 499)).some((t) => /freelance/i.test(t))).toBe(false);
  });

  it("flags contractor classification only for a business that pays contractors", () => {
    expect(titles(base("CA", 0)).some((t) => /ABC test/.test(t))).toBe(false);
    expect(titles(base("CA", 1000)).some((t) => /ABC test/.test(t))).toBe(true);
  });
});
