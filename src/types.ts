export type EntityType =
  | "sole_proprietorship"
  | "partnership"
  | "llc"
  | "c_corp"
  | "s_corp"
  | "nonprofit";

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
  | "childcare";

/** What the business does with alcohol; required when `industry` is "alcohol". */
export type AlcoholActivity = "manufacture" | "import" | "wholesale" | "retail";

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
  llcTaxClassification?: LlcTaxClassification;
  /** Defaults to true. Set false for a business that is still being set up. */
  isFormed?: boolean;
  industry?: Industry;
  alcoholActivity?: AlcoholActivity;
  commercialVehicles?: CommercialVehicles;
  /** W-2 employees at the home location. Defaults to 0. */
  employeeCount?: number;
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
  /** Federal tax-exempt status (501(c)) already granted. */
  hasTaxExemptStatus?: boolean;
  /** Annual gross receipts, USD. Defaults to 0. */
  annualRevenue?: number;
  /** Expected annual net income (profit) of the business, USD. Defaults to 0. */
  annualNetIncome?: number;
}

export type ItemCategory =
  | "license"
  | "permit"
  | "registration"
  | "filing"
  | "payment"
  | "insurance"
  | "recordkeeping";

export type Jurisdiction = "federal" | "state" | "county" | "city";

export type Frequency =
  | "once"
  | "annual"
  | "biennial"
  | "quarterly"
  | "monthly"
  | "per_event"
  | "ongoing";

export interface ComplianceItem {
  id: string;
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
  /** Why the engine returned this item. */
  reason: string;
  url?: string;
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
  state: string;
  formationState: string;
  isFormed: boolean;
  industry: Industry;
  employeeCount: number;
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

export type ItemDraft = Omit<ComplianceItem, "id">;

export interface Rule {
  id: string;
  when: (p: ResolvedProfile) => boolean;
  items: (p: ResolvedProfile) => ItemDraft | ItemDraft[];
}
