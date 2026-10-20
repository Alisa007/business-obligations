import { describe, expect, it } from "vitest";
import { evaluate, industryFromNaics, type Rule } from "../src";

const austin = { entityType: "llc", zip: "78701", city: "Austin", county: "Travis" } as const;
const ids = (r: ReturnType<typeof evaluate>) => r.items.map((i) => i.ruleId);

describe("Census FIPS codes", () => {
  it("adds county and place codes to bundled places, with incorporated status", () => {
    const { items } = evaluate({ ...austin, sellsTaxableGoods: true }, { asOf: "2026-10-14" });
    const county = items.find((i) => i.jurisdiction === "county" && i.fips);
    if (county) expect(county.fips).toBe("48453");
    const city = items.find((i) => i.jurisdiction === "city" && i.fips);
    expect(city?.fips).toBe("4805000");
    expect(city?.incorporated).toBe(true);
  });

  it("leaves fips unset for places that are not in the data", () => {
    const { items } = evaluate({ ...austin, city: "Nowhereville", county: "Nowhere" });
    expect(items.some((i) => i.jurisdiction === "city" && i.fips)).toBe(false);
  });
});

describe("rules driven by the new inputs", () => {
  it("adds a sign permit only when the business has signage", () => {
    expect(ids(evaluate(austin))).not.toContain("local.sign-permit");
    expect(ids(evaluate({ ...austin, hasSignage: true }))).toContain("local.sign-permit");
  });

  it("adds a building permit for construction projects with a stated value", () => {
    const b = { ...austin, industry: "construction" } as const;
    expect(ids(evaluate(b))).not.toContain("industry.construction-building-permit");
    expect(ids(evaluate({ ...b, projectValueUsd: 250000 }))).toContain(
      "industry.construction-building-permit",
    );
  });

  it("adds a food permit for non-restaurants that serve food", () => {
    const r = { ...austin, industry: "retail", foodService: true } as const;
    expect(ids(evaluate(r))).toContain("industry.food-service-premises");
    expect(ids(evaluate({ ...r, industry: "restaurant" }))).not.toContain("industry.food-service-premises");
  });

  it("mentions the requested contractor class", () => {
    const item = evaluate({ ...austin, industry: "construction", licenseClass: "B-1" }).items.find(
      (i) => i.ruleId === "industry.construction",
    )!;
    expect(item.description).toContain("B-1");
  });

  it("infers the industry from a NAICS code only when industry is not given", () => {
    expect(evaluate({ ...austin, naics: "236220" }).profile.industry).toBe("construction");
    expect(evaluate({ ...austin, naics: "722511" }).profile.industry).toBe("restaurant");
    expect(evaluate({ ...austin, naics: "236220", industry: "retail" }).profile.industry).toBe("retail");
    expect(() => evaluate({ ...austin, naics: "abc" })).toThrow(/NAICS/);
  });

  it("derives the alcohol activity and the profession from a NAICS code", () => {
    const brewery = evaluate({ ...austin, naics: "312120" }).profile;
    expect([brewery.industry, brewery.alcoholActivity]).toEqual(["alcohol", "manufacture"]);
    const shop = evaluate({ ...austin, naics: "445320" }).profile;
    expect([shop.industry, shop.alcoholActivity]).toEqual(["alcohol", "retail"]);
    expect(evaluate({ ...austin, naics: "722410" }).profile.industry).toBe("alcohol");
    expect(evaluate({ ...austin, naics: "722515" }).profile.industry).toBe("restaurant");
    const law = evaluate({ ...austin, naics: "541110" }).profile;
    expect([law.industry, law.profession]).toEqual(["professional_services", "attorney"]);
    expect(evaluate({ ...austin, naics: "541211" }).profile.profession).toBe("cpa");
    expect(evaluate({ ...austin, naics: "624410" }).profile.industry).toBe("childcare");
    expect(evaluate({ ...austin, naics: "541511" }).profile.industry).toBe("general");
    expect(industryFromNaics("54")).toBeUndefined();
  });

  it("lets explicit answers win over the code", () => {
    const p = evaluate({ ...austin, naics: "312120", industry: "retail" }).profile;
    expect([p.industry, p.alcoholActivity]).toEqual(["retail", undefined]);
    const q = evaluate({ ...austin, naics: "445320", alcoholActivity: "wholesale" }).profile;
    expect(q.alcoholActivity).toBe("wholesale");
  });
});

