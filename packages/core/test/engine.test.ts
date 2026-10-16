import { describe, expect, it } from "vitest";
import { getComplianceItems, InvalidProfileError, stateFromZip, STATES } from "../src";
import type { BusinessProfile } from "../src";

const base = { city: "Springfield", county: "Greene" };
const profile = (
  p: Partial<BusinessProfile> & Pick<BusinessProfile, "entityType" | "zip">,
): BusinessProfile => ({
  ...base,
  ...p,
});
const ids = (items: { id: string }[]) => items.map((i) => i.id);
const titles = (items: { title: string }[]) => items.map((i) => i.title);

describe("stateFromZip", () => {
  it.each([
    ["94105", "CA"],
    ["10001", "NY"],
    ["77002", "TX"],
    ["20001", "DC"],
    ["22201", "VA"],
    ["21201", "MD"],
    ["99501", "AK"],
    ["96813", "HI"],
  ])("%s -> %s", (zip, st) => expect(stateFromZip(zip)).toBe(st));

  it("rejects malformed ZIPs", () => expect(stateFromZip("9410")).toBeUndefined());
});

describe("input validation", () => {
  it("requires city and county", () => {
    expect(() => getComplianceItems({ entityType: "llc", zip: "94105", city: "", county: "SF" })).toThrow(
      /city/,
    );
    expect(() => getComplianceItems({ entityType: "llc", zip: "94105", city: "SF", county: "" })).toThrow(
      /county/,
    );
  });

  it("requires alcoholActivity for alcohol and commercialVehicles for transportation", () => {
    expect(() =>
      getComplianceItems(profile({ entityType: "llc", zip: "94105", industry: "alcohol" })),
    ).toThrow(/alcoholActivity/);
    expect(() =>
      getComplianceItems(profile({ entityType: "llc", zip: "94105", industry: "transportation" })),
    ).toThrow(/commercialVehicles/);
  });

  it("rejects unknown states and undeterminable ZIPs", () => {
    expect(() => getComplianceItems(profile({ entityType: "llc", zip: "00000" }))).toThrow(
      InvalidProfileError,
    );
    expect(() => getComplianceItems(profile({ entityType: "llc", zip: "94105", state: "ZZ" }))).toThrow(
      InvalidProfileError,
    );
    expect(() =>
      getComplianceItems(profile({ entityType: "llc", zip: "94105", multistate: [{ state: "ZZ" }] })),
    ).toThrow(InvalidProfileError);
  });

  it("no output item carries a verification flag", () => {
    const items = getComplianceItems(profile({ entityType: "llc", zip: "94105" }));
    expect(items.every((i) => !("needsVerification" in i))).toBe(true);
  });
});

describe("federal", () => {
  it("sole proprietor without employees: Schedule C, no EIN", () => {
    const items = getComplianceItems(profile({ entityType: "sole_proprietorship", zip: "94105" }));
    expect(ids(items)).not.toContain("fed.ein");
    expect(items.find((i) => i.id === "fed.income-tax-return")?.title).toMatch(/Schedule C/);
  });

  it("derives deposit schedule from lookback liability", () => {
    const get = (liability?: number) =>
      getComplianceItems(
        profile({
          entityType: "llc",
          zip: "78701",
          employeeCount: 3,
          priorYearPayrollTaxLiability: liability,
        }),
      ).find((i) => i.title === "Deposit federal payroll taxes")!;
    expect(get(undefined).frequency).toBe("monthly");
    expect(get(40_000).frequency).toBe("monthly");
    expect(get(60_000).frequency).toBe("per_event");
    expect(get(120_000).deadline).toMatch(/Next business day/);
  });

  it("1099-NEC depends on the largest contractor payment", () => {
    const has = (n: number) =>
      titles(
        getComplianceItems(profile({ entityType: "llc", zip: "78701", largestContractorPaymentUsd: n })),
      ).some((t) => t.includes("1099-NEC"));
    expect(has(1999)).toBe(false);
    expect(has(2000)).toBe(true);
  });

  it("estimated tax depends on net income", () => {
    const has = (n: number) =>
      ids(getComplianceItems(profile({ entityType: "llc", zip: "78701", annualNetIncome: n }))).includes(
        "fed.estimated-tax",
      );
    expect(has(0)).toBe(false);
    expect(has(50_000)).toBe(true);
  });

  it("corporate estimated tax follows the corporation's tax year, not the owners' calendar", () => {
    const due = (extra: object) =>
      getComplianceItems(
        profile({ entityType: "c_corp", zip: "78701", annualNetIncome: 100_000, ...extra }),
        {
          asOf: "2026-01-01",
        },
      ).find((i) => i.id === "fed.estimated-tax")!;
    expect(due({}).deadline).toBe("April 15, June 15, September 15, December 15");
    expect(due({ fiscalYearEndMonth: 6 }).deadline).toBe("October 15, December 15, March 15, June 15");
    const owners = getComplianceItems(
      profile({ entityType: "llc", zip: "78701", annualNetIncome: 100_000 }),
    ).find((i) => i.id === "fed.estimated-tax")!;
    expect(owners.deadline).toBe("April 15, June 15, September 15, January 15");
  });

  it("maps LLC tax classification to the right federal return", () => {
    const items = getComplianceItems(
      profile({ entityType: "llc", zip: "33101", llcTaxClassification: "s_corp" }),
    );
    expect(items.find((i) => i.id === "fed.income-tax-return")?.title).toMatch(/1120-S/);
  });

  it("TTB permit by alcohol activity; retail has none", () => {
    const run = (a: "manufacture" | "import" | "wholesale" | "retail") =>
      ids(
        getComplianceItems(
          profile({ entityType: "llc", zip: "94105", industry: "alcohol", alcoholActivity: a }),
        ),
      );
    expect(run("wholesale")).toContain("fed.ttb-alcohol");
    expect(run("manufacture")).toContain("fed.ttb-alcohol");
    expect(run("retail")).not.toContain("fed.ttb-alcohol");
  });

  it("USDOT only for interstate vehicles over thresholds", () => {
    const has = (v: NonNullable<BusinessProfile["commercialVehicles"]>) =>
      ids(
        getComplianceItems(
          profile({ entityType: "llc", zip: "75201", industry: "transportation", commercialVehicles: v }),
        ),
      ).includes("industry.transportation");
    expect(has({ interstate: true, grossWeightLbs: 26_000 })).toBe(true);
    expect(has({ interstate: true, grossWeightLbs: 9_000 })).toBe(false);
    expect(has({ interstate: false, grossWeightLbs: 26_000 })).toBe(false);
    expect(has({ interstate: true, grossWeightLbs: 5_000, passengerCapacity: 12, forHire: true })).toBe(true);
  });
});

