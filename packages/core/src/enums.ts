/**
 * The allowed values of every enumerated field, written once. The TypeScript unions, the profile validator and the
 * web form are derived from these lists, and a test checks the JSON schemas against them.
 */

export const ENTITY_TYPES = [
  "sole_proprietorship",
  "partnership", // general partnership (no state registration)
  "llc",
  "pllc", // professional LLC
  "lp", // limited partnership
  "llp", // limited liability partnership
  "c_corp",
  "s_corp",
  "pc", // professional corporation
  "benefit_corp",
  "nonprofit",
] as const;

export const LLC_TAX_CLASSIFICATIONS = ["disregarded", "partnership", "s_corp", "c_corp"] as const;

export const INDUSTRIES = [
  "general",
  "retail",
  "restaurant",
  "construction",
  "healthcare",
  "real_estate",
  "professional_services",
  "transportation",
  "alcohol",
  "childcare",
  "cannabis",
] as const;

export const ALCOHOL_ACTIVITIES = ["manufacture", "import", "wholesale", "retail"] as const;
export const CANNABIS_ACTIVITIES = [
  "cultivation",
  "manufacturing",
  "retail",
  "distribution",
  "testing",
] as const;
export const PROFESSIONS = ["attorney", "cpa", "physician", "architect", "engineer", "other"] as const;

export const ITEM_CATEGORIES = [
  "license",
  "permit",
  "registration",
  "filing",
  "payment",
  "insurance",
  "recordkeeping",
] as const;
export const JURISDICTIONS = ["federal", "state", "county", "city"] as const;
export const FREQUENCIES = [
  "once",
  "annual",
  "biennial",
  "every_five_years",
  "semiannual",
  "quarterly",
  "monthly",
  "per_event",
  "ongoing",
] as const;
export const FILING_METHODS = ["online", "mail", "in_person", "fax"] as const;
export const APPLIES_TO = [
  "all",
  "employees",
  "sells_goods",
  "corporation",
  "unincorporated",
  "trade_name",
] as const;
