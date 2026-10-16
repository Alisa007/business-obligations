import type { APPLIES_TO } from "../enums";
import type { Applicability, FilingMethod, Frequency, ItemCategory } from "../types";
export interface Agency {
  name: string;
  url?: string;
}

export interface FixedDue {
  type: "fixed";
  month: number;
  day: number;
  /** Only odd or even calendar years (biennial filings). */
  parity?: "odd" | "even";
  /** Biennial cycle anchored to the formation year or the year after it. */
  cycleFrom?: "formation_year" | "year_after_formation";
}

export interface AnniversaryDue {
  type: "anniversary";
  point: "start_of_month" | "end_of_month" | "date";
}

export interface MultiDue {
  type: "multi";
  dates: ReadonlyArray<{ month: number; day: number }>;
}

/** A single absolute date, e.g. a final-return deadline derived from a dissolution date. */
export interface DateDue {
  type: "date";
  /** ISO date (YYYY-MM-DD). */
  date: string;
}

export type Due = FixedDue | AnniversaryDue | MultiDue | DateDue;

/** Structured threshold and rate for a gross-receipts, margin or franchise-style entity tax. */
export interface EntityTaxDetail {
  kind: "gross_receipts" | "margin";
  /** Revenue (USD) at or below which no tax is due. */
  thresholdUsd: number;
  /** Percentage rate applied above the threshold (or to margin). Omitted when it varies by industry. */
  rate?: number;
  /** Fixed amount added once the threshold is exceeded, USD. */
  baseUsd?: number;
  summary: string;
  source: string;
  checkedOn: string;
}

export interface StateLinks {
  /** How to form an entity with the filing office. */
  formation: string;
  /** Annual, biennial or periodic report filing or renewal. */
  annualReport: string;
  /** Employer registration for unemployment insurance. */
  uiRegistration: string;
  /** Employer registration for state income tax withholding. */
  withholding?: string;
  /** Sales and use tax permit or license registration. */
  salesTax?: string;
  /** Corporate income, franchise or gross-receipts tax. */
  entityTax: string;
  /** The state's required workplace posters and notices. */
  laborPosters: string;
  /** Trade name / DBA registration, where it is filed with the state (see `dbaFiling`). */
  dba?: string;
}

export interface UnemploymentInfo {
  /** Annual wages per employee subject to the tax, USD. */
  wageBase: number;
  /** Lowest and highest experience-rated contribution rate, percent. */
  minRate: number;
  maxRate: number;
  /** Rate for new employers, percent; null when it depends on the employer's industry average. */
  newEmployerRate: number | null;
  note?: string;
  /** Calendar year the figures apply to; the same for every state (`data/ui-source.json`), added on load. */
  year: number;
}

/** Machine-readable fee. `amount` is the standard/base figure; `online`/`paper` apply when they differ. */
export interface FeeDetail {
  basis: "flat" | "per_partner" | "per_member" | "percent" | "varies" | "none";
  amount?: number;
  online?: number;
  paper?: number;
  /** Percentage rate (basis percent), e.g. 2.7 for 2.7%. */
  rate?: number;
  /** Cap on the amount the rate applies to, per employee or per period (basis percent). */
  base?: number;
  /** Charge per partner/member (basis per_partner / per_member). */
  perUnit?: number;
  /** Units covered by the base `amount` before `perUnit` applies (per_member). */
  freeUnits?: number;
  min?: number;
  max?: number;
  /** The fee is waived when the filing is on time. */
  waived?: boolean;
  /** The amount is an estimate that could not be confirmed against the statute or schedule. */
  estimate?: boolean;
  note?: string;
}

/** Penalty for a late filing or payment. */
export interface LateFee {
  amount: number;
  /** Additional interest or penalty as a percentage per month. */
  percentPerMonth?: number;
  note: string;
}

export interface ReportRule {
  /** Derived from `rrule` when there is one. */
  frequency?: "annual" | "biennial" | "every_five_years" | "periodic";
  /**
   * Fee text. Stored only when the structured `feeDetail` cannot say it all (a waiver, an estimate, a rate); otherwise
   * generated from `feeDetail`.
   */
  fee?: string;
  /** The fee as numbers; the source for the amount. */
  feeDetail?: FeeDetail;
  lateFee?: LateFee;
  /**
   * The schedule as an iCalendar recurrence rule, e.g. `FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=15` (see `rrule.ts`). When
   * present, `frequency` and `due` are derived from it and must be left out, and `deadline` is generated unless
   * it adds detail the rule cannot (such as a grace period).
   */
  rrule?: string;
  /** Start of a cycle longer than a year: an ISO date, `formation_year` or `year_after_formation`. */
  anchor?: string;
  /** Human-readable deadline; generated from `rrule` when omitted. */
  deadline?: string;
  /** Overrides the default "File annual report" title. */
  title?: string;
  /** Machine-readable form of `deadline` for data without an `rrule`. */
  due?: Due;
}