describe("state", () => {
  it("California LLC franchise tax and gross receipts fee", () => {
    const items = getComplianceItems(profile({ entityType: "llc", zip: "90001", annualRevenue: 500_000 }));
    expect(titles(items).some((t) => t.includes("$800"))).toBe(true);
    expect(titles(items).some((t) => t.includes("Form 3536"))).toBe(true);
  });

  it("workers' comp is derived from employee count and state thresholds", () => {
    const wc = (zip: string, employeeCount: number, extra: Partial<BusinessProfile> = {}) =>
      titles(getComplianceItems(profile({ entityType: "llc", zip, employeeCount, ...extra }))).some((t) =>
        t.includes("workers' compensation"),
      );
    expect(wc("35203", 4)).toBe(false); // AL needs 5
    expect(wc("35203", 5)).toBe(true);
    expect(wc("33101", 3)).toBe(false); // FL needs 4
    expect(wc("33101", 1, { industry: "construction" })).toBe(true); // FL construction 1
    expect(wc("94105", 1)).toBe(true);
    expect(wc("66101", 2, { annualPayroll: 15_000 })).toBe(false); // KS needs payroll > 20k
    expect(wc("66101", 2, { annualPayroll: 25_000 })).toBe(true);
    // SC: 4 employees and payroll of $3,000 or more (at or above, not over)
    expect(wc("29201", 4, { annualPayroll: 2_999 })).toBe(false);
    expect(wc("29201", 4, { annualPayroll: 3_000 })).toBe(true);
    expect(wc("29201", 3, { annualPayroll: 50_000 })).toBe(false);
  });

  it("Texas workers' comp is elective", () => {
    const items = getComplianceItems(profile({ entityType: "llc", zip: "78701", employeeCount: 2 }));
    expect(titles(items).some((t) => t.includes("elective"))).toBe(true);
  });

  it("paid leave honors employee thresholds (DE needs 10)", () => {
    const has = (n: number) =>
      titles(getComplianceItems(profile({ entityType: "llc", zip: "19901", employeeCount: n }))).some((t) =>
        t.includes("Paid Family and Medical Leave"),
      );
    expect(has(9)).toBe(false);
    expect(has(10)).toBe(true);
  });

  it("states without wage tax skip withholding registration", () => {
    const has = (zip: string) =>
      titles(getComplianceItems(profile({ entityType: "llc", zip, employeeCount: 1 }))).some((t) =>
        t.includes("income tax withholding"),
      );
    expect(has("77002")).toBe(false); // TX
    expect(has("94105")).toBe(true);
  });

  it("formed elsewhere: foreign registration and foreign annual report in the operating state", () => {
    const items = getComplianceItems(profile({ entityType: "llc", zip: "10001", formationState: "DE" }));
    expect(titles(items).some((t) => t.startsWith("Register as a foreign LLC in New York"))).toBe(true);
    expect(titles(items).some((t) => t.includes("foreign entity") && t.includes("New York"))).toBe(true);
    expect(titles(items).some((t) => t.includes("Delaware"))).toBe(true);
  });

  it("other states: physical presence registers; sales alone uses economic nexus", () => {
    const items = getComplianceItems(
      profile({
        entityType: "llc",
        zip: "10001",
        sellsTaxableGoods: true,
        multistate: [
          { state: "NJ", employeeCount: 2 },
          { state: "CA", salesUsd: 400_000 }, // below CA $500k
          { state: "WA", salesUsd: 150_000 }, // above $100k
        ],
      }),
    );
    const t = titles(items);
    expect(t.some((x) => x.startsWith("Register as a foreign LLC in New Jersey"))).toBe(true);
    expect(t.some((x) => x.includes("(New Jersey)") && x.includes("unemployment"))).toBe(true);
    expect(items.some((i) => i.id.startsWith("state.sales-tax") && i.state === "WA")).toBe(true);
    expect(items.some((i) => i.id.startsWith("state.sales-tax") && i.state === "CA")).toBe(false);
    expect(t.some((x) => x.includes("foreign LLC in Washington"))).toBe(false);
  });

  it("states without sales tax return the alternative regime", () => {
    const items = getComplianceItems(profile({ entityType: "llc", zip: "97201", sellsTaxableGoods: true }));
    const item = items.find((i) => i.id === "state.sales-tax:OR");
    expect(item?.title).toMatch(/Oregon/);
    expect(item?.description).toMatch(/no sales tax/);
  });

  it("DBA authority follows the state's filing level", () => {
    const dba = (zip: string) =>
      getComplianceItems(
        profile({ entityType: "sole_proprietorship", zip, usesTradeName: true, county: "Kings" }),
      ).find((i) => i.title.includes("DBA"));
    expect(dba("94105")?.authority).toMatch(/Kings County — County clerk/);
    expect(dba("33101")?.authority).toMatch(/Florida/);
    expect(dba("29401")).toBeUndefined(); // SC: none
  });

  it("new nonprofit gets formation and exemption items", () => {
    const items = getComplianceItems(profile({ entityType: "nonprofit", zip: "60601", isFormed: false }));
    expect(ids(items)).toEqual(expect.arrayContaining(["state.formation:IL", "fed.exempt-application"]));
    expect(ids(items)).not.toContain("fed.income-tax-return");
  });

  it("local items name the city and county from input", () => {
    const items = getComplianceItems(
      profile({
        entityType: "llc",
        zip: "94105",
        city: "San Francisco",
        county: "San Francisco",
        industry: "restaurant",
      }),
    );
    expect(items.find((i) => i.id === "local.business-license:CA")?.title).toMatch(/San Francisco/);
    expect(items.find((i) => i.id === "industry.food-service:CA")?.authority).toMatch(
      /San Francisco County health department/,
    );
  });

  it("produces unique ids", () => {
    const items = getComplianceItems(
      profile({
        entityType: "llc",
        zip: "10001",
        formationState: "DE",
        employeeCount: 3,
        largestContractorPaymentUsd: 5000,
        sellsTaxableGoods: true,
        multistate: [
          { state: "NJ", employeeCount: 1 },
          { state: "CT", salesUsd: 200_000 },
        ],
      }),
    );
    expect(new Set(ids(items)).size).toBe(items.length);
  });
});

