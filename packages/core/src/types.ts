export type EntityType =
  | "sole_proprietorship"
  /** General partnership (no state registration). */
  | "partnership"
  | "llc"
  /** Professional LLC. */
  | "pllc"
  /** Limited partnership. */
  | "lp"
  /** Limited liability partnership. */
  | "llp"
  | "c_corp"
  | "s_corp"
  /** Professional corporation. */
  | "pc"
  | "benefit_corp"
  | "nonprofit";

export type Country = "US";

export type Profession = "attorney" | "cpa" | "physician" | "architect" | "engineer" | "other";

/** Federal tax classification of an LLC (ignored for other entity types). */
export type LlcTaxClassification = "disregarded" | "partnership" | "s_corp" | "c_corp";

export type Industry =
  | "general"
  | "retail"
  | "restaurant"
  | "construction"
  | "healthcare"
  | "real_estate"
  | "professional_services"
  | "transportation"
  | "alcohol"
  | "childcare"
  | "cannabis";

/** What the business does with alcohol; required when `industry` is "alcohol". */
export type AlcoholActivity = "manufacture" | "import" | "wholesale" | "retail";

/** What the business does with cannabis; required when `industry` is "cannabis". */
export type CannabisActivity = "cultivation" | "manufacturing" | "retail" | "distribution" | "testing";

/** Commercial vehicle operations; required when `industry` is "transportation". */
export interface CommercialVehicles {
  /** Crosses state lines (or carries interstate cargo/passengers). */
  interstate: boolean;
  /** Largest gross vehicle weight rating or combination weight, in pounds. */
  grossWeightLbs?: number;
  /** Largest passenger capacity including the driver. */
  passengerCapacity?: number;
  /** Carries hazardous materials in placardable quantities. */
  carriesHazmat?: boolean;
  /** Passengers or cargo are carried for compensation. */
  forHire?: boolean;
}

/** Activity in a state other than the home state. */
export interface MultiStateActivity {
  state: string;
  employeeCount?: number;
  /** Owns or leases real or tangible personal property there. */
  hasProperty?: boolean;
  /** Annual sales of taxable goods into the state, in USD. */
  salesUsd?: number;
}

export interface BusinessProfile {
  /** Jurisdiction rule pack. Only "US" exists today; defaults to "US". */
  country?: Country;
  entityType: EntityType;
  /** 5-digit ZIP of the principal place of business. */
  zip: string;
  /** City / town of the principal place of business (names the local licensing authority). */
  city: string;
  /** County of the principal place of business (names the county clerk / health department). */
  county: string;
  /** Two-letter code. Optional; derived from ZIP when omitted. */
  state?: string;
  /** State of formation if different from the operating state (e.g. a Delaware LLC operating in TX). */
  formationState?: string;
  /** Activity in other states: employees, property or sales. */
  multistate?: MultiStateActivity[];
  /** Federal tax classification of an LLC or PLLC. */
  llcTaxClassification?: LlcTaxClassification;
  /** Professional and benefit corporations: true when an S election is in effect. */
  sCorpElection?: boolean;
  /** ISO date (YYYY-MM-DD) the entity was formed; enables anniversary-based due dates. */
  formationDate?: string;
  /** Fiscal year-end month, 1–12. Defaults to 12 (calendar year). */
  fiscalYearEndMonth?: number;
  /**
   * ISO date (YYYY-MM-DD) the business is dissolved or ceases operations, or the date the resolution to
   * dissolve is adopted. Adds the wind-down obligations (final returns, dissolution filing, withdrawals).
   */
  dissolutionDate?: string;
  /** Defaults to true. Set false for a business that is still being set up. */
  isFormed?: boolean;
  industry?: Industry;
  alcoholActivity?: AlcoholActivity;
  cannabisActivity?: CannabisActivity;
  commercialVehicles?: CommercialVehicles;
  /**
   * Number of members (LLC) or partners (LP, LLP, partnership); used for per-member and per-partner fees.
   * Defaults to 1.
   */
  ownerCount?: number;
  /** W-2 employees at the home location. Defaults to 0. */
  employeeCount?: number;
  /**
   * Employees regularly working 35+ hours per week. Defaults to `employeeCount` (all full-time).
   * Only some states' workers' compensation rules depend on hours (e.g. Michigan).
   */
  fullTimeEmployeeCount?: number;
  /** Total annual gross wages paid to employees, USD. Defaults to 0. */
  annualPayroll?: number;
  /**
   * Federal employment tax liability reported for the lookback period, USD. Omit for
   * new employers (monthly depositors). Over $50,000 means semiweekly deposits.
   */
  priorYearPayrollTaxLiability?: number;
  /** Largest amount paid to any single independent contractor in the year, USD. Defaults to 0. */
  largestContractorPaymentUsd?: number;
  sellsTaxableGoods?: boolean;
  /** Operated from the owner's residence. */
  homeBased?: boolean;
  /** Operates under a name different from the legal name. */
  usesTradeName?: boolean;
  /**
   * Licensed profession practiced through the business. Required for `pllc`, `pc`, `llp`
   * and the `professional_services` industry; use "other" for professions without a bundled board directory.
   */
  profession?: Profession;
  /** Federal tax-exempt status (501(c)) already granted. */
  hasTaxExemptStatus?: boolean;
  /** Annual gross receipts, USD. Defaults to 0. */
  annualRevenue?: number;
  /** Expected annual net income (profit) of the business, USD. Defaults to 0. */
  annualNetIncome?: number;
  /** Six-digit NAICS code of the main activity, for rules finer than `industry`. */
  naics?: string;
  /** Free-form activity tags (for example "demolition", "roofing") that rules may match. */
  activities?: string[];
  /** Construction: total value of the project, USD. */
  projectValueUsd?: number;
  /** Construction: acres of land disturbed. One or more triggers stormwater permit coverage. */
  disturbedAcres?: number;
  /** Construction: contractor license class or classification the business holds or needs. */
  licenseClass?: string;
  /** Premises floor area in square feet (occupancy, signage and health permits). */
  floorAreaSqFt?: number;
  /** The business displays exterior signage. */
  hasSignage?: boolean;
  /** The business prepares or serves food. */
  foodService?: boolean;
}