export interface WcTrigger {
  minEmployees: number;
  /** Alternative trigger: annual payroll at or above this amount makes coverage mandatory. */
  orAnnualPayroll?: number;
  /** Alternative trigger: this many full-time (35+ hour) employees makes coverage mandatory (MI). */
  orFullTimeEmployees?: number;
  /** Payroll that must be exceeded in addition to the employee count (KS). */
  andAnnualPayrollOver?: number;
  /** Payroll that must be reached (at or above) in addition to the employee count (SC). */
  andAnnualPayrollAtLeast?: number;
  /** Lower employee threshold in construction. */
  constructionMinEmployees?: number;
  /** Coverage is elective for private employers (TX). */
  elective?: boolean;
}

export type DbaFiling = "state" | "county" | "town" | "none";

export interface IndustryAuthorities {
  /** State general-contractor licensing/registration authority; null = no statewide license. */
  contractor: string | null;
  realEstate: string;
  alcohol: string;
  childCare: string;
  /** Health facility licensing authority. */
  health: string;
}

export interface StateInfo {
  code: string;
  name: string;
  /** Agency where entities are formed/registered and reports are filed. */
  filing: Required<Agency>;
  /** Primary tax agency (income/franchise, and sales tax unless `salesTax.agency` is set). */
  revenue: Required<Agency>;
  /** Unemployment insurance agency. */
  labor: Required<Agency>;
  workersComp: {
    agency: string;
    /** Human-readable threshold. */
    threshold: string;
    /** Coverage must be bought from an exclusive state fund. */
    stateFund: boolean;
    trigger: WcTrigger;
  };
  /** Periodic report required of LLCs formed in the state; null = none. */
  llcReport: ReportRule | null;
  /** Periodic report required of corporations and nonprofits formed in the state; null = none. */
  corpReport: ReportRule | null;
  /** Report for limited partnerships when it differs from the LLC report; null = none, absent = same as LLC. */
  lpReport?: ReportRule | null;
  /** Report for limited liability partnerships when it differs from the LLC report; null = none, absent = same as LLC. */
  llpReport?: ReportRule | null;
  /** LLCs taxed as corporations must file the corporate report even though plain LLCs do not (SC). */
  llcReportAppliesWhenTaxedAsCorp?: boolean;
  /** Entity-level income / franchise / gross-receipts taxes. */
  entityTax: string;
  /** State levies wage withholding (individual income tax on wages). */
  wageWithholding: boolean;
  salesTax: {
    statewide: boolean;
    /** Name of the permit/registration (statewide) or of the nearest equivalent. */
    permit: string;
    agency: Required<Agency> | null;
    /** For states without a statewide sales tax: what applies instead. */
    alternative: string | null;
  };
  /** General state-level business license, where one exists. */
  businessLicense: {
    title: string;
    authority: string;
    /** Page for the license (replaces a separate link entry). */
    url?: string;
    /** See `ReportRule.fee`. */
    fee?: string;
    feeDetail?: FeeDetail;
    renewal: "annual" | "biennial" | "once";
  } | null;
  /** Mandatory state paid-leave / disability program with employer duties. */
  paidLeave: { title: string; agency: string; description: string; minEmployees: number } | null;
  /** Statewide paid sick leave mandate. */
  paidSickLeave: { minEmployees: number } | null;
  /** Typical general local licensing in the state. */
  local: { title: string; authority: string; description: string };
  /** Post-formation newspaper publication requirement for LLCs. */
  llcPublication: string | null;
  /** Annual sales into the state at which a remote seller must register; null = no statewide sales tax. */
  economicNexusUsd: number | null;
  /** State cannabis licensing regime. */
  cannabis: {
    status: "adult_use" | "medical_only" | "cbd_only";
    regulator: string | null;
    note?: string;
  };
  /**
   * Specific agency pages (not home pages) for the obligations the rules cite. `withholding` and `salesTax`
   * are present only where the state has a wage-withholding or statewide sales tax regime.
   */
  links: StateLinks;
  /** Threshold and rate of the state's gross-receipts or margin tax, where it has one. */
  entityTaxDetail?: EntityTaxDetail;
  /** State unemployment insurance (SUI) employer tax parameters. */
  unemployment: UnemploymentInfo;
  /** Who administers local (city/county) sales taxes. */
  localSalesTax: "locally_administered" | "state_administered" | "none";
  /** Where a sole proprietor's trade name / DBA is registered; "none" when no filing is required. */
  dbaFiling: DbaFiling;
  /**
   * True when registered entities (LLCs, corporations) also file assumed names at the county or town level
   * (California, Connecticut, Georgia, Massachusetts, Nevada, North Carolina) instead of with the state.
   */
  dbaEntitiesFileLocally?: boolean;
  /** Name of the county/town office when `dbaFiling` is county or town. */
  dbaOffice?: string;
  /** State agency taking trade names when it is not the entity filing agency. */
  dbaAuthority?: Required<Agency>;
  industry: IndustryAuthorities;
  verification: {
    checkedOn: string;
    scope: string;
    sources: string[];
    /** Dotted field paths that could not be confirmed against an official source. */
    unconfirmed: string[];
    /** Whether the DBA filing level was confirmed. */
    dba: "checked" | "unconfirmed";
  };
}

