import { estimateCosts, type CostEstimate } from "./costs";
import { evaluate, type ComplianceResult, type EvaluateOptions } from "./engine";
import type { BusinessProfile, ComplianceItem } from "./types";

export type LaunchPhaseId = "prepare" | "form" | "identify" | "register" | "license" | "employ" | "operate";

export interface LaunchStep {
  /** Position in the whole plan, starting at 1. */
  order: number;
  phase: LaunchPhaseId;
  item: ComplianceItem;
  /** Ids of items that must be done first (the formation filing, the EIN, ...). */
  dependsOn: string[];
  /** Earliest planned start (YYYY-MM-DD). */
  start: string;
  /** Planned completion date: the end of the phase window. For recurring items, the first legal due date. */
  target?: string;
  /** A legal due date earlier than or equal to the planned completion, when the item has one. */
  legalDeadline?: string;
}

export interface LaunchPhase {
  id: LaunchPhaseId;
  title: string;
  description: string;
  /** Planned window. The `operate` phase starts at the opening date and has no end. */
  start: string;
  end?: string;
  steps: LaunchStep[];
}

export interface LaunchOptions extends EvaluateOptions {
  /** First day of planning (YYYY-MM-DD). Defaults to today (UTC). */
  startDate?: string;
  /** Date you want to open for business. When given, the plan reports whether it fits. */
  openingDate?: string;
  /**
   * Planning allowance in days per phase. These are scheduling buffers, not agency processing times, which
   * vary by state and season; set them from what the agencies publish for your case.
   */
  allowanceDays?: Partial<Record<Exclude<LaunchPhaseId, "operate">, number>>;
}

export interface LaunchPlan {
  startDate: string;
  /** Planned date of the formation filing (the end of the `prepare` phase). */
  formationDate: string;
  /** Date the plan reaches the end of the `employ` phase: the earliest planned opening. */
  readyDate: string;
  openingDate?: string;
  /** With `openingDate`: whether the plan finishes by then. */
  onTrack?: boolean;
  /** With `openingDate`: days between the ready date and the opening date (negative when late). */
  slackDays?: number;
  phases: LaunchPhase[];
  /** All steps in order. */
  steps: LaunchStep[];
  /** Fees for the items in the plan: one-time and per-year. */
  costs: CostEstimate;
  /** The evaluation the plan was built from. */
  result: ComplianceResult;
}

const DEFAULT_ALLOWANCE: Record<Exclude<LaunchPhaseId, "operate">, number> = {
  prepare: 7,
  form: 14,
  identify: 3,
  register: 14,
  license: 30,
  employ: 7,
};

const PHASES: Array<{ id: LaunchPhaseId; title: string; description: string }> = [
  {
    id: "prepare",
    title: "Prepare to file",
    description:
      "Things the formation documents depend on: a registered agent and any professional approvals.",
  },
  {
    id: "form",
    title: "Form the entity",
    description: "File the formation documents with the state.",
  },
  {
    id: "identify",
    title: "Get your federal identity",
    description:
      "Obtain the EIN (and apply for tax-exempt status, for nonprofits). Most registrations need it.",
  },
  {
    id: "register",
    title: "Register with tax and filing agencies",
    description: "State tax accounts, trade name, foreign qualification and publication requirements.",
  },
  {
    id: "license",
    title: "Get licenses and permits",
    description: "Licenses and permits you need before you operate: state, industry, local and professional.",
  },
  {
    id: "employ",
    title: "Set up before your first hire",
    description: "Insurance, employment paperwork, new-hire reporting and workplace notices.",
  },
  {
    id: "operate",
    title: "Run the business",
    description: "Recurring filings and payments, in the order they fall due.",
  },
];

/** Rule ids (without state or index) that have a fixed phase. */
const PHASE_OF: Record<string, LaunchPhaseId> = {
  "state.registered-agent": "prepare",
  "state.professional-entity": "prepare",
  "state.formation": "form",
  "fed.ein": "identify",
  "fed.exempt-application": "identify",
  "state.foreign-qualification": "register",
  "state.trade-name": "register",
  "state.llc-publication": "register",
  "state.entity-tax": "register",
  "state.sales-tax": "register",
  "state.paid-sick-leave": "employ",
  "state.labor-posters": "employ",
  "fed.labor-posters": "employ",
  "state.professional-license": "license",
  "state.business-license": "license",
  "fed.ttb-alcohol": "license",
};

/** Order within a phase; lower first. */
const RANK: Record<string, number> = {
  "state.registered-agent": 1,
  "state.professional-entity": 2,
  "state.foreign-qualification": 1,
  "state.trade-name": 2,
  "state.llc-publication": 3,
  "state.employer": 4,
  "state.sales-tax": 5,
  "state.entity-tax": 6,
  "state.business-license": 1,
  "state.professional-license": 2,
  "local.business-license": 3,
};

const baseRule = (item: ComplianceItem) => item.ruleId;