export type ItemCategory =
  "license" | "permit" | "registration" | "filing" | "payment" | "insurance" | "recordkeeping";

import type { ChangeNotice, Due, FeeDetail, LateFee } from "./data/types";
export type { ChangeNotice, Due, FeeDetail, LateFee } from "./data/types";

/** What kind of document a source is. Inferred from the URL unless a data file says otherwise. */
export type SourceKind = "statute" | "ordinance" | "agency_page" | "pdf" | "dataset";

/** One source an item's data comes from, with a retrieval date and a stable fallback copy. */
export interface SourceRef {
  url: string;
  kind: SourceKind;
  /** Date the source was last retrieved and read (the provenance's `checkedOn`). */
  retrievedOn?: string;
  /** Internet Archive link that resolves to the latest snapshot, for pages and PDFs that move or disappear. */
  archiveUrl: string;
}

/** A machine-readable condition under which an item applies, for example `disturbedAcres >= 1`. */
export interface Applicability {
  /** Profile field the condition reads. */
  field: string;
  op: ">=" | ">" | "<=" | "<" | "==" | "!=" | "in";
  value: string | number | boolean | string[];
  /** Plain-language form of the condition. */
  description?: string;
}

export type FilingMethod = "online" | "mail" | "in_person" | "fax";

export interface Provenance {
  /**
   * `checked`: confirmed against official pages on `checkedOn`; `compiled`: from public knowledge, not
   * individually checked; `unconfirmed`: reviewed but one or more underlying fields could not be confirmed.
   */
  confidence: "checked" | "compiled" | "unconfirmed";
  checkedOn?: string;
  /** Date after which the item should be re-verified (`checkedOn` plus one year). Absent when never checked. */
  reviewBy?: string;
  /** True when `reviewBy` is before the evaluation date: the data may be out of date. */
  stale?: boolean;
  sources: string[];
  /** The same sources with kind, retrieval date and an archive link. */
  sourceDetails?: SourceRef[];
}

export type Jurisdiction = "federal" | "state" | "county" | "city";

export type Frequency =
  "once" | "annual" | "biennial" | "every_five_years" | "quarterly" | "monthly" | "per_event" | "ongoing";

