import { evaluate, listRules, type EvaluateOptions } from "./engine";
import type { BusinessProfile, ResolvedProfile, Rule } from "./types";

type Field = keyof BusinessProfile;

export interface DefaultedInput {
  field: Field;
  /** The value the engine used because the input was omitted. */
  value: unknown;
  /** Ids of rules that read this input. */
  rules: string[];
  /** Whether supplying a different value changes which items are returned. */
  affectsResult: boolean;
}

export interface Sensitivity {
  field: Field;
  /** The value that was used (provided or defaulted). */
  current: unknown;
  /** Alternative values that change the set of returned items, with the item ids added and removed. */
  changes: Array<{ value: unknown; added: string[]; removed: string[] }>;
}

export interface InputAnalysis {
  defaultsUsed: DefaultedInput[];
  sensitivity: Sensitivity[];
}

/** Optional inputs the engine defaults when omitted; excludes inputs whose absence is itself meaningful. */
const DEFAULTABLE: Field[] = [
  "ownerCount",
  "employeeCount",
  "fullTimeEmployeeCount",
  "annualPayroll",
  "annualRevenue",
  "annualNetIncome",
  "largestContractorPaymentUsd",
  "sellsTaxableGoods",
  "homeBased",
  "usesTradeName",
  "hasTaxExemptStatus",
  "isFormed",
  "fiscalYearEndMonth",
  "formationDate",
  "priorYearPayrollTaxLiability",
  "sCorpElection",
  "llcTaxClassification",
];

const BOOLEANS = new Set<Field>([
  "sellsTaxableGoods",
  "homeBased",
  "usesTradeName",
  "hasTaxExemptStatus",
  "isFormed",
  "sCorpElection",
]);

/** Candidate values tried for numeric inputs. Thresholds in the rules are crossed by one of these. */
const LADDER: Partial<Record<Field, number[]>> = {
  ownerCount: [1, 2, 3, 10],
  employeeCount: [0, 1, 2, 3, 4, 5, 10, 15, 20, 50, 100, 500],
  fullTimeEmployeeCount: [0, 1, 2, 5, 10, 50],
  annualPayroll: [0, 1000, 10000, 100000, 1000000],
  annualRevenue: [0, 1000, 25000, 100000, 500000, 1000000, 5000000],
  annualNetIncome: [0, 1000, 25000, 100000, 500000],
  largestContractorPaymentUsd: [0, 599, 600, 5000],
  priorYearPayrollTaxLiability: [0, 1000, 50000, 50001, 100000],
  fiscalYearEndMonth: [1, 3, 6, 9, 12],
};

const ids = (profile: BusinessProfile, options: EvaluateOptions) =>
  new Set(evaluate(profile, options).items.map((i) => i.id));

const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));

const rulesReading = (field: Field, rules: Pick<Rule, "id" | "inputs">[]) =>
  rules.filter((r) => (r.inputs as string[]).includes(field)).map((r) => r.id);

/**
 * Explains how firm a result is: which inputs were defaulted, and which values of each input would change
 * the returned items. Use it to decide what to ask the user next.
 *
 * `sensitivity` covers every defaultable input (boolean toggles and a ladder of numeric values); only values
 * that change the item set are reported.
 */
export function analyzeInputs(input: BusinessProfile, options: EvaluateOptions = {}): InputAnalysis {
  const base = evaluate(input, options);
  const baseIds = new Set(base.items.map((i) => i.id));
  const resolved = base.profile as ResolvedProfile;
  const rules = options.rules ?? listRules(resolved.country);
  const defaultsUsed: DefaultedInput[] = [];
  const sensitivity: Sensitivity[] = [];

  for (const field of DEFAULTABLE) {
    const provided = input[field] !== undefined;
    const candidates: unknown[] = BOOLEANS.has(field)
      ? [true, false]
      : field === "llcTaxClassification"
        ? ["disregarded", "partnership", "s_corp", "c_corp"]
        : (LADDER[field] ?? []);
    const current = (resolved as unknown as Record<string, unknown>)[field];
    const changes: Sensitivity["changes"] = [];
    for (const value of candidates) {
      if (value === current) continue;
      let next: Set<string>;
      try {
        next = ids({ ...input, [field]: value } as BusinessProfile, options);
      } catch {
        continue; // value not valid in combination with the rest of the profile
      }
      if (same(baseIds, next)) continue;
      changes.push({
        value,
        added: [...next].filter((x) => !baseIds.has(x)).sort(),
        removed: [...baseIds].filter((x) => !next.has(x)).sort(),
      });
    }
    if (!provided) {
      defaultsUsed.push({
        field,
        value: current,
        rules: rulesReading(field, rules),
        affectsResult: changes.length > 0,
      });
    }
    if (changes.length) sensitivity.push({ field, current, changes });
  }
  return { defaultsUsed, sensitivity };
}
