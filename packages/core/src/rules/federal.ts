import type { ItemDraft, ResolvedProfile, Rule } from "../types";

const needsEin = (p: ResolvedProfile) => p.entityType !== "sole_proprietorship" || p.hasEmployees;

const free = { basis: "flat" as const, amount: 0, currency: "USD" as const };
const informationReturnPenalty = {
  basis: "range" as const,
  min: 60,
  max: 680,
  note: "Per return or statement; 2026 IRS information-return penalty schedule, including intentional disregard.",
  currency: "USD" as const,
};

/** Adds the federal filing fee/penalty facts shared by every profile producing the rule. */
function federalAmounts(rule: Rule): Rule {
  const amounts: Record<string, { cost: ItemDraft["cost"]; penalty?: ItemDraft["penalty"] }> = {
    "fed.ein": { cost: free, penalty: { basis: "flat", amount: 0, currency: "USD" } },
    "fed.income-tax-return": {
      cost: free,
    },
    "fed.payroll-deposits": {
      cost: free,
    },
    "fed.1099-nec": { cost: free, penalty: informationReturnPenalty },
    "fed.aca-reporting": { cost: free, penalty: informationReturnPenalty },
    "fed.exempt-application": {
      cost: {
        basis: "varies",
        note: "IRS user fee is $600 for Form 1023 or $275 for Form 1023-EZ.",
        currency: "USD",
      },
    },
    "fed.estimated-tax": { cost: free },
    "fed.labor-posters": { cost: free, penalty: { basis: "flat", amount: 0, currency: "USD" } },
    "fed.eeo1": { cost: free },
    "fed.osha-recordkeeping": { cost: free },
    "fed.ttb-alcohol": { cost: free },
  };
  const amount = amounts[rule.id];
  if (!amount) return rule;
  return {
    ...rule,
    items: (p) => {
      const built = rule.items(p);
      const add = (item: ItemDraft): ItemDraft => ({
        ...item,
        cost: item.cost ?? amount.cost,
        ...(item.penalty ||
        (!amount.penalty && !["fed.income-tax-return", "fed.payroll-deposits"].includes(rule.id))
          ? {}
          : {
              penalty:
                rule.id === "fed.income-tax-return" &&
                (p.taxTreatment === "partnership" || p.taxTreatment === "s_corp")
                  ? {
                      basis: "per_item" as const,
                      perUnit: 255,
                      note: "Per partner or shareholder per month, up to 12 months, for 2026 returns.",
                      currency: "USD" as const,
                    }
                  : rule.id === "fed.income-tax-return"
                    ? {
                        basis: "percent" as const,
                        rate: 5,
                        min: 525,
                        note: "Failure-to-file penalty is generally 5% per month, up to 25%; minimum applies to returns due after December 31, 2025.",
                        currency: "USD" as const,
                      }
                    : rule.id === "fed.payroll-deposits"
                      ? item.title === "Deposit federal payroll taxes"
                        ? {
                            basis: "percent" as const,
                            rate: 2,
                            note: "Failure-to-deposit penalty is 2%, 5%, 10% or 15% of unpaid tax depending on delay and payment method.",
                            currency: "USD" as const,
                          }
                        : {
                            basis: "percent" as const,
                            rate: 5,
                            note: "Failure-to-file penalty is generally 5% per month, up to 25% of unpaid tax; other penalties may also apply.",
                            currency: "USD" as const,
                          }
                      : amount.penalty,
            }),
      });
      return Array.isArray(built) ? built.map(add) : add(built);
    },
  };
}

