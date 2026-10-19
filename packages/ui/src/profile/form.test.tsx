import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "@tamagui/config/v6";
import { TamaguiProvider, createTamagui } from "tamagui";
import { evaluate } from "business-obligations";
import {
  PROFILE_DEFAULTS,
  PROFILE_PARAMS,
  ProfileForm,
  ProfileQueryProvider,
  hasLegacyParams,
  messages,
  profileFromChoices,
  readProfileQuery,
  useProfilePlace,
  writeProfileQuery,
  type ProfileChoices,
} from "../index";

const tamaguiConfig = createTamagui(defaultConfig);
const render = (element: ReactElement) =>
  renderToStaticMarkup(
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      {element}
    </TamaguiProvider>,
  );

const everything: ProfileChoices = {
  zip: "85234",
  entityType: "pllc",
  naics: "621111",
  profession: "physician",
  llcTaxClassification: "s_corp",
  isFormed: true,
  formationDate: "2024-03-01",
  asOf: "2026-10-14",
  openingDate: "2027-02-01",
  employeeCount: 3,
  fullTimeEmployeeCount: 2,
  ownerCount: 2,
  annualPayroll: 90000,
  annualRevenue: 250000.5,
  annualNetIncome: 40000,
  largestContractorPaymentUsd: 5000,
  priorYearPayrollTaxLiability: 51000,
  fiscalYearEndMonth: 6,
  sellsTaxableGoods: true,
  homeBased: false,
  usesTradeName: true,
  hasTaxExemptStatus: false,
  hasSignage: true,
  foodService: undefined,
  sCorpElection: false,
};

describe("the whole form in the address", () => {
  it("has a parameter for every choice, and a default that writes nothing", () => {
    expect(Object.keys(PROFILE_PARAMS).sort()).toEqual(Object.keys(PROFILE_DEFAULTS).sort());
    expect(new Set(Object.values(PROFILE_PARAMS)).size).toBe(Object.keys(PROFILE_PARAMS).length);
    expect(writeProfileQuery("", PROFILE_DEFAULTS)).toBe("");
    expect(readProfileQuery("")).toEqual(PROFILE_DEFAULTS);
  });

  it("round-trips every choice", () => {
    expect(readProfileQuery(writeProfileQuery("", everything))).toEqual(everything);
  });

  it("keeps the parameter names that links already use", () => {
    const query = new URLSearchParams(writeProfileQuery("", everything));
    expect(Object.fromEntries(query)).toMatchObject({
      zip: "85234",
      type: "pllc",
      naics: "621111",
      profession: "physician",
      employees: "3",
      owners: "2",
      fullTime: "2",
      payroll: "90000",
      revenue: "250000.5",
      netIncome: "40000",
      contractor: "5000",
      priorTax: "51000",
      fiscalMonth: "6",
      llcTax: "s_corp",
      formed: "1",
      formedOn: "2024-03-01",
      start: "2026-10-14",
      opening: "2027-02-01",
      home: "0",
      sells: "1",
    });
  });

  it("falls back to the defaults for bad values", () => {
    const bad = readProfileQuery(
      "?zip=ab12345678&type=spaceship&naics=%3Cscript%3E&profession=wizard&llcTax=nonsense&employees=-4&owners=1.5" +
        "&payroll=1e9&netIncome=abc&fiscalMonth=13&start=tomorrow&formedOn=soon&sells=maybe",
    );
    expect(bad.zip).toBe("12345");
    expect({ ...bad, zip: "" }).toEqual(PROFILE_DEFAULTS);
  });

  it("keeps partly typed ZIP codes and amounts", () => {
    expect(readProfileQuery("?zip=787").zip).toBe("787");
    expect(readProfileQuery("?payroll=12.5").annualPayroll).toBe(12.5);
    expect(readProfileQuery("?payroll=12.").annualPayroll).toBeUndefined();
  });

  it("tells not given from 0 for amounts and counts", () => {
    expect(readProfileQuery("?payroll=0").annualPayroll).toBe(0);
    expect(readProfileQuery("?payroll=").annualPayroll).toBeUndefined();
    expect(readProfileQuery("?employees=99999").employeeCount).toBe(10_000);
    expect(readProfileQuery("?fiscalMonth=").fiscalYearEndMonth).toBeUndefined();
  });

  it("reads links made before the form came from this package, and does not write their names again", () => {
    const old = readProfileQuery("?entity=llp&goods=1&dba=0&industry=restaurant&zip=85234");
    expect(old).toMatchObject({
      entityType: "llp",
      sellsTaxableGoods: true,
      usesTradeName: false,
      naics: "722",
    });
    expect(readProfileQuery("?industry=restaurant&naics=236220").naics).toBe("236220");
    expect(readProfileQuery("?type=pc&entity=llp").entityType).toBe("pc");
    expect(hasLegacyParams("?entity=llp")).toBe(true);
    expect(hasLegacyParams("?type=llp&naics=722")).toBe(false);
    // clearing the type must not bring `entity=` back
    expect(
      writeProfileQuery("?entity=llp&industry=restaurant", { ...old, entityType: undefined }),
    ).not.toMatch(/entity=|industry=/);
  });
});

