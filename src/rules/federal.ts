import type { Rule, ResolvedProfile } from "../types.js";

const needsEin = (p: ResolvedProfile) =>
  p.entityType !== "sole_proprietorship" || p.hasEmployees;

function incomeTaxForm(p: ResolvedProfile): { form: string; deadline: string } {
  switch (p.taxTreatment) {
    case "sole_prop":
      return { form: "Form 1040 with Schedule C", deadline: "April 15" };
    case "partnership":
      return { form: "Form 1065 (and Schedule K-1 for each partner)", deadline: "March 15" };
    case "s_corp":
      return { form: "Form 1120-S (and Schedule K-1 for each shareholder)", deadline: "March 15" };
    case "c_corp":
      return { form: "Form 1120", deadline: "April 15 (calendar-year filers)" };
    case "nonprofit":
      return { form: "Form 990 / 990-EZ / 990-N", deadline: "15th day of the 5th month after year end" };
  }
}

export const federalRules: Rule[] = [
  {
    id: "fed.ein",
    when: needsEin,
    items: (p) => ({
      title: "Obtain an Employer Identification Number (EIN)",
      category: "registration",
      jurisdiction: "federal",
      authority: "IRS",
      description: "Free, one-time federal tax ID needed for tax filings, payroll and bank accounts.",
      frequency: "once",
      reason:
        p.entityType !== "sole_proprietorship"
          ? `${p.entityType} entities need an EIN`
          : "Sole proprietors with employees need an EIN",
            url: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online",
    }),
  },
  {
    id: "fed.income-tax-return",
    when: (p) => p.isFormed,
    items: (p) => {
      const { form, deadline } = incomeTaxForm(p);
      return {
        title: `File federal income tax return: ${form}`,
        category: "filing",
        jurisdiction: "federal",
        authority: "IRS",
        description: "Annual federal income tax return (extensions available via Form 7004 / 4868).",
        frequency: "annual",
        deadline,
        reason: `Federal tax treatment is ${p.taxTreatment}`,
        url: "https://www.irs.gov/businesses",
      };
    },
  },
  {
    id: "fed.estimated-tax",
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
          ? "Quarterly estimated payments (Form 1120-W worksheet, deposited via EFTPS)."
          : "Quarterly estimated payments by owners on business income (Form 1040-ES), including self-employment tax.",
      frequency: "quarterly",
      deadline: "April 15, June 15, September 15, January 15",
      reason: `Expected net income of ${p.annualNetIncome} is expected to generate tax due during the year`,
            url: "https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes",
    }),
  },
  {
    id: "fed.payroll-deposits",
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
        frequency: semiweekly ? "per_event" : "monthly",
        deadline: lookback !== undefined && lookback > 100_000
          ? "Next business day once accumulated liability reaches $100,000"
          : semiweekly
            ? "Semiweekly: Wednesday or Friday depending on payday"
            : "15th day of the following month",
        reason: lookback === undefined
          ? "New employers deposit monthly"
          : `Lookback-period liability of ${lookback} makes the business a ${semiweekly ? "semiweekly" : "monthly"} depositor`,
        url: "https://www.irs.gov/businesses/small-businesses-self-employed/depositing-and-reporting-employment-taxes",
      },
      {
        title: "File Form 941 (Employer's Quarterly Federal Tax Return)",
        category: "filing",
        jurisdiction: "federal",
        authority: "IRS",
        description: "Quarterly reconciliation of wages and payroll taxes.",
        frequency: "quarterly",
        deadline: "April 30, July 31, October 31, January 31",
        reason: "Business has employees",
      },
      {
        title: "File Form 940 (Federal Unemployment Tax)",
        category: "filing",
        jurisdiction: "federal",
        authority: "IRS",
        description: "Annual FUTA return and payment.",
        frequency: "annual",
        deadline: "January 31",
        reason: "Business has employees",
      },
      {
        title: "Issue Forms W-2 and file W-3",
        category: "filing",
        jurisdiction: "federal",
        authority: "IRS / SSA",
        description: "Wage statements to employees and transmittal to the SSA.",
        frequency: "annual",
        deadline: "January 31",
        reason: "Business has employees",
      },
      {
        title: "Complete Form I-9 for each new hire",
        category: "recordkeeping",
        jurisdiction: "federal",
        authority: "USCIS",
        description: "Employment eligibility verification, retained for 3 years after hire or 1 year after termination.",
        frequency: "per_event",
        reason: "Business has employees",
        url: "https://www.uscis.gov/i-9",
      },
      ];
    },
  },
  {
    id: "fed.1099-nec",
    when: (p) => p.largestContractorPaymentUsd >= 2000,
    items: (p) => ({
      title: "File Form 1099-NEC for independent contractors",
      category: "filing",
      jurisdiction: "federal",
      authority: "IRS",
      description: "Required for each non-employee paid $2,000 or more in the year (payments made after 2025).",
      frequency: "annual",
      deadline: "January 31",
      reason: `Largest contractor payment is ${p.largestContractorPaymentUsd}, at or above the $2,000 threshold`,
          }),
  },
  {
    id: "fed.exempt-application",
    when: (p) => p.entityType === "nonprofit" && !p.hasTaxExemptStatus,
    items: () => ({
      title: "Apply for federal tax-exempt status (Form 1023 or 1023-EZ)",
      category: "registration",
      jurisdiction: "federal",
      authority: "IRS",
      description: "Recognition of 501(c)(3) status; generally due within 27 months of formation for retroactive effect.",
      frequency: "once",
      reason: "Nonprofit without recognized exempt status",
            url: "https://www.irs.gov/charities-non-profits/application-for-recognition-of-exemption",
    }),
  },
  {
    id: "fed.ttb-alcohol",
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
      url: "https://www.ttb.gov",
    }),
  },
];
