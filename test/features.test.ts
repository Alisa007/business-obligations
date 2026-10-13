import { describe, expect, it } from "vitest";
import { DISCLAIMER, evaluate, getComplianceItems, listRules, InvalidProfileError } from "../src";
import { lookupZip, withZip } from "../src/zip-entry";

const base = { city: "Springfield", county: "Greene", zip: "65801" } as const;
const titles = (items: { title: string }[]) => items.map((i) => i.title);

describe("evaluate envelope", () => {
  it("returns items, resolved profile, disclaimer and data version", () => {
    const r = evaluate({ ...base, entityType: "llc" }, { asOf: "2026-10-12" });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.profile.state).toBe("MO");
    expect(r.asOf).toBe("2026-10-12");
    expect(r.disclaimer).toBe(DISCLAIMER);
    expect(r.dataVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rejects bad dates and unsupported countries", () => {
    expect(() => evaluate({ ...base, entityType: "llc" }, { asOf: "tomorrow" })).toThrow(InvalidProfileError);
    // @ts-expect-error unsupported country
    expect(() => evaluate({ ...base, entityType: "llc", country: "CA" })).toThrow(/Unsupported country/);
    expect(() => evaluate({ ...base, entityType: "llc", formationDate: "01/02/2020" })).toThrow(
      /formationDate/,
    );
    expect(() => evaluate({ ...base, entityType: "llc", fiscalYearEndMonth: 13 })).toThrow(
      /fiscalYearEndMonth/,
    );
  });
});

describe("rule introspection", () => {
  it("lists rules with unique ids and declared inputs", () => {
    const rules = listRules();
    expect(new Set(rules.map((r) => r.id)).size).toBe(rules.length);
    for (const r of rules) {
      expect(r.description.length).toBeGreaterThan(5);
      expect(r.inputs.length).toBeGreaterThan(0);
    }
  });
});

describe("entity types", () => {
  const run = (entityType: Parameters<typeof getComplianceItems>[0]["entityType"], extra = {}) =>
    titles(
      getComplianceItems({ ...base, entityType, formationState: "DE", ...extra }, { asOf: "2026-10-12" }),
    );

  it("PLLC follows LLC reporting and adds a licensing-board item", () => {
    const t = run("pllc", { profession: "attorney" });
    expect(t.some((x) => x.includes("Delaware") && x.includes("LLC annual tax"))).toBe(true);
    expect(t.some((x) => x.includes("licensing board (attorney)"))).toBe(true);
  });

  it("LP files as a partnership", () => {
    const items = getComplianceItems({ ...base, entityType: "lp" });
    expect(items.find((i) => i.id === "fed.income-tax-return")?.title).toMatch(/1065/);
    expect(titles(items).some((x) => x.includes("registered agent"))).toBe(true);
  });

  it("professional corporation and benefit corporation behave as corporations", () => {
    expect(
      getComplianceItems({ ...base, entityType: "pc", profession: "attorney" }).find(
        (i) => i.id === "fed.income-tax-return",
      )?.title,
    ).toMatch(/1120$/);
    expect(
      getComplianceItems({ ...base, entityType: "pc", profession: "attorney", sCorpElection: true }).find(
        (i) => i.id === "fed.income-tax-return",
      )?.title,
    ).toMatch(/1120-S/);
    expect(run("benefit_corp").some((x) => x.includes("benefit report"))).toBe(true);
  });
});

describe("paid sick leave and notices", () => {
  it("applies state mandates by employee count", () => {
    const has = (zip: string, n: number) =>
      titles(getComplianceItems({ ...base, zip, entityType: "llc", employeeCount: n })).some((t) =>
        t.includes("paid sick leave"),
      );
    expect(has("85001", 1)).toBe(true); // AZ
    expect(has("06103", 24)).toBe(false); // CT needs 25
    expect(has("06103", 25)).toBe(true);
    expect(has("65801", 50)).toBe(false); // MO: none
  });

  it("returns workplace notices once employees exist", () => {
    const items = getComplianceItems({ ...base, entityType: "llc", employeeCount: 1 });
    expect(titles(items)).toEqual(
      expect.arrayContaining([
        "Display required federal labor law posters",
        "Display required Missouri workplace notices",
      ]),
    );
  });
});