describe("profileFromChoices", () => {
  const place = { city: "Gilbert", county: "Maricopa", state: "AZ" };

  it("builds a profile the engine accepts", () => {
    const profile = profileFromChoices(
      { ...PROFILE_DEFAULTS, zip: "85234", entityType: "llc", employeeCount: 3 },
      place,
    );
    expect(profile).toMatchObject({ entityType: "llc", zip: "85234", city: "Gilbert", employeeCount: 3 });
    expect(() => evaluate(profile)).not.toThrow();
  });

  it("takes no chosen type as an LLC, and leaves unanswered questions out so they stay unknown", () => {
    const profile = profileFromChoices({ ...PROFILE_DEFAULTS, zip: "85234", homeBased: false }, place);
    expect(profile.entityType).toBe("llc");
    expect(profile.homeBased).toBe(false);
    for (const key of ["employeeCount", "annualPayroll", "sellsTaxableGoods", "naics", "profession"])
      expect(key in profile).toBe(false);
  });

  it("asks for a profession only for professional entities and industries", () => {
    const base = { ...PROFILE_DEFAULTS, zip: "85234" };
    expect(
      profileFromChoices({ ...base, entityType: "pllc", profession: "attorney" }, place).profession,
    ).toBe("attorney");
    expect(profileFromChoices({ ...base, entityType: "pllc" }, place).profession).toBe("other");
    expect(
      profileFromChoices({ ...base, entityType: "llc", profession: "attorney" }, place).profession,
    ).toBeUndefined();
    expect(profileFromChoices({ ...base, entityType: "llc", naics: "5411" }, place).profession).toBe("other");
  });

  it("sends a tax classification only for LLCs, a formation date only once formed, and a code of 2 digits or more", () => {
    const base = {
      ...PROFILE_DEFAULTS,
      zip: "85234",
      llcTaxClassification: "s_corp" as const,
      formationDate: "2024-03-01",
    };
    expect(profileFromChoices({ ...base, entityType: "llc" }, place).llcTaxClassification).toBe("s_corp");
    expect(profileFromChoices({ ...base, entityType: "c_corp" }, place).llcTaxClassification).toBeUndefined();
    expect(profileFromChoices({ ...base, isFormed: true }, place).formationDate).toBe("2024-03-01");
    expect(profileFromChoices(base, place).formationDate).toBeUndefined();
    expect(profileFromChoices({ ...base, naics: "7" }, place).naics).toBeUndefined();
    expect(profileFromChoices({ ...base, naics: "72" }, place).naics).toBe("72");
  });
});

