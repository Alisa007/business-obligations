import type {
  BusinessProfile, ComplianceItem, ItemDraft, Presence, ResolvedProfile, Rule,
} from "./types.js";
import { stateFromZip } from "./zip.js";
import { isState } from "./states.js";
import { federalRules } from "./rules/federal.js";
import { stateRules } from "./rules/state.js";
import { localRules } from "./rules/local.js";
import { industryRules } from "./rules/industry.js";

export const defaultRules: Rule[] = [
  ...federalRules,
  ...stateRules,
  ...industryRules,
  ...localRules,
];

export class InvalidProfileError extends Error {}

export function resolveProfile(input: BusinessProfile): ResolvedProfile {
  const zipState = stateFromZip(input.zip);
  const state = (input.state ?? zipState)?.toUpperCase();
  if (!state || !isState(state)) {
    throw new InvalidProfileError(
      input.state
        ? `Unknown state "${input.state}"`
        : `Cannot determine state from ZIP "${input.zip}"; pass \`state\` explicitly`,
    );
  }
  const formationState = (input.formationState ?? state).toUpperCase();
  if (!isState(formationState)) throw new InvalidProfileError(`Unknown formation state "${input.formationState}"`);
  if (!input.city?.trim()) throw new InvalidProfileError("`city` is required");
  if (!input.county?.trim()) throw new InvalidProfileError("`county` is required");
  if (input.industry === "alcohol" && !input.alcoholActivity)
    throw new InvalidProfileError("`alcoholActivity` is required when industry is \"alcohol\"");
  if (input.industry === "transportation" && !input.commercialVehicles)
    throw new InvalidProfileError("`commercialVehicles` is required when industry is \"transportation\"");
  const nonNeg = (name: string, v: number | undefined) => {
    if (v !== undefined && !(v >= 0)) throw new InvalidProfileError(`\`${name}\` must be a non-negative number`);
  };
  nonNeg("employeeCount", input.employeeCount);
  nonNeg("annualPayroll", input.annualPayroll);
  nonNeg("annualRevenue", input.annualRevenue);
  nonNeg("largestContractorPaymentUsd", input.largestContractorPaymentUsd);

  const employeeCount = input.employeeCount ?? 0;
  const presence: Presence[] = [
    { state, home: true, employeeCount, hasProperty: true },
  ];
  for (const m of input.multistate ?? []) {
    const code = m.state.toUpperCase();
    if (!isState(code)) throw new InvalidProfileError(`Unknown state "${m.state}"`);
    if (code === state) continue;
    const existing = presence.find((x) => x.state === code);
    if (existing) {
      existing.employeeCount += m.employeeCount ?? 0;
      existing.hasProperty ||= m.hasProperty ?? false;
      existing.salesUsd = (existing.salesUsd ?? 0) + (m.salesUsd ?? 0);
    } else {
      presence.push({ state: code, home: false, employeeCount: m.employeeCount ?? 0, hasProperty: m.hasProperty ?? false, salesUsd: m.salesUsd ?? 0 });
    }
  }

  let taxTreatment: ResolvedProfile["taxTreatment"];
  switch (input.entityType) {
    case "sole_proprietorship": taxTreatment = "sole_prop"; break;
    case "partnership": taxTreatment = "partnership"; break;
    case "c_corp": taxTreatment = "c_corp"; break;
    case "s_corp": taxTreatment = "s_corp"; break;
    case "nonprofit": taxTreatment = "nonprofit"; break;
    case "llc":
      switch (input.llcTaxClassification ?? "disregarded") {
        case "disregarded": taxTreatment = "sole_prop"; break;
        case "partnership": taxTreatment = "partnership"; break;
        case "s_corp": taxTreatment = "s_corp"; break;
        case "c_corp": taxTreatment = "c_corp"; break;
      }
      break;
  }

  return {
    ...input,
    state,
    formationState,
    isFormed: input.isFormed ?? true,
    industry: input.industry ?? "general",
    employeeCount,
    hasEmployees: employeeCount > 0,
    annualPayroll: input.annualPayroll ?? 0,
    largestContractorPaymentUsd: input.largestContractorPaymentUsd ?? 0,
    annualRevenue: input.annualRevenue ?? 0,
    annualNetIncome: input.annualNetIncome ?? 0,
    presence,
    sellsTaxableGoods: input.sellsTaxableGoods ?? false,
    homeBased: input.homeBased ?? false,
    usesTradeName: input.usesTradeName ?? false,
    hasTaxExemptStatus: input.hasTaxExemptStatus ?? false,
    taxTreatment,
  };
}

export interface EvaluateOptions {
  /** Replace the built-in rules (e.g. to append your own: `[...defaultRules, myRule]`). */
  rules?: Rule[];
}

/** Returns the compliance items that apply to the given business profile. */
export function getComplianceItems(
  input: BusinessProfile,
  options: EvaluateOptions = {},
): ComplianceItem[] {
  const profile = resolveProfile(input);
  const rules = options.rules ?? defaultRules;
  const out: ComplianceItem[] = [];
  for (const rule of rules) {
    if (!rule.when(profile)) continue;
    const built = rule.items(profile);
    const drafts: ItemDraft[] = Array.isArray(built) ? built : [built];
    drafts.forEach((d, i) => {
      out.push({ ...d, id: drafts.length > 1 ? `${rule.id}#${i}` : rule.id });
    });
  }
  return out;
}