function phaseOf(item: ComplianceItem): LaunchPhaseId {
  // The sales tax permit comes first; the returns that follow are recurring.
  if (item.ruleId === "state.sales-tax" && item.category === "payment") return "operate";
  const fixed = PHASE_OF[baseRule(item)];
  if (fixed) return fixed;
  const rule = baseRule(item);
  if (rule === "fed.payroll-deposits" && item.title.startsWith("Complete Form I-9")) return "employ";
  if (rule === "state.employer") {
    if (item.category === "registration") return "register";
    if (item.frequency === "per_event" || item.category === "insurance") return "employ";
    return "operate";
  }
  if (item.frequency === "once" || item.frequency === "per_event") {
    if (item.category === "license" || item.category === "permit") return "license";
    return "register";
  }
  if (item.category === "license" || item.category === "permit") return "license";
  if (item.category === "recordkeeping" || item.category === "insurance") return "employ";
  return "operate";
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Builds an ordered plan for opening a new business: phases with dependencies, planned dates and the
 * recurring obligations that start once the business operates.
 *
 * The profile describes the business as it will be; `isFormed` and `formationDate` are set by the plan.
 */
export function planLaunch(input: BusinessProfile, options: LaunchOptions = {}): LaunchPlan {
  const startDate = options.startDate ?? today();
  const allowance = { ...DEFAULT_ALLOWANCE, ...options.allowanceDays };

  // Window per phase, scheduled back to back.
  const windows = new Map<LaunchPhaseId, { start: string; end?: string }>();
  let cursor = startDate;
  for (const id of ["prepare", "form", "identify", "register", "license", "employ"] as const) {
    const end = addDays(cursor, allowance[id]);
    windows.set(id, { start: cursor, end });
    cursor = end;
  }
  const readyDate = cursor;
  windows.set("operate", { start: readyDate });
  const formationDate = windows.get("form")!.start;

  const evalOptions: EvaluateOptions = {
    rules: options.rules,
    changes: options.changes,
    recentDays: options.recentDays,
  };
  const unformed = evaluate(
    { ...input, isFormed: false, formationDate },
    { ...evalOptions, asOf: formationDate },
  );
  const formed = evaluate(
    { ...input, isFormed: true, formationDate },
    { ...evalOptions, asOf: formationDate },
  );
  const seen = new Set(unformed.items.map((i) => i.id));
  const items = [...unformed.items, ...formed.items.filter((i) => !seen.has(i.id))];

  const byPhase = new Map<LaunchPhaseId, ComplianceItem[]>();
  for (const item of items) {
    const phase = phaseOf(item);
    byPhase.set(phase, [...(byPhase.get(phase) ?? []), item]);
  }
  const rank = (i: ComplianceItem) => RANK[i.ruleId] ?? 50;
  const idsOf = (phase: LaunchPhaseId) => (byPhase.get(phase) ?? []).map((i) => i.id);
  const ein = unformed.items.find((i) => i.ruleId === "fed.ein")?.id;
  const dependsOn = (phase: LaunchPhaseId): string[] => {
    switch (phase) {
      case "form":
        return idsOf("prepare");
      case "identify":
        return idsOf("form");
      case "register":
      case "license":
      case "employ":
        return ein ? [ein] : idsOf("form");
      default:
        return [];
    }
  };

  let order = 0;
  const phases: LaunchPhase[] = [];
  for (const meta of PHASES) {
    const group = (byPhase.get(meta.id) ?? []).slice().sort((a, b) => {
      if (meta.id === "operate")
        return (a.nextDue ?? "9999").localeCompare(b.nextDue ?? "9999") || a.id.localeCompare(b.id);
      return rank(a) - rank(b) || a.id.localeCompare(b.id);
    });
    if (!group.length) continue;
    const w = windows.get(meta.id)!;
    const steps = group.map((item): LaunchStep => {
      const operate = meta.id === "operate";
      const step: LaunchStep = {
        order: ++order,
        phase: meta.id,
        item,
        dependsOn: dependsOn(meta.id).filter((id) => id !== item.id),
        start: w.start,
        ...(operate ? (item.nextDue ? { target: item.nextDue } : {}) : { target: w.end }),
      };
      if (!operate && item.nextDue && item.nextDue <= (w.end as string)) step.legalDeadline = item.nextDue;
      return step;
    });
    phases.push({
      id: meta.id,
      title: meta.title,
      description: meta.description,
      start: w.start,
      end: w.end,
      steps,
    });
  }

  const steps = phases.flatMap((p) => p.steps);
  const plan: LaunchPlan = {
    startDate,
    formationDate,
    readyDate,
    phases,
    steps,
    costs: estimateCosts(items, { profile: formed.profile, ownerCount: formed.profile.ownerCount }),
    result: formed,
  };
  if (options.openingDate) {
    plan.openingDate = options.openingDate;
    plan.slackDays = daysBetween(readyDate, options.openingDate);
    plan.onTrack = plan.slackDays >= 0;
  }
  return plan;
}