describe("ProfileForm", () => {
  it("asks for everything, in groups", () => {
    const html = render(<ProfileForm />);
    for (const text of [
      "Business",
      "ZIP code",
      "Business type",
      "Industry (NAICS code)",
      "Size",
      "Employees",
      "Owners",
      "Full-time staff",
      "Money (USD)",
      "Annual payroll",
      "Annual revenue",
      "Net income",
      "Top contractor pay",
      "Last year&#x27;s payroll tax",
      "Tax",
      "Fiscal year end",
      "LLC taxed as",
      "Details",
      "Sells taxable goods",
      "Not formed yet",
      "Dates",
      "Start date",
      "Target opening",
    ])
      expect(html, text).toContain(text);
    expect(html).not.toContain("Formation date");
    expect(html).not.toContain('type="submit"');
  });

  it("leaves out a field whose value the host passes, and the heading when all of its fields are gone", () => {
    const html = render(
      <ProfileForm
        values={{
          zip: "85234",
          entityType: "llc",
          naics: "722511",
          annualPayroll: 1,
          annualRevenue: 2,
          annualNetIncome: 3,
          largestContractorPaymentUsd: 4,
          priorYearPayrollTaxLiability: 5,
        }}
      />,
    );
    for (const gone of [
      "ZIP code",
      "Business type",
      "Industry (NAICS code)",
      "Annual payroll",
      "Annual revenue",
      "Net income",
      "Top contractor pay",
      "Money (USD)",
    ])
      expect(html, gone).not.toContain(gone);
    // what was not passed is still asked
    for (const kept of ["Employees", "Owners", "Fiscal year end", "Sells taxable goods", "Dates"])
      expect(html, kept).toContain(kept);
  });

  it("hides every field when everything is passed, including the details and dates", () => {
    const html = render(
      <ProfileForm
        values={{
          ...PROFILE_DEFAULTS,
          zip: "85234",
          entityType: "llc",
          naics: "",
          profession: "other",
          llcTaxClassification: "disregarded",
          isFormed: false,
          formationDate: "",
          asOf: "2026-10-14",
          openingDate: "2027-01-01",
          employeeCount: 0,
          fullTimeEmployeeCount: 0,
          ownerCount: 1,
          annualPayroll: 0,
          annualRevenue: 0,
          annualNetIncome: 0,
          largestContractorPaymentUsd: 0,
          priorYearPayrollTaxLiability: 0,
          fiscalYearEndMonth: 12,
          sellsTaxableGoods: false,
          homeBased: false,
          usesTradeName: false,
          hasTaxExemptStatus: false,
          hasSignage: false,
          foodService: false,
          sCorpElection: false,
        }}
      />,
    );
    expect(html).not.toMatch(/<label/);
    expect(html).not.toContain("Details");
    expect(html).not.toContain("Not formed yet");
  });

  it("also takes the values from an outer ProfileQueryProvider, which the host can read too", () => {
    const html = render(
      <ProfileQueryProvider values={{ zip: "60601" }}>
        <ProfileForm />
      </ProfileQueryProvider>,
    );
    expect(html).not.toContain("ZIP code");
    expect(html).toContain("Business type");
  });

  it("hides the ZIP field when any of city, county and state is given", () => {
    const html = render(<ProfileForm values={{ city: "Gilbert", county: "Maricopa", state: "AZ" }} />);
    expect(html).not.toContain("ZIP code");
    expect(html).toContain("Business type");
    // any part of a place means the host knows where the business is, so the ZIP is not asked
    expect(render(<ProfileForm values={{ state: "AZ" }} />)).not.toContain("ZIP code");
    expect(render(<ProfileForm values={{ zip: "85234" }} />)).not.toContain("ZIP code");
  });

  it("lays each group out as equal columns that fill the row, with no gap at any width", () => {
    const html = render(<ProfileForm />);
    // one fluid group each for the business, the size, the amounts, the tax and the dates
    expect(html.match(/class="bo-fluid[ "]/g)?.length).toBe(5);
    // the amounts line their inputs up when a label wraps
    expect(html).toContain('class="bo-fluid bo-end"');
    // money fields stay compact without explanatory tooltips
    expect(html).not.toContain("More about Top contractor pay");
    // the ZIP code is one of the business group's equal columns, and it goes away without leaving a gap
    expect(html).toContain("ZIP code");
    expect(render(<ProfileForm values={{ state: "AZ" }} />)).not.toContain("ZIP code");
  });

  it("useProfilePlace gives the place that was passed, and looks the ZIP up for the rest", () => {
    const seen: unknown[] = [];
    const Probe = () => {
      seen.push(useProfilePlace());
      return null;
    };
    render(
      <ProfileQueryProvider values={{ city: "Gilbert", county: "Maricopa", state: "AZ" }}>
        <Probe />
      </ProfileQueryProvider>,
    );
    expect(seen.at(-1)).toEqual({ city: "Gilbert", county: "Maricopa", state: "AZ" });
    seen.length = 0;
    render(
      <ProfileQueryProvider values={{ zip: "85234" }}>
        <Probe />
      </ProfileQueryProvider>,
    );
    // looked up after the first render, so there is nothing to show on the server
    expect(seen.at(-1)).toBeUndefined();
  });

  it("leaves out what the engine would refuse", () => {
    const place = { city: "Gilbert", county: "Maricopa", state: "AZ" };
    const base = { ...PROFILE_DEFAULTS, zip: "85234" };
    // more full-time than all employees
    expect(
      profileFromChoices({ ...base, employeeCount: 1, fullTimeEmployeeCount: 3 }, place),
    ).not.toHaveProperty("fullTimeEmployeeCount");
    // no head count: nothing to compare with, so it is kept
    expect(profileFromChoices({ ...base, fullTimeEmployeeCount: 3 }, place)).toMatchObject({
      fullTimeEmployeeCount: 3,
    });
    expect(profileFromChoices({ ...base, employeeCount: 3, fullTimeEmployeeCount: 3 }, place)).toMatchObject({
      fullTimeEmployeeCount: 3,
    });
    expect(profileFromChoices({ ...base, ownerCount: 0 }, place)).not.toHaveProperty("ownerCount");
  });

  it("ignores a date that does not exist", () => {
    expect(readProfileQuery("?formedOn=2020-02-30&start=2026-13-01&opening=2027-02-28")).toMatchObject({
      formationDate: "",
      asOf: "",
      openingDate: "2027-02-28",
    });
  });

  it("speaks Spanish", () => {
    const html = render(<ProfileForm locale="es" />);
    for (const text of ["Código postal", "Tamaño", "Dinero (USD)", "Aún no constituido", "Fechas"])
      expect(html, text).toContain(text);
  });

  it("has Spanish text for every label of the form", () => {
    const shape = (value: unknown): unknown =>
      value && typeof value === "object"
        ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, shape(inner)]))
        : typeof value;
    expect(shape(messages.es.profileForm)).toEqual(shape(messages.en.profileForm));
  });
});
