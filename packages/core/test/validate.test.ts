import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluate, InvalidProfileError, PROFILE_ENUMS, PROFILE_FIELDS, validateProfile } from "../src";

const base = { entityType: "llc", zip: "78701", city: "Austin", county: "Travis" };
const schema = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "schema", "business-profile.schema.json"), "utf8"),
);

describe("validateProfile", () => {
  it("accepts a well-formed profile", () => {
    expect(validateProfile(base)).toEqual([]);
    expect(
      validateProfile({
        ...base,
        employeeCount: 3,
        multistate: [{ state: "CA", employeeCount: 1 }],
        industry: "transportation",
        commercialVehicles: { interstate: true, grossWeightLbs: 30000 },
      }),
    ).toEqual([]);
  });

  it("suggests the intended field for a typo", () => {
    const issues = validateProfile({ ...base, employes: 5, anualPayroll: 1000 });
    expect(issues.map((i) => [i.field, i.suggestion])).toEqual([
      ["employes", "employeeCount"],
      ["anualPayroll", "annualPayroll"],
    ]);
  });

  it("suggests the intended value for a mistyped enum", () => {
    const [issue] = validateProfile({ ...base, entityType: "LLC" });
    expect(issue?.suggestion).toBe("llc");
    const [industry] = validateProfile({ ...base, industry: "real estate" });
    expect(industry?.suggestion).toBe("real_estate");
  });

  it("reports wrong types and hints at the fix for numeric strings", () => {
    const issues = validateProfile({
      ...base,
      employeeCount: "5",
      sellsTaxableGoods: "true",
      annualPayroll: -1,
    });
    const byField = Object.fromEntries(issues.map((i) => [i.field, i]));
    expect(byField.employeeCount?.suggestion).toBe("5");
    expect(byField.sellsTaxableGoods?.suggestion).toBe("true");
    expect(byField.annualPayroll?.message).toMatch(/negative/);
  });

  it("checks nested multistate and vehicle fields", () => {
    const issues = validateProfile({
      ...base,
      multistate: [{ state: "California", employes: 1 }],
      commercialVehicles: { forHire: "yes" },
    });
    const fields = issues.map((i) => i.field);
    expect(fields).toContain("multistate[0].state");
    expect(fields).toContain("multistate[0].employes");
    expect(fields).toContain("commercialVehicles.interstate");
    expect(fields).toContain("commercialVehicles.forHire");
  });

  it("requires the core fields and rejects non-objects", () => {
    expect(validateProfile({}).map((i) => i.field)).toEqual(["entityType", "zip", "city", "county"]);
    expect(validateProfile(null)[0]?.message).toMatch(/object/);
    expect(validateProfile("llc")[0]?.message).toMatch(/object/);
  });

  it("is used by evaluate, which reports every issue at once", () => {
    try {
      // @ts-expect-error deliberately wrong
      evaluate({ ...base, employes: 5, entityType: "LLC" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidProfileError);
      const err = e as InvalidProfileError;
      expect(err.issues).toHaveLength(2);
      expect(err.message).toMatch(/did you mean `employeeCount`/);
    }
  });

  it("stays in sync with the JSON schema", () => {
    const schemaFields = Object.keys(schema.properties).sort();
    expect([...PROFILE_FIELDS].filter((f) => f !== "country").sort()).toEqual(
      schemaFields.filter((f) => f !== "country"),
    );
    for (const [field, values] of Object.entries(PROFILE_ENUMS)) {
      expect([...values].sort(), field).toEqual([...schema.properties[field].enum].sort());
    }
  });
});