describe("seeded cities", () => {
  it("returns San Francisco items based on profile", () => {
    const items = getComplianceItems({
      entityType: "llc",
      zip: "94105",
      city: "San Francisco",
      county: "San Francisco",
      employeeCount: 2,
    });
    const t = titles(items);
    expect(t).toContain("Renew San Francisco Business Registration Certificate");
    expect(t).toContain("File San Francisco payroll expense tax return");
    const noEmp = titles(
      getComplianceItems({ entityType: "llc", zip: "94105", city: "San Francisco", county: "San Francisco" }),
    );
    expect(noEmp).not.toContain("File San Francisco payroll expense tax return");
  });

  it("NYC UBT applies to unincorporated, BCT to corporations", () => {
    const run = (entityType: "sole_proprietorship" | "c_corp") =>
      titles(getComplianceItems({ entityType, zip: "10001", city: "New York", county: "New York" }));
    expect(run("sole_proprietorship").some((t) => t.includes("Unincorporated Business Tax"))).toBe(true);
    expect(run("c_corp").some((t) => t.includes("Business Corporation Tax"))).toBe(true);
    expect(run("c_corp").some((t) => t.includes("Unincorporated Business Tax"))).toBe(false);
  });
});

describe("zip lookup subpath", () => {
  it("resolves city, county and state", () => {
    expect(lookupZip("94105")).toMatchObject({ state: "CA" });
    expect(lookupZip("10001")).toMatchObject({ city: "New York", state: "NY" });
    expect(lookupZip("00000")).toBeUndefined();
  });

  it("withZip fills missing fields and lets explicit values win", () => {
    const p = withZip({ entityType: "llc", zip: "60601" });
    expect(p).toMatchObject({ city: "Chicago", state: "IL" });
    expect(withZip({ entityType: "llc", zip: "60601", city: "Loop" }).city).toBe("Loop");
    expect(() => withZip({ entityType: "llc", zip: "00000" })).toThrow(/Unknown ZIP/);
    expect(getComplianceItems(withZip({ entityType: "llc", zip: "60601" })).length).toBeGreaterThan(5);
  });
});

describe("professions", () => {
  const run = (profession: Parameters<typeof getComplianceItems>[0]["profession"], zip = "78701") =>
    getComplianceItems({ ...base, zip, entityType: "pllc", profession, city: "Austin", county: "Travis" });

  it("requires a profession for professional entities and professional services", () => {
    expect(() => getComplianceItems({ ...base, entityType: "pllc" })).toThrow(/profession/);
    expect(() =>
      getComplianceItems({ ...base, entityType: "llc", industry: "professional_services" }),
    ).toThrow(/profession/);
    expect(() =>
      getComplianceItems({
        ...base,
        entityType: "llc",
        industry: "professional_services",
        profession: "other",
      }),
    ).not.toThrow();
  });

  it("names the state board for the profession", () => {
    const t = run("cpa").find((i) => i.id.startsWith("state.professional-license"));
    expect(t?.authority).toBe("Texas State Board of Public Accountancy");
    expect(
      run("attorney", "10001").find((i) => i.id.startsWith("state.professional-license"))?.authority,
    ).toMatch(/Board of Law Examiners/);
  });

  it("'other' adds no board item", () => {
    expect(run("other").some((i) => i.id.startsWith("state.professional-license"))).toBe(false);
  });
});

describe("workers' comp hours test (MI) and payroll floor (SC)", () => {
  const wc = (zip: string, extra: Record<string, unknown>) =>
    getComplianceItems({ ...base, zip, entityType: "llc", ...extra }).some((i) =>
      i.title.includes("workers' compensation"),
    );
  it("Michigan: 3 employees or one full-time employee", () => {
    expect(wc("48201", { employeeCount: 1, fullTimeEmployeeCount: 0 })).toBe(false);
    expect(wc("48201", { employeeCount: 1, fullTimeEmployeeCount: 1 })).toBe(true);
    expect(wc("48201", { employeeCount: 3, fullTimeEmployeeCount: 0 })).toBe(true);
  });
  it("South Carolina: 4 employees and at least $3,000 payroll", () => {
    expect(wc("29401", { employeeCount: 4, annualPayroll: 2000 })).toBe(false);
    expect(wc("29401", { employeeCount: 4, annualPayroll: 50_000 })).toBe(true);
  });
  it("validates fullTimeEmployeeCount", () => {
    expect(() =>
      getComplianceItems({ ...base, entityType: "llc", employeeCount: 1, fullTimeEmployeeCount: 2 }),
    ).toThrow(/fullTimeEmployeeCount/);
  });
});