/** 15th day of the month that is `monthsAfter` months after the fiscal year-end month. */
function fyDue(p: ResolvedProfile, monthsAfter: number): { rrule: string; label: string } {
  const month = ((p.fiscalYearEndMonth - 1 + monthsAfter) % 12) + 1;
  const calendar = p.fiscalYearEndMonth === 12;
  return {
    rrule: `FREQ=YEARLY;BYMONTH=${month};BYMONTHDAY=15`,
    label: calendar
      ? `${MONTHS[month - 1]} 15`
      : `${MONTHS[month - 1]} 15 (fiscal year ending ${MONTHS[p.fiscalYearEndMonth - 1]})`,
  };
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function incomeTaxForm(p: ResolvedProfile): { form: string; rrule: string; deadline: string } {
  switch (p.taxTreatment) {
    case "sole_prop":
      // Individual returns follow the calendar year regardless of the business's fiscal year.
      return {
        form: "Form 1040 with Schedule C",
        rrule: "FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=15",
        deadline: "April 15",
      };
    case "partnership": {
      const d = fyDue(p, 3);
      return { form: "Form 1065 (and Schedule K-1 for each partner)", rrule: d.rrule, deadline: d.label };
    }
    case "s_corp": {
      const d = fyDue(p, 3);
      return {
        form: "Form 1120-S (and Schedule K-1 for each shareholder)",
        rrule: d.rrule,
        deadline: d.label,
      };
    }
    case "c_corp": {
      const d = fyDue(p, 4);
      return { form: "Form 1120", rrule: d.rrule, deadline: d.label };
    }
    case "nonprofit": {
      const d = fyDue(p, 5);
      return { form: "Form 990 / 990-EZ / 990-N", rrule: d.rrule, deadline: d.label };
    }
  }
}

/**
 * Estimated-tax installments. Owners pay on the calendar year (April 15, June 15, September 15, January 15);
 * corporations pay on the 15th day of the 4th, 6th, 9th and 12th months of their own tax year (Form 1120-W).
 */
function estimatedTaxSchedule(p: ResolvedProfile): { deadline: string; rrule: string } {
  const months =
    p.taxTreatment === "c_corp"
      ? [4, 6, 9, 12].map((n) => ((p.fiscalYearEndMonth - 1 + n) % 12) + 1)
      : [4, 6, 9, 1];
  const names = months.map((m) => `${MONTHS[m - 1]} 15`);
  return {
    deadline: `${names.slice(0, -1).join(", ")}, ${names.at(-1)}`,
    rrule: `FREQ=YEARLY;BYMONTH=${[...months].sort((a, b) => a - b).join(",")};BYMONTHDAY=15`,
  };
}

const federalRuleDefinitions: Rule[] = [
  {
    id: "fed.ein",
    description: "EIN for entities and employers",
    inputs: ["entityType", "employeeCount"],
    when: needsEin,
    items: (p) => ({
      title: "Obtain an Employer Identification Number (EIN)",
      category: "registration",
      jurisdiction: "federal",
      authority: "IRS",
      description: "Free, one-time federal tax ID needed for tax filings, payroll and bank accounts.",
      frequency: "once",
      formId: "SS-4",
      filingMethod: ["online", "fax", "mail"],
      processingTime: "Immediate online; about four business days by fax; about four weeks by mail",
      reason:
        p.entityType !== "sole_proprietorship"
          ? `${p.entityType} entities need an EIN`
          : "Sole proprietors with employees need an EIN",
      url: [
        "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online",
      ],
    }),
  },
  {
    id: "fed.income-tax-return",
    description: "Annual federal income tax return by tax treatment",
    inputs: ["entityType", "llcTaxClassification", "sCorpElection", "fiscalYearEndMonth", "isFormed"],
    when: (p) => p.isFormed,
    items: (p) => {
      const { form, rrule, deadline } = incomeTaxForm(p);
      return {
        title: `File federal income tax return: ${form}`,
        category: "filing",
        jurisdiction: "federal",
        authority: "IRS",
        description: "Annual federal income tax return (extensions available via Form 7004 / 4868).",
        rrule,
        formId: form,
        filingMethod: ["online", "mail"],
        deadline,
        reason: `Federal tax treatment is ${p.taxTreatment}`,
        url: ["https://www.irs.gov/businesses"],
      };
    },
  },
  {
    id: "fed.estimated-tax",
    description: "Quarterly estimated income tax",
    inputs: ["annualNetIncome", "entityType", "llcTaxClassification", "isFormed"],
    // Approximates the "expect to owe $1,000 (owners) / $500 (C corp)" tests from net income:
    // owners ~14.1% self-employment tax, corporations 21% federal rate.
    when: (p) =>
      p.isFormed &&
      (p.taxTreatment === "c_corp"
        ? p.annualNetIncome >= 500 / 0.21
        : p.taxTreatment !== "nonprofit" && p.annualNetIncome >= 1000 / 0.141),
    items: (p) => ({
      title:
        p.taxTreatment === "c_corp"
          ? "Pay federal estimated corporate income tax"
          : "Pay federal estimated income tax (owners)",
      category: "payment",
      jurisdiction: "federal",
      authority: "IRS",
      description:
        p.taxTreatment === "c_corp"
          ? "Quarterly estimated payments by corporations, deposited through EFTPS."
          : "Quarterly estimated payments by owners on business income (Form 1040-ES), including self-employment tax.",
      ...estimatedTaxSchedule(p),
      reason: `Expected net income of ${p.annualNetIncome} is expected to generate tax due during the year`,
      url: ["https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes"],
    }),
  },
  {
    id: "fed.payroll-deposits",
    description: "Payroll tax deposits and returns (941, 940, W-2/W-3, I-9)",
    inputs: ["employeeCount", "priorYearPayrollTaxLiability"],
    when: (p) => p.hasEmployees,
    items: (p) => {
      const lookback = p.priorYearPayrollTaxLiability;
      const semiweekly = lookback !== undefined && lookback > 50_000;
      return [
        {
          title: "Deposit federal payroll taxes",
          category: "payment",
          jurisdiction: "federal",
          authority: "IRS",
          description: "Withheld income tax, Social Security and Medicare, plus employer share, via EFTPS.",
          ...(semiweekly ? { frequency: "per_event" as const } : { rrule: "FREQ=MONTHLY" }),
          deadline:
            lookback !== undefined && lookback > 100_000
              ? "Next business day once accumulated liability reaches $100,000"
              : semiweekly
                ? "Semiweekly: Wednesday or Friday depending on payday"
                : "15th day of the following month",
          reason:
            lookback === undefined
              ? "New employers deposit monthly"
              : `Lookback-period liability of ${lookback} makes the business a ${semiweekly ? "semiweekly" : "monthly"} depositor`,
          url: [
            "https://www.irs.gov/businesses/small-businesses-self-employed/depositing-and-reporting-employment-taxes",
          ],
        },
        {
          title: "File Form 941 (Employer's Quarterly Federal Tax Return)",
          category: "filing",
          jurisdiction: "federal",
          authority: "IRS",
          description: "Quarterly reconciliation of wages and payroll taxes.",
          rrule: "FREQ=YEARLY;BYMONTH=1,4,7,10;BYMONTHDAY=-1",
          formId: "941",
          filingMethod: ["online", "mail"],
          deadline: "April 30, July 31, October 31, January 31",
          reason: "Business has employees",
          url: ["https://www.irs.gov/businesses/small-businesses-self-employed/employment-tax-due-dates"],
        },
        {
          title: "File Form 940 (Federal Unemployment Tax)",
          category: "filing",
          jurisdiction: "federal",
          authority: "IRS",
          description: "Annual FUTA return and payment.",
          rrule: "FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=31",
          formId: "940",
          filingMethod: ["online", "mail"],
          deadline: "January 31",
          reason: "Business has employees",
          url: ["https://www.irs.gov/businesses/small-businesses-self-employed/employment-tax-due-dates"],
        },
        {
          title: "Issue Forms W-2 and file W-3",
          category: "filing",
          jurisdiction: "federal",
          authority: "IRS / SSA",
          description: "Wage statements to employees and transmittal to the SSA.",
          rrule: "FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=31",
          deadline: "January 31",
          reason: "Business has employees",
          url: ["https://www.irs.gov/businesses/small-businesses-self-employed/employment-tax-due-dates"],
        },
        {
          title: "Complete Form I-9 for each new hire",
          category: "recordkeeping",
          jurisdiction: "federal",
          authority: "USCIS",
          description:
            "Employment eligibility verification, retained for 3 years after hire or 1 year after termination.",
          frequency: "per_event",
          reason: "Business has employees",
          url: ["https://www.uscis.gov/i-9"],
        },
      ];
    },
  },
  {
    id: "fed.labor-posters",
    description: "Federal labor law workplace notices",
    inputs: ["employeeCount"],
    when: (p) => p.hasEmployees,
    items: () => ({
      title: "Display required federal labor law posters",
      category: "recordkeeping",
      jurisdiction: "federal",
      authority: "U.S. Department of Labor",
      description:
        "Employers must post the FLSA minimum wage, FMLA (50+ employees), EEO, OSHA, USERRA and related notices in a conspicuous place.",
      frequency: "ongoing",
      reason: "Business has employees",
      url: ["https://www.dol.gov/agencies/whd/posters"],
    }),
  },
  {
    id: "fed.1099-nec",
    description: "Information returns for independent contractors",
    inputs: ["largestContractorPaymentUsd"],
    when: (p) => p.largestContractorPaymentUsd >= 2000,
    items: (p) => ({
      title: "File Form 1099-NEC for independent contractors",
      category: "filing",
      jurisdiction: "federal",
      authority: "IRS",
      description:
        "Required for each non-employee paid $2,000 or more in the year (payments made after 2025).",
      rrule: "FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=31",
      formId: "1099-NEC",
      filingMethod: ["online", "mail"],
      deadline: "January 31",
      reason: `Largest contractor payment is ${p.largestContractorPaymentUsd}, at or above the $2,000 threshold`,
      url: ["https://www.irs.gov/businesses/small-businesses-self-employed/employment-tax-due-dates"],
    }),
  },
  {
    id: "fed.exempt-application",
    description: "Federal tax-exempt recognition for nonprofits",
    inputs: ["entityType", "hasTaxExemptStatus"],
    when: (p) => p.entityType === "nonprofit" && !p.hasTaxExemptStatus,
    items: () => ({
      title: "Apply for federal tax-exempt status (Form 1023 or 1023-EZ)",
      category: "registration",
      jurisdiction: "federal",
      authority: "IRS",
      description:
        "Recognition of 501(c)(3) status; generally due within 27 months of formation for retroactive effect.",
      frequency: "once",
      formId: "1023 / 1023-EZ",
      filingMethod: ["online"],
      processingTime:
        "IRS issues 80% of Form 1023-EZ determinations within 22 days and 80% of Form 1023 determinations within 191 days (IRS status page, reviewed June 2026; queue times change)",
      reason: "Nonprofit without recognized exempt status",
      url: ["https://www.irs.gov/charities-non-profits/application-for-recognition-of-exemption"],
    }),
  },
  {
    id: "fed.aca-reporting",
    description:
      "Affordable Care Act employer reporting for applicable large employers (Forms 1094-C and 1095-C)",
    inputs: ["fullTimeEmployeeCount"],
    when: (p) => p.fullTimeEmployeeCount >= 50,
    items: (p) => [
      {
        title: "Furnish Form 1095-C to full-time employees",
        category: "filing",
        jurisdiction: "federal",
        authority: "IRS",
        description:
          "Applicable large employers (50 or more full-time employees, counting part-time hours as full-time equivalents) give each full-time employee a Form 1095-C. The January 31 deadline is extended automatically by 30 days, to March 2 in most years (March 1 for the 2026 forms).",
        rrule: "FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=1",
        formId: "1095-C",
        deadline: "March 1 or 2 (January 31, extended automatically by 30 days)",
        reason: `${p.fullTimeEmployeeCount} full-time employees, at or above the 50 that make an applicable large employer`,
        url: ["https://www.irs.gov/affordable-care-act/employers/employer-shared-responsibility-provisions"],
      },
      {
        title: "File Forms 1094-C and 1095-C with the IRS",
        category: "filing",
        jurisdiction: "federal",
        authority: "IRS",
        description:
          "The transmittal Form 1094-C and each Form 1095-C are due to the IRS at the end of February on paper or March 31 electronically; employers filing 10 or more information returns in total must file electronically. Penalties apply per late or incorrect form.",
        rrule: "FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=31",
        formId: "1094-C",
        filingMethod: ["online", "mail"],
        deadline: "March 31 electronically (end of February on paper)",
        reason: `${p.fullTimeEmployeeCount} full-time employees, at or above the 50 that make an applicable large employer`,
        url: ["https://www.irs.gov/forms-pubs/about-form-1094-c"],
      },
    ],
  },
  {
    id: "fed.eeo1",
    description: "EEO-1 Component 1 workforce demographic report for employers with 100 or more employees",
    inputs: ["employeeCount"],
    when: (p) => p.employeeCount >= 100,
    items: (p) => ({
      title: "File the EEO-1 Component 1 workforce report",
      category: "filing",
      jurisdiction: "federal",
      authority: "U.S. Equal Employment Opportunity Commission",
      description:
        "Private employers with 100 or more employees file annually through the EEOC's online system; federal contractors with 50 or more employees and certain contracts have also filed. The EEOC sets each year's filing window, so check its data collections page.",
      rrule: "FREQ=YEARLY",
      deadline: "Set each year by the EEOC",
      reason: `${p.employeeCount} employees, at or above the 100 that require an EEO-1 report`,
      url: ["https://www.eeoc.gov/data/eeo-data-collections"],
    }),
  },
  {
    id: "fed.osha-recordkeeping",
    description: "OSHA injury and illness records, annual summary posting and electronic submission",
    inputs: ["employeeCount"],
    when: (p) => p.employeeCount > 10,
    items: (p) => [
      {
        title: "Keep OSHA injury and illness records and post the annual summary (Form 300A)",
        category: "recordkeeping",
        jurisdiction: "federal",
        authority: "OSHA",
        description:
          "Employers with more than 10 employees keep Forms 300 and 301 for work-related injuries and illnesses, and post the Form 300A summary for the previous year at each establishment from February 1 through April 30. Records are kept five years. Report a work-related fatality within 8 hours and an inpatient hospitalization, amputation or loss of an eye within 24 hours.",
        rrule: "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=1",
        formId: "300A",
        deadline: "Post by February 1 and leave up through April 30",
        exemptions: [
          "Employers with 10 or fewer employees (except for fatality and severe-injury reporting)",
          "Establishments in partially exempt low-hazard industries such as retail, finance, insurance, real estate and many services (29 CFR 1904 Appendix A)",
        ],
        reason: `${p.employeeCount} employees, above the 10-employee threshold`,
        url: ["https://www.osha.gov/recordkeeping"],
      },
      ...(p.employeeCount >= 250
        ? [
            {
              title: "Submit OSHA injury and illness data electronically",
              category: "filing" as const,
              jurisdiction: "federal" as const,
              authority: "OSHA",
              description:
                "Establishments with 250 or more employees submit their Form 300A summary through OSHA's Injury Tracking Application by March 2. Establishments with 20 to 249 employees in designated higher-hazard industries must also submit the summary, and those with 100 or more in the most hazardous industries submit Forms 300 and 301 data.",
              rrule: "FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=2",
              deadline: "March 2",
              reason: `${p.employeeCount} employees, at or above the 250 that require electronic submission`,
              url: ["https://www.osha.gov/injuryreporting"],
            },
          ]
        : []),
    ],
  },
  {
    id: "fed.ttb-alcohol",
    description: "TTB permits for alcohol producers, importers and wholesalers",
    inputs: ["industry", "alcoholActivity"],
    when: (p) => p.industry === "alcohol" && p.alcoholActivity !== "retail",
    items: (p) => ({
      title:
        p.alcoholActivity === "manufacture"
          ? "Obtain TTB permit/registration to produce alcohol (brewer's notice, winery or distilled spirits plant)"
          : `Obtain TTB basic permit to ${p.alcoholActivity === "import" ? "import" : "wholesale"} alcohol`,
      category: "permit",
      jurisdiction: "federal",
      authority: "Alcohol and Tobacco Tax and Trade Bureau (TTB)",
      description:
        p.alcoholActivity === "manufacture"
          ? "Producers must qualify with TTB (and post bond where required) before operating, and file periodic operational reports and excise tax returns."
          : "Importers and wholesalers need a federal basic permit under the Federal Alcohol Administration Act before engaging in business.",
      frequency: "once",
      reason: `Alcohol activity is ${p.alcoholActivity}`,
      url: ["https://www.ttb.gov/regulated-commodities/beverage-alcohol"],
    }),
  },
];

export const federalRules: Rule[] = federalRuleDefinitions.map(federalAmounts);
