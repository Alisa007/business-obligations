import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import {
  BUNDLED_CHANGES,
  RULESET_VERSION,
  evaluate,
  getComplianceItems,
  listChanges,
  previewChanges,
  type RuleChange,
} from "../src";

const base = { city: "Austin", county: "Travis", zip: "78701", entityType: "llc" } as const;

const feeChange: RuleChange = {
  id: "tx-franchise-report-fee-2027-01-01",
  effective: "2027-01-01",
  status: "enacted",
  kind: "fee",
  summary: "Test: Texas report fee changes to $25.",
  scope: { state: "TX", rules: ["state.annual-report"] },
  patches: [{ path: "llcReport.feeDetail.note", value: "test fee change" }],
};

const reportDescription = (asOf: string, changes: RuleChange[]) =>
  evaluate({ ...base, formationDate: "2020-01-01" }, { asOf, changes }).items.find((i) =>
    i.id.startsWith("state.annual-report:TX"),
  )?.description;

describe("change registry", () => {
  it("is valid against the schema and has unique ids", () => {
    const root = path.resolve(__dirname, "..");
    const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
    const validate = new Ajv2020({ allErrors: true, strict: false }).compile(
      read("schema/changes.schema.json"),
    );
    const data = read("data/changes.json");
    expect(validate.errors ?? []).toEqual([]);
    expect(validate(data)).toBe(true);
    const ids = data.changes.map((c: RuleChange) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exposes a ruleset version and sorted bundled changes", () => {
    expect(RULESET_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    const dates = BUNDLED_CHANGES.map((c) => c.effective);
    expect([...dates].sort()).toEqual(dates);
  });

  it("filters changes", () => {
    expect(listChanges({ state: "PA" }).every((c) => c.scope.state === "PA")).toBe(true);
    expect(listChanges({ from: "2027-01-01" }).every((c) => c.effective >= "2027-01-01")).toBe(true);
    expect(listChanges({ status: "proposed" }).every((c) => c.status === "proposed")).toBe(true);
  });
});

describe("effective-dated rules", () => {
  it("applies an enacted patch only once its effective date is reached", () => {
    expect(reportDescription("2026-12-31", [feeChange])).not.toMatch(/test fee change/);
    expect(reportDescription("2027-01-01", [feeChange])).toMatch(/test fee change/);
    expect(reportDescription("2028-06-01", [feeChange])).toMatch(/test fee change/);
  });

  it("never applies proposed changes", () => {
    const proposed = { ...feeChange, status: "proposed" as const };
    expect(reportDescription("2030-01-01", [proposed])).not.toMatch(/test fee change/);
  });

  it("does not leak patched data between evaluations", () => {
    reportDescription("2027-06-01", [feeChange]);
    expect(reportDescription("2026-10-12", [])).not.toMatch(/test fee change/);
    // bundled data is untouched
    const items = getComplianceItems({ ...base, formationDate: "2020-01-01" });
    expect(items.find((i) => i.id.startsWith("state.annual-report:TX"))?.description).not.toMatch(
      /test fee change/,
    );
  });
});

describe("upcoming and recent changes", () => {
  const pa = { entityType: "llc", zip: "19101", city: "Philadelphia", county: "Philadelphia" } as const;

  it("attaches upcoming changes to the affected items and the result", () => {
    const r = evaluate(pa, { asOf: "2026-10-13" });
    const report = r.items.find((i) => i.id.startsWith("state.annual-report:PA"));
    expect(report?.upcomingChanges?.map((c) => c.id)).toContain("pa-annual-report-full-enforcement-2027");
    expect(r.upcomingChanges.map((c) => c.id)).toContain("pa-annual-report-full-enforcement-2027");
    expect(r.rulesetVersion).toBe(RULESET_VERSION);
  });

  it("drops a change from upcoming once it has taken effect and lists it as recent", () => {
    const r = evaluate(pa, { asOf: "2027-02-01" });
    expect(r.upcomingChanges.map((c) => c.id)).not.toContain("pa-annual-report-full-enforcement-2027");
    expect(r.recentChanges.map((c) => c.id)).toContain("pa-annual-report-full-enforcement-2027");
    expect(r.items.find((i) => i.id.startsWith("state.annual-report:PA"))?.upcomingChanges).toBeUndefined();
  });

  it("ignores changes for states the business has no tie to", () => {
    const r = evaluate({ ...base }, { asOf: "2026-10-13" });
    expect(r.upcomingChanges.some((c) => c.id.startsWith("pa-"))).toBe(false);
  });

  it("includes a state when the business registers there via multistate", () => {
    const r = evaluate({ ...base, multistate: [{ state: "PA", employeeCount: 1 }] }, { asOf: "2026-10-13" });
    expect(r.upcomingChanges.some((c) => c.id.startsWith("pa-"))).toBe(true);
  });

  it("country-wide changes attach to matching rules", () => {
    const r = evaluate(
      { ...base, industry: "cannabis", cannabisActivity: "retail", state: "CO" },
      { asOf: "2026-10-13" },
    );
    expect(r.upcomingChanges.map((c) => c.id)).toContain("fed-hemp-thc-container-limit-2026-11-12");
  });
});

describe("previewChanges", () => {
  it("reports changed, added and removed items between two dates", () => {
    const add: RuleChange = {
      id: "test-new-requirement",
      effective: "2027-03-01",
      status: "enacted",
      kind: "requirement",
      summary: "Test change that alters the Texas business license item.",
      scope: { state: "TX", rules: ["local.business-license"] },
      patches: [{ path: "local.title", value: "New Texas business licence" }],
    };
    const p = previewChanges(
      { ...base, formationDate: "2020-01-01" },
      { from: "2026-10-13", to: "2027-06-01", changes: [feeChange, add] },
    );
    expect(p.changed.map((c) => c.id)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^state\.annual-report:TX/),
        "local.business-license:TX",
      ]),
    );
    const report = p.changed.find((c) => c.id.startsWith("state.annual-report:TX"))!;
    expect(report.fields.description).toBeDefined();
    expect(p.added).toEqual([]);
    expect(p.removed).toEqual([]);
    expect(p.changes.map((c) => c.id)).toEqual(expect.arrayContaining(["test-new-requirement"]));
  });

  it("is empty when nothing changes in the window", () => {
    const p = previewChanges({ ...base }, { from: "2026-10-13", to: "2026-10-14" });
    expect(p.added).toHaveLength(0);
    expect(p.removed).toHaveLength(0);
    expect(p.changed).toHaveLength(0);
  });
});