export interface ComplianceItem {
  id: string;
  /** Id of the rule that produced the item (`id` without the state, key and index suffixes). */
  ruleId: string;
  title: string;
  category: ItemCategory;
  jurisdiction: Jurisdiction;
  /** Issuing / receiving authority, e.g. "IRS" or "California Secretary of State". */
  authority: string;
  /** Two-letter state code for state/local items. */
  state?: string;
  description: string;
  frequency: Frequency;
  /** Human-readable deadline, e.g. "April 15". */
  deadline?: string;
  /** Machine-readable deadline rule, when one can be expressed. */
  due?: Due;
  /** Next due date (YYYY-MM-DD) on or after the evaluation date, when computable. */
  nextDue?: string;
  /** Structured fee, when the item has a government fee or tax with a known basis. */
  cost?: FeeDetail & { currency: "USD" };
  /** Late-filing or late-payment penalty, when known. */
  penalty?: LateFee & { currency: "USD" };
  /** Where this item's data comes from and how well it was checked. */
  provenance?: Provenance;
  /** Changes to the rules behind this item that take effect after the evaluation date. */
  upcomingChanges?: ChangeNotice[];
  /** Why the engine returned this item. */
  reason: string;
  url?: string;
  /** Conditions under which the item applies (all must hold), when they can be expressed as profile checks. */
  appliesWhen?: Applicability[];
  /** Situations in which the item does not apply even if `appliesWhen` holds. */
  exemptions?: string[];
  /** Ids of items this one replaces (for example a local requirement that replaces a state default). */
  supersedes?: string[];
  /** Id of the item that takes precedence over this one when both are returned. */
  preemptedBy?: string;
  /**
   * Stable jurisdiction identifier: `US`, `US-TX`, `US-TX/county/travis` or `US-TX/city/austin`. Use it instead of
   * matching names, which collide across states.
   */
  jurisdictionId?: string;
  /** Two-digit FIPS code of the item's state. */
  stateFips?: string;
  /**
   * Census FIPS code of the item's county (5 digits) or city (7 digits, state + place). Present for the counties
   * and cities bundled in `data/`, when the Census name matches unambiguously.
   */
  fips?: string;
  /** For city items: whether the place is an incorporated municipality (false for unincorporated communities). */
  incorporated?: boolean;
  /** Government form or filing name, e.g. "SS-4". */
  formId?: string;
  filingMethod?: FilingMethod[];
  /** Typical processing time, e.g. "Immediate online; about 4 weeks by mail". */
  processingTime?: string;
  /** How and when the item is renewed, e.g. "Every two years before the license expiry date". */
  renewal?: string;
  /** Link that opens a pre-filled data-correction issue for this item. */
  feedbackUrl?: string;
}

export interface Presence {
  state: string;
  home: boolean;
  employeeCount: number;
  hasProperty: boolean;
  /** Annual taxable sales into the state; undefined for the home state (see `sellsTaxableGoods`). */
  salesUsd?: number;
}

export interface ResolvedProfile extends BusinessProfile {
  country: Country;
  fiscalYearEndMonth: number;
  state: string;
  formationState: string;
  isFormed: boolean;
  industry: Industry;
  employeeCount: number;
  fullTimeEmployeeCount: number;
  ownerCount: number;
  hasEmployees: boolean;
  annualPayroll: number;
  largestContractorPaymentUsd: number;
  annualRevenue: number;
  annualNetIncome: number;
  sellsTaxableGoods: boolean;
  homeBased: boolean;
  usesTradeName: boolean;
  hasTaxExemptStatus: boolean;
  /** Home state first, then each other state with activity. */
  presence: Presence[];
  /** Effective federal tax treatment. */
  taxTreatment: "sole_prop" | "partnership" | "s_corp" | "c_corp" | "nonprofit";
}

/** A rule's output before the engine assigns an id and computes due dates. */
export type ItemDraft = Omit<ComplianceItem, "id" | "ruleId" | "nextDue"> & {
  /** Distinguishes several items from one rule in the same state; becomes part of the id. */
  key?: string;
};

export interface Rule {
  id: string;
  /** What the rule covers, for documentation and introspection. */
  description: string;
  /** Profile fields the rule reads. */
  inputs: Array<keyof BusinessProfile | "state">;
  when: (p: ResolvedProfile) => boolean;
  items: (p: ResolvedProfile) => ItemDraft | ItemDraft[];
}