describe("DBA filing level", () => {
  const dba = (zip: string, entityType: "sole_proprietorship" | "llc" = "sole_proprietorship") =>
    getComplianceItems({ ...base, zip, entityType, usesTradeName: true }).find((i) =>
      i.id.startsWith("state.trade-name"),
    );
  it("uses the correct office per state", () => {
    expect(dba("19901")?.authority).toBe("Delaware Division of Revenue"); // DE
    expect(dba("02903")?.authority).toMatch(/Rhode Island/); // RI moved to the Secretary of State in 2026
    expect(dba("66101")).toBeUndefined(); // KS: no registration
    expect(dba("06103")?.authority).toMatch(/Town clerk/); // CT
  });
  it("entities register assumed names with the state", () => {
    expect(dba("77002", "llc")?.authority).toMatch(/Texas Secretary of State/);
    expect(dba("77002")?.authority).toMatch(/County clerk/);
  });
});

describe("LP and LLP report overrides", () => {
  const rep = (zip: string, entityType: "lp" | "llp" | "llc") =>
    getComplianceItems({ ...base, zip, entityType, profession: "other" }, { asOf: "2026-10-12" }).find((i) =>
      i.id.startsWith("state.annual-report"),
    );
  it("Florida LP pays $500; LLP $25; LLC $138.75", () => {
    expect(rep("33101", "lp")?.description).toMatch(/\$500/);
    expect(rep("33101", "llp")?.description).toMatch(/\$25/);
    expect(rep("33101", "llc")?.description).toMatch(/138\.75/);
  });
  it("Illinois LLPs file no annual report; Michigan LPs none", () => {
    expect(rep("60601", "llp")).toBeUndefined();
    expect(rep("48201", "lp")).toBeUndefined();
    expect(rep("60601", "llc")).toBeDefined();
  });
  it("Delaware LLP pays per partner", () => {
    expect(rep("19901", "llp")?.description).toMatch(/per partner/);
  });
});

describe("cannabis", () => {
  const run = (zip: string) =>
    getComplianceItems({ ...base, zip, entityType: "llc", industry: "cannabis", cannabisActivity: "retail" });
  it("requires cannabisActivity", () => {
    expect(() => getComplianceItems({ ...base, entityType: "llc", industry: "cannabis" })).toThrow(
      /cannabisActivity/,
    );
  });
  it("licenses adult-use states through the named regulator", () => {
    const item = run("90001").find((i) => i.id.startsWith("industry.cannabis"));
    expect(item?.authority).toMatch(/Department of Cannabis Control/);
  });
  it("states without a pathway say so; federal item always present", () => {
    const items = run("83702"); // ID
    expect(items.find((i) => i.id.startsWith("industry.cannabis"))?.title).toMatch(
      /No state licensing pathway/,
    );
    expect(items.some((i) => i.title.includes("280E"))).toBe(true);
  });
});

describe("local sales tax administration", () => {
  const items = (zip: string) =>
    getComplianceItems({ ...base, zip, entityType: "llc", sellsTaxableGoods: true });
  it("adds a local registration item where cities self-administer", () => {
    expect(items("80202").some((i) => i.title.includes("locally administered sales tax"))).toBe(true); // CO
    expect(items("94105").some((i) => i.title.includes("locally administered sales tax"))).toBe(false); // CA
  });
  it("notes state-collected local taxes on the return", () => {
    const ret = items("94105").find((i) => i.title.startsWith("File sales tax returns"));
    expect(ret?.description).toMatch(/Local sales taxes are collected/);
  });
});

describe("expanded city seeds", () => {
  const t = (city: string, zip: string, extra = {}) =>
    getComplianceItems({
      entityType: "llc",
      zip,
      city,
      county: "X",
      employeeCount: 2,
      sellsTaxableGoods: true,
      ...extra,
    }).map((i) => i.title);
  it("matches common aliases and spellings", () => {
    expect(t("Saint Louis", "63101").some((x) => x.includes("St. Louis payroll expense"))).toBe(true);
    expect(t("St Louis", "63101").some((x) => x.includes("St. Louis business earnings"))).toBe(true);
    expect(t("Brooklyn", "11201").some((x) => x.includes("NYC"))).toBe(true);
  });
  it("covers municipal income tax cities", () => {
    expect(t("Cleveland", "44101").some((x) => x.includes("Cleveland municipal net profit"))).toBe(true);
    expect(t("Louisville", "40202").some((x) => x.includes("OL-3"))).toBe(true);
  });
  it("applies trade-name and goods tags", () => {
    expect(t("Boston", "02108").some((x) => x.includes("File Boston business certificate"))).toBe(false);
    expect(
      t("Boston", "02108", { usesTradeName: true }).some((x) =>
        x.includes("File Boston business certificate"),
      ),
    ).toBe(true);
    expect(t("Phoenix", "85001").some((x) => x.includes("privilege"))).toBe(true);
  });
});
