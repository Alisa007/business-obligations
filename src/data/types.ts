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

export type Due = FixedDue | AnniversaryDue | MultiDue;

export interface ReportRule {
  frequency: "annual" | "biennial" | "every_five_years";
  fee: string;
  deadline: string;
  /** Overrides the default "File annual report" title. */
  title?: string;
  /** Machine-readable form of `deadline`, when it can be computed. */
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
    fee: string;
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
  /** Who administers local (city/county) sales taxes. */
  localSalesTax: "locally_administered" | "state_administered" | "none";
  /** Where a sole proprietor's trade name / DBA is registered; "none" when no filing is required. */
  dbaFiling: DbaFiling;
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

/** A city-level rule seed. */
export interface LocalJurisdiction {
  state: string;
  city: string;
  /** Counties the city lies in (informational). */
  counties?: string[];
  /** Other names that resolve to this jurisdiction (e.g. NYC boroughs). */
  aliases?: string[];
  items: Array<{
    id: string;
    title: string;
    category: "license" | "permit" | "registration" | "filing" | "payment" | "insurance" | "recordkeeping";
    authority: string;
    description: string;
    frequency: "once" | "annual" | "biennial" | "quarterly" | "monthly" | "per_event" | "ongoing";
    deadline?: string;
    due?: Due;
    url?: string;
    /** Tags; the item applies if any matches. */
    appliesTo: Array<"all" | "employees" | "sells_goods" | "corporation" | "unincorporated" | "trade_name">;
  }>;
}
