import { STATES } from "./states.js";

/** When workers' compensation coverage becomes mandatory (private employers). */
export interface WcTrigger {
  minEmployees: number;
  /** Alternative trigger: annual payroll at or above this amount makes coverage mandatory. */
  orAnnualPayroll?: number;
  /** Payroll that must be exceeded in addition to the employee count (KS). */
  andAnnualPayrollOver?: number;
  /** Lower employee threshold in construction. */
  constructionMinEmployees?: number;
  /** Coverage is elective for private employers (TX). */
  elective?: boolean;
}

const T = (minEmployees: number, rest: Omit<WcTrigger, "minEmployees"> = {}): WcTrigger => ({ minEmployees, ...rest });

export const WC_TRIGGERS: Record<string, WcTrigger> = {
  AL: T(5), AR: T(3), GA: T(3), MS: T(5), NM: T(3), NC: T(3), VA: T(3), SC: T(4),
  MO: T(5, { constructionMinEmployees: 1 }),
  TN: T(5, { constructionMinEmployees: 1 }),
  FL: T(4, { constructionMinEmployees: 1 }),
  // Wisconsin: 3 employees, or $500 of payroll in a quarter (approximated as $2,000 annually).
  WI: T(3, { orAnnualPayroll: 2000 }),
  KS: T(1, { andAnnualPayrollOver: 20000 }),
  TX: T(1, { elective: true }),
};

export function wcTrigger(state: string): WcTrigger {
  return WC_TRIGGERS[state] ?? T(1);
}

/** Minimum employee count that triggers a state paid-leave program. */
export const PAID_LEAVE_MIN_EMPLOYEES: Record<string, number> = { DE: 10 };

/** Annual sales into the state at which a remote seller must register for sales tax. */
const NEXUS_OVERRIDES: Record<string, number | null> = {
  AL: 250_000, CA: 500_000, MS: 250_000, NY: 500_000, TX: 500_000,
  DE: null, MT: null, NH: null, OR: null,
};
export function economicNexusUsd(state: string): number | null {
  return state in NEXUS_OVERRIDES ? NEXUS_OVERRIDES[state]! : 100_000;
}

export type DbaFiling = "state" | "county" | "town" | "none";

/** Where a trade name / DBA is registered. */
export const DBA_FILING: Record<string, DbaFiling> = {
  AL: "county", AK: "state", AZ: "state", AR: "county", CA: "county", CO: "state", CT: "town",
  DE: "county", DC: "state", FL: "state", GA: "county", HI: "state", ID: "state", IL: "county",
  IN: "state", IA: "state", KS: "state", KY: "county", LA: "county", ME: "town", MD: "state",
  MA: "town", MI: "county", MN: "state", MS: "state", MO: "state", MT: "state", NE: "state",
  NV: "county", NH: "town", NJ: "county", NM: "none", NY: "county", NC: "county", ND: "state",
  OH: "state", OK: "state", OR: "state", PA: "state", RI: "town", SC: "none", SD: "state",
  TN: "county", TX: "county", UT: "state", VT: "state", VA: "county", WA: "state", WV: "county",
  WI: "none", WY: "state",
};

// Fail fast if the tables drift from the state list.
for (const code of Object.keys(STATES)) {
  if (!(code in DBA_FILING)) throw new Error(`DBA_FILING missing ${code}`);
}