describe("state coverage", () => {
  const codes = Object.keys(STATES);

  it("covers the 50 states and DC", () => expect(codes).toHaveLength(51));

  it.each(codes)("%s has complete data", (code) => {
    const s = STATES[code]!;
    for (const a of [s.filing, s.revenue, s.labor]) {
      expect(a.name.length).toBeGreaterThan(3);
      expect(a.url).toMatch(/^https:\/\//);
    }
    expect(s.workersComp.agency).toBeTruthy();
    expect(s.entityTax).toBeTruthy();
    expect(s.local.authority).toBeTruthy();
    if (!s.salesTax.statewide) expect(s.salesTax.alternative).toBeTruthy();
    const ind = s.industry;
    expect([ind.realEstate, ind.alcohol, ind.childCare, ind.health].every(Boolean)).toBe(true);
    expect(s.dbaFiling).toBeTruthy();
    expect(s.salesTax.statewide ? s.economicNexusUsd : null).not.toBe(undefined);
  });

  it.each(codes)("%s produces state-specific items for a fully loaded profile", (code) => {
    const items = getComplianceItems(
      profile({
        entityType: "llc",
        zip: "00000",
        state: code,
        employeeCount: 12,
        annualPayroll: 500_000,
        sellsTaxableGoods: true,
        industry: "construction",
        usesTradeName: true,
      }),
    );
    const s = STATES[code]!;
    const text = JSON.stringify(items);
    expect(text).toContain(s.filing.name);
    expect(text).toContain(s.labor.name);
    expect(text).toContain(s.workersComp.agency);
    expect(items.filter((i) => i.state && i.state !== code)).toHaveLength(0);
    expect(new Set(ids(items)).size).toBe(items.length);
  });
});