describe("precedence", () => {
  it("marks superseded items as preempted by the item that supersedes them", () => {
    const pack: Rule[] = [
      {
        id: "x.state",
        description: "State default requirement",
        inputs: ["state"],
        when: () => true,
        items: (p) => ({
          title: "State requirement",
          category: "license",
          jurisdiction: "state",
          state: p.state,
          authority: "State",
          description: "d",
          frequency: "once",
          reason: "r",
        }),
      },
      {
        id: "x.city",
        description: "City replacement",
        inputs: ["city"],
        when: () => true,
        items: (p) => ({
          title: "City requirement",
          category: "license",
          jurisdiction: "city",
          state: p.state,
          authority: "City",
          description: "d",
          frequency: "once",
          reason: "r",
          supersedes: ["x.state:TX"],
        }),
      },
    ];
    const { items } = evaluate(austin, { rules: pack });
    const state = items.find((i) => i.ruleId === "x.state")!;
    const city = items.find((i) => i.ruleId === "x.city")!;
    expect(state.id).toBe("x.state:TX");
    expect(state.preemptedBy).toBe(city.id);
    expect(city.preemptedBy).toBeUndefined();
  });
});

describe("form ids", () => {
  it("sets form ids on the federal payroll and information returns", () => {
    const r = evaluate({ ...austin, employeeCount: 2, largestContractorPaymentUsd: 5000 });
    const form = (rule: string, title: RegExp) =>
      r.items.find((i) => i.ruleId === rule && title.test(i.title))?.formId;
    expect(form("fed.payroll-deposits", /941/)).toBe("941");
    expect(form("fed.payroll-deposits", /940/)).toBe("940");
    expect(form("fed.1099-nec", /1099/)).toBe("1099-NEC");
  });
});

describe("consolidated governments and renewal", () => {
  it("matches consolidated city-counties and independent cities explicitly", () => {
    const tn = evaluate({ entityType: "llc", zip: "37201", city: "Nashville", county: "Davidson" });
    expect(tn.items.find((i) => i.jurisdiction === "city")?.fips).toBe("4752006");
  });

  it("derives a renewal cycle for recurring licences and permits", () => {
    const { items } = evaluate({ ...austin, industry: "restaurant" });
    const permit = items.find((i) => i.category === "permit" && i.frequency === "annual")!;
    expect(permit.renewal).toMatch(/^Renew every year/);
    expect(items.find((i) => i.frequency === "once")?.renewal).toBeUndefined();
  });
});

describe("sourced facts", () => {
  it("states Florida's local contractor-licensing preemption only for Florida", () => {
    const fl = evaluate({
      entityType: "llc",
      zip: "33101",
      city: "Miami",
      county: "Miami-Dade",
      industry: "construction",
    });
    const item = fl.items.find((i) => i.ruleId === "industry.construction")!;
    expect(item.exemptions?.join(" ")).toMatch(/163\.211/);
    const tx = evaluate({ ...austin, industry: "construction" }).items.find(
      (i) => i.ruleId === "industry.construction",
    )!;
    expect(tx.exemptions).toBeUndefined();
  });

  it("gives IRS processing figures for tax-exempt applications", () => {
    const item = evaluate({ ...austin, entityType: "nonprofit" }).items.find(
      (i) => i.ruleId === "fed.exempt-application",
    )!;
    expect(item.processingTime).toMatch(/22 days/);
  });
});

describe("precedence authored in seed data", () => {
  it("passes appliesWhen, exemptions and supersedes through a city seed", async () => {
    const { indexCities, seededCityRule, defaultRules } = await import("../src");
    const seed = {
      state: "TX",
      city: "Austin",
      counties: ["Travis"],
      status: "rules" as const,
      items: [
        {
          id: "austin-tx.replacement",
          title: "City registration replacing the state default",
          category: "registration" as const,
          authority: "City of Austin",
          description: "d",
          rrule: "FREQ=YEARLY",
          url: ["https://www.austintexas.gov/"],
          appliesTo: ["all" as const],
          feeDetail: { basis: "unknown" as const },
          penalty: { basis: "unknown" as const },
          appliesWhen: [{ field: "employeeCount", op: ">=" as const, value: 1 }],
          exemptions: ["Sole proprietors"],
          supersedes: ["fed.ein"],
        },
      ],
      checkedOn: "2026-10-01",
    };
    const rules = [...defaultRules, seededCityRule(indexCities([seed]), "test.seed")];
    const { items } = evaluate({ ...austin, employeeCount: 2 }, { rules, asOf: "2026-10-14" });
    const mine = items.find((i) => i.ruleId === "test.seed")!;
    expect(mine.appliesWhen).toEqual(seed.items[0]!.appliesWhen);
    expect(mine.exemptions).toEqual(["Sole proprietors"]);
    expect(mine.provenance).toMatchObject({ confidence: "checked", checkedOn: "2026-10-01" });
    // A rule id target marks every item that rule produced.
    expect(items.find((i) => i.ruleId === "fed.ein")!.preemptedBy).toBe(mine.id);
  });
});