/** One city- or county-level obligation. */
export interface LocalItem {
  id: string;
  title: string;
  category: ItemCategory;
  authority: string;
  description: string;
  /** Derived from `rrule` when there is one. */
  frequency?:
    "once" | "annual" | "biennial" | "every_five_years" | "quarterly" | "monthly" | "per_event" | "ongoing";
  /** The schedule as an iCalendar recurrence rule (see `ReportRule.rrule`). */
  rrule?: string;
  /** Start of a cycle longer than a year (see `ReportRule.anchor`). */
  anchor?: string;
  /** Human-readable deadline; generated from `rrule` when omitted. */
  deadline?: string;
  /** Machine-readable form of `deadline` for data without an `rrule`. */
  due?: Due;
  url?: string;
  /** Tags; the item applies if any matches. */
  appliesTo: Array<(typeof APPLIES_TO)[number]>;
  /** Machine-readable conditions under which the item applies, beyond the `appliesTo` tags. */
  appliesWhen?: Applicability[];
  /** Situations in which the item does not apply even when it otherwise would. */
  exemptions?: string[];
  /**
   * Items this one replaces, by item id (for example `state.annual-report:TX`) or by rule id (every item of that
   * rule). The replaced items come back marked `preemptedBy` this item.
   */
  supersedes?: string[];
  /** Id or rule id of an item that takes precedence over this one when both apply. */
  preemptedBy?: string;
  /** Government form or filing name. */
  formId?: string;
  filingMethod?: FilingMethod[];
  processingTime?: string;
  /** How the item is renewed, when that is more specific than `frequency`. */
  renewal?: string;
}

/** A county-level rule seed: what a county (or parish, borough) requires of businesses located in it. */
export interface CountyJurisdiction {
  state: string;
  /** County name as the ZIP data spells it, without "County" (for example "Los Angeles", "Miami-Dade"). */
  county: string;
  /** Other names that resolve to this county. */
  aliases?: string[];
  /** `rules` (default), `none` (checked, nothing county-specific) or `unverified` (no official page confirmed). */
  status?: "rules" | "none" | "unverified";
  /** Date (YYYY-MM-DD) the entry was last checked against the county's official pages. */
  checkedOn?: string;
  /** Official page backing a `none` status. */
  sourceUrl?: string;
  /** Code of a shared explanation in `data/local-notes.json`; resolved into `note` on load. Not together with `note`. */
  reason?: string;
  note?: string;
  items: LocalItem[];
}

/** A city-level rule seed. */
export interface LocalJurisdiction {
  state: string;
  city: string;
  /** Counties the city lies in (informational). */
  counties?: string[];
  /** Other names that resolve to this jurisdiction (e.g. NYC boroughs). */
  aliases?: string[];
  /**
   * `rules` (default): the city levies its own taxes, licenses or permits listed in `items`.
   * `none`: checked, and the city has no general business license or tax of its own (`items` is empty);
   * the state's regime and the generic local rules still apply.
   * `unverified`: researched, but no official city page confirmed either way (`items` is empty).
   */
  status?: "rules" | "none" | "unverified";
  /** Date (YYYY-MM-DD) the entry was last checked against the city's official pages. */
  checkedOn?: string;
  /** Official page backing a `none` status. */
  sourceUrl?: string;
  /** Code of a shared explanation in `data/local-notes.json`; resolved into `note` on load. Not together with `note`. */
  reason?: string;
  /** Short explanation shown to maintainers (for example what the city does require instead). */
  note?: string;
  items: LocalItem[];
}

/** What a rule change is about. */
export type ChangeKind =
  "fee" | "deadline" | "requirement" | "repeal" | "threshold" | "enforcement" | "other";

/**
 * A dated change to the rules. Past changes are informational (the bundled data already reflects them).
 * Enacted changes with `patches` and a future `effective` date are applied to the state data when the
 * evaluation date reaches `effective`.
 */
export interface RuleChange {
  id: string;
  /** Date the change takes effect (YYYY-MM-DD). */
  effective: string;
  announced?: string;
  /** Only enacted changes are applied; proposed changes are reported as upcoming. */
  status: "enacted" | "proposed";
  kind: ChangeKind;
  summary: string;
  scope: {
    country?: "US";
    state?: string;
    /** Rule-id prefixes the change affects; matches item ids such as `state.annual-report:PA`. */
    rules?: string[];
  };
  /** Dotted paths into the state's data (`StateInfo`) and the value in force from `effective`. */
  patches?: Array<{ path: string; value: unknown }>;
  source?: string;
}

/** The subset of a change attached to items and results. */
export type ChangeNotice = Pick<RuleChange, "id" | "effective" | "status" | "kind" | "summary" | "source">;
