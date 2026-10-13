import type {
  BusinessProfile, ComplianceItem, ItemDraft, ResolvedProfile, Rule,
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
  const otherStates = (input.otherStates ?? []).map((s) => s.toUpperCase());
  for (const s of otherStates) if (!isState(s)) throw new InvalidProfileError(`Unknown state "${s}"`);

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
    otherStates: otherStates.filter((s) => s !== state),
    isFormed: input.isFormed ?? true,
    industry: input.industry ?? "general",
    hasEmployees: input.hasEmployees ?? false,
    paysContractors: input.paysContractors ?? false,
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
