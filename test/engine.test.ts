import { describe, expect, it } from "vitest";
import { getComplianceItems, InvalidProfileError, stateFromZip } from "../src/index.js";

const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe("stateFromZip", () => {
  it.each([
    ["94105", "CA"], ["10001", "NY"], ["77002", "TX"], ["20001", "DC"],
    ["22201", "VA"], ["21201", "MD"], ["99501", "AK"], ["96813", "HI"],
  ])("%s -> %s", (zip, st) => expect(stateFromZip(zip)).toBe(st));

  it("rejects malformed ZIPs", () => expect(stateFromZip("9410")).toBeUndefined());
});

describe("getComplianceItems", () => {
  it("returns EIN and 1040 Schedule C basics for a solo sole proprietor with no EIN need", () => {
    const items = getComplianceItems({ entityType: "sole_proprietorship", zip: "94105" });
    expect(ids(items)).not.toContain("fed.ein");
    expect(items.find((i) => i.id === "fed.income-tax-return")?.title).toMatch(/Schedule C/);
    expect(ids(items)).not.toContain("state.registered-agent");
  });

  it("covers payroll obligations for employers", () => {
    const items = getComplianceItems({ entityType: "llc", zip: "78701", hasEmployees: true });
    expect(ids(items)).toEqual(
      expect.arrayContaining(["fed.ein", "state.employer#0", "state.employer#3"]),
    );
    expect(items.some((i) => i.title.includes("Form 941"))).toBe(true);
    const wc = items.find((i) => i.title.includes("workers' compensation"));
    expect(wc?.needsVerification).toBe(true); // TX
  });

  it("applies California LLC franchise tax and gross receipts fee", () => {
    const items = getComplianceItems({ entityType: "llc", zip: "90001", annualRevenue: 500_000 });
    expect(items.some((i) => i.title.includes("$800"))).toBe(true);
    expect(items.some((i) => i.title.includes("Form 3536"))).toBe(true);
  });

  it("adds foreign registration when formed elsewhere", () => {
    const items = getComplianceItems({ entityType: "llc", zip: "10001", formationState: "DE" });
    expect(items.some((i) => i.title.startsWith("Register as a foreign LLC in New York"))).toBe(true);
    expect(items.some((i) => i.title.includes("Delaware") && i.category === "filing")).toBe(true);
  });

  it("maps LLC tax classification to the right federal return", () => {
    const items = getComplianceItems({ entityType: "llc", zip: "33101", llcTaxClassification: "s_corp" });
    expect(items.find((i) => i.id === "fed.income-tax-return")?.title).toMatch(/1120-S/);
  });

  it("handles states without sales tax", () => {
    const items = getComplianceItems({ entityType: "llc", zip: "97201", sellsTaxableGoods: true });
    expect(ids(items)).not.toContain("state.sales-tax-permit#0");
    expect(items.find((i) => i.id === "state.sales-tax-permit")?.needsVerification).toBe(true);
  });

  it("adds formation filing and exempt application for a new nonprofit", () => {
    const items = getComplianceItems({ entityType: "nonprofit", zip: "60601", isFormed: false });
    expect(ids(items)).toEqual(expect.arrayContaining(["state.formation", "fed.exempt-application"]));
    expect(ids(items)).not.toContain("fed.income-tax-return");
  });

  it("adds industry items", () => {
    const items = getComplianceItems({ entityType: "llc", zip: "98101", industry: "restaurant" });
    expect(ids(items)).toContain("industry.food-service#0");
    expect(ids(items)).toContain("state.sales-tax-permit#0");
  });

  it("produces unique ids", () => {
    const items = getComplianceItems({
      entityType: "llc", zip: "10001", formationState: "DE", hasEmployees: true,
      paysContractors: true, sellsTaxableGoods: true, otherStates: ["NJ", "CT"],
    });
    expect(new Set(ids(items)).size).toBe(items.length);
  });

  it("explicit state overrides ZIP and invalid input throws", () => {
    const items = getComplianceItems({ entityType: "llc", zip: "94105", state: "NV" });
    expect(items.some((i) => i.state === "NV")).toBe(true);
    expect(() => getComplianceItems({ entityType: "llc", zip: "00000" })).toThrow(InvalidProfileError);
    expect(() => getComplianceItems({ entityType: "llc", zip: "94105", state: "ZZ" })).toThrow(InvalidProfileError);
  });
});
