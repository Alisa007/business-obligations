import type { Catalog } from "../i18n";

/**
 * English display labels. The engine's own text is already English, so this catalog only names the enum values
 * (`labels.frequency` is "Every five years" instead of `every_five_years`) and the entity types.
 */
export const en: Catalog = {
  locale: "en",
  categories: {
    license: "License",
    permit: "Permit",
    registration: "Registration",
    filing: "Filing",
    payment: "Payment",
    insurance: "Insurance",
    recordkeeping: "Recordkeeping",
  },
  frequencies: {
    once: "One-time",
    annual: "Annual",
    biennial: "Every two years",
    every_three_years: "Every three years",
    every_five_years: "Every five years",
    semiannual: "Twice a year",
    quarterly: "Quarterly",
    monthly: "Monthly",
    per_event: "Per event",
    ongoing: "Ongoing",
  },
  jurisdictions: { federal: "Federal", state: "State", county: "County", city: "City" },
  filingMethods: { online: "Online", mail: "By mail", in_person: "In person", fax: "By fax" },
  confidence: { checked: "Checked", compiled: "Compiled", unconfirmed: "Unconfirmed" },
  entityTypes: {
    sole_proprietorship: "sole proprietorship",
    partnership: "general partnership",
    llc: "LLC",
    pllc: "PLLC",
    lp: "limited partnership",
    llp: "limited liability partnership",
    c_corp: "C corporation",
    s_corp: "S corporation",
    pc: "professional corporation",
    benefit_corp: "benefit corporation",
    nonprofit: "nonprofit",
  },
};
