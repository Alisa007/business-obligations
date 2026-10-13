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

export interface BusinessProfile {
  entityType: EntityType;
  /** 5-digit ZIP of the principal place of business. */
  zip: string;
  /** Two-letter code. Optional; derived from ZIP when omitted. */
  state?: string;
  /** State of formation if different from the operating state (e.g. a Delaware LLC operating in TX). */
  formationState?: string;
  /** Other states where the business has employees, property or sales activity. */
  otherStates?: string[];
  llcTaxClassification?: LlcTaxClassification;
  /** Defaults to true. Set false for a business that is still being set up. */
  isFormed?: boolean;
  industry?: Industry;
  hasEmployees?: boolean;
  paysContractors?: boolean;
  sellsTaxableGoods?: boolean;
  /** Operated from the owner's residence. */
  homeBased?: boolean;
  /** Operates under a name different from the legal name. */
  usesTradeName?: boolean;
  /** Federal tax-exempt status (501(c)) already granted. */
  hasTaxExemptStatus?: boolean;
  /** Annual gross receipts in USD. */
  annualRevenue?: number;
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
  /** True when the item is a best-effort pointer and must be confirmed with the authority. */
  needsVerification: boolean;
  url?: string;
}

export interface ResolvedProfile extends BusinessProfile {
  state: string;
  formationState: string;
  isFormed: boolean;
  industry: Industry;
  hasEmployees: boolean;
  paysContractors: boolean;
  sellsTaxableGoods: boolean;
  homeBased: boolean;
  usesTradeName: boolean;
  hasTaxExemptStatus: boolean;
  otherStates: string[];
  /** Effective federal tax treatment. */
  taxTreatment: "sole_prop" | "partnership" | "s_corp" | "c_corp" | "nonprofit";
}

export type ItemDraft = Omit<ComplianceItem, "id">;

export interface Rule {
  id: string;
  when: (p: ResolvedProfile) => boolean;
  items: (p: ResolvedProfile) => ItemDraft | ItemDraft[];
}
