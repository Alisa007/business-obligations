import { allHold, anyHold, validateApplicability } from "./applicability";
import type { ComplianceItem, ResolvedProfile } from "./types";

export interface CostOptions {
  /** Which filing channel's amount to use where fees differ. Defaults to "standard". */
  channel?: "standard" | "online" | "paper";
  /** Members/partners for per-member and per-partner fees. Defaults to 1. */
  ownerCount?: number;
  /**
   * The resolved profile (`result.profile`). Enables percentage-based fees such as unemployment insurance:
   * the rate is applied to each employee's average wages up to the wage base, using the state's headcount.
   */
  profile?: ResolvedProfile;
}

export interface CostLine {
  id: string;
  title: string;
  frequency: ComplianceItem["frequency"];
  /** Amount of one occurrence. */
  amount: number;
  /** Amount per year (0 for one-time items). */
  perYear: number;
  /** The amount rests on an unconfirmed estimate. */
  estimate: boolean;
}

export interface CostEstimate {
  currency: "USD";
  /** Recurring government fees and taxes per year, for items with a known amount. */
  annual: number;
  /** One-time fees, for items with a known amount. */
  oneTime: number;
  lines: CostLine[];
  /** Items with a cost whose amount cannot be computed (percentage-based, schedule-based, no fixed period). */
  unknown: Array<{ id: string; title: string; reason: string }>;
}

const clamp = (n: number, min?: number, max?: number) =>
  Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? 0, n));

/** Amount of one occurrence of an item's cost, or undefined when it cannot be computed. */
export function itemAmount(
  cost: NonNullable<ComplianceItem["cost"]>,
  options: CostOptions = {},
  state?: string,
): number | undefined {
  if (cost.basis === "tiered") {
    const tier =
      options.profile &&
      cost.tiers?.find((t) => {
        for (const condition of [...(t.when ?? []), ...(t.whenAny ?? [])]) {
          const issue = validateApplicability(condition);
          if (issue) throw new Error(`Invalid fee tier condition: ${issue}`);
        }
        return allHold(t.when, options.profile!) && anyHold(t.whenAny, options.profile!);
      });
    return tier
      ? itemAmount(tier as unknown as NonNullable<ComplianceItem["cost"]>, options, state)
      : undefined;
  }
  const units = options.ownerCount ?? 1;
  if (cost.waived || cost.basis === "none") return 0;
  switch (cost.basis) {
    case "flat": {
      const channel = options.channel ?? "standard";
      const v =
        channel === "online"
          ? (cost.online ?? cost.amount)
          : channel === "paper"
            ? (cost.paper ?? cost.amount)
            : cost.amount;
      return v;
    }
    case "per_partner": {
      if (cost.perUnit === undefined) return undefined;
      const raw =
        cost.amount !== undefined
          ? cost.amount + cost.perUnit * Math.max(0, units - 1)
          : cost.perUnit * units;
      return clamp(raw, cost.min, cost.max);
    }
    case "per_member": {
      if (cost.perUnit === undefined || cost.amount === undefined) return undefined;
      return clamp(
        cost.amount + cost.perUnit * Math.max(0, units - (cost.freeUnits ?? 0)),
        cost.min,
        cost.max,
      );
    }
    case "percent": {
      const p = options.profile;
      if (cost.rate === undefined || cost.base === undefined || !p || !state) return undefined;
      const employees = p.presence.find((x) => x.state === state)?.employeeCount ?? 0;
      if (employees === 0) return 0;
      // Average wage per employee; payroll is only known for the home location.
      const avg = p.employeeCount > 0 ? p.annualPayroll / p.employeeCount : 0;
      if (avg === 0) return undefined;
      return Math.round(employees * Math.min(avg, cost.base) * cost.rate) / 100;
    }
    default:
      return undefined;
  }
}

const PER_YEAR: Partial<Record<ComplianceItem["frequency"], number>> = {
  annual: 1,
  biennial: 0.5,
  every_three_years: 1 / 3,
  every_five_years: 0.2,
  semiannual: 2,
  quarterly: 4,
  monthly: 12,
  once: 0,
};

/** Totals the structured fees on a result's items. Only items that carry a `cost` are included. */
export function estimateCosts(items: ComplianceItem[], options: CostOptions = {}): CostEstimate {
  const lines: CostLine[] = [];
  const unknown: CostEstimate["unknown"] = [];
  let annual = 0;
  let oneTime = 0;
  for (const item of items) {
    if (!item.cost) continue;
    const amount = itemAmount(item.cost, options, item.state);
    if (amount === undefined) {
      unknown.push({
        id: item.id,
        title: item.title,
        reason:
          item.cost.basis === "percent"
            ? "Percentage-based; pass `profile` with annualPayroll and employeeCount to estimate"
            : item.cost.basis === "tiered"
              ? "No fee tier matched the supplied profile"
              : `Fee basis is ${item.cost.basis}`,
      });
      continue;
    }
    // Rate-based amounts are computed for a whole year already.
    const perYear = item.cost.basis === "percent" ? 1 : PER_YEAR[item.frequency];
    if (perYear === undefined) {
      unknown.push({ id: item.id, title: item.title, reason: `No fixed period (${item.frequency})` });
      continue;
    }
    if (item.frequency === "once" && item.cost.basis !== "percent") oneTime += amount;
    else annual += amount * perYear;
    lines.push({
      id: item.id,
      title: item.title,
      frequency: item.frequency,
      amount,
      perYear: amount * perYear,
      estimate: !!item.cost.estimate,
    });
  }
  return { currency: "USD", annual: Math.round(annual * 100) / 100, oneTime, lines, unknown };
}
