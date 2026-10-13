export interface Agency {
  name: string;
  url?: string;
}

export interface ReportRule {
  frequency: "annual" | "biennial";
  fee: string;
  deadline: string;
  /** Overrides the default "File annual report" title. */
  title?: string;
}

export interface StateInfo {
  name: string;
  /** Agency where entities are formed/registered and reports are filed. */
  filing: Required<Agency>;
  /** Primary tax agency (income/franchise, and sales tax unless `salesTax.agency` is set). */
  revenue: Required<Agency>;
  /** Unemployment insurance agency. */
  labor: Required<Agency>;
  workersComp: {
    agency: string;
    /** Employee-count trigger for mandatory coverage. */
    threshold: string;
    /** Coverage must be bought from an exclusive state fund. */
    stateFund?: boolean;
  };
  /** Periodic report required of LLCs formed in the state; null = none. */
  llcReport: ReportRule | null;
  /** Periodic report required of corporations and nonprofits formed in the state; null = none. */
  corpReport: ReportRule | null;
  /** Entity-level income / franchise / gross-receipts taxes. */
  entityTax: string;
  /** State levies wage withholding (individual income tax on wages). */
  wageWithholding: boolean;
  salesTax: {
    statewide: boolean;
    /** Name of the permit/registration (statewide) or of the nearest equivalent. */
    permit: string;
    agency?: Required<Agency>;
    /** For states without a statewide sales tax: what to check instead. */
    alternative?: string;
  };
  /** General state-level business license, where one exists. */
  businessLicense?: {
    title: string;
    authority: string;
    fee: string;
    renewal: "annual" | "biennial" | "once";
  };
  /** Mandatory state paid-leave / disability program with employer duties. */
  paidLeave?: { title: string; agency: string; description: string };
  /** Typical general local licensing in the state. */
  local: { title: string; authority: string; description: string };
  /** Post-formation newspaper publication requirement for LLCs. */
  llcPublication?: string;
}
