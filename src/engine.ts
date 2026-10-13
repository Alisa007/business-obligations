import type {
  BusinessProfile,
  ComplianceItem,
  ItemDraft,
  Presence,
  ResolvedProfile,
  Rule,
  Country,
} from "./types";
import { stateFromZip } from "./zip";
import { isState } from "./states";
import { federalRules } from "./rules/federal";
import { extraStateRules, stateRules } from "./rules/state";
import { localRules } from "./rules/local";
import { industryRules } from "./rules/industry";
import { nextDueDate } from "./dates";

/** Rule packs by country. Add a country by registering its pack here. */
export const RULE_PACKS: Record<Country, Rule[]> = {
  US: [...federalRules, ...stateRules, ...extraStateRules, ...industryRules, ...localRules],
};

/** The built-in US rules. */
export const defaultRules: Rule[] = RULE_PACKS.US;

export const DATA_VERSION = "2026-10-13";

export const DISCLAIMER =
  "General compliance information, not legal or tax advice. Rule data is maintained by hand and may be incomplete or out of date; confirm requirements with the cited authority before relying on them.";

export class InvalidProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidProfileError";
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveProfile(input: BusinessProfile): ResolvedProfile {
  const country = input.country ?? "US";
  if (!(country in RULE_PACKS)) throw new InvalidProfileError(`Unsupported country "${country}"`);

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
  if (!isState(formationState))
    throw new InvalidProfileError(`Unknown formation state "${input.formationState}"`);
  if (!input.city?.trim()) throw new InvalidProfileError("`city` is required");
  if (!input.county?.trim()) throw new InvalidProfileError("`county` is required");
  if (input.industry === "alcohol" && !input.alcoholActivity)
    throw new InvalidProfileError('`alcoholActivity` is required when industry is "alcohol"');
  if (input.industry === "cannabis" && !input.cannabisActivity)
    throw new InvalidProfileError('`cannabisActivity` is required when industry is "cannabis"');
  if (input.industry === "transportation" && !input.commercialVehicles)
    throw new InvalidProfileError('`commercialVehicles` is required when industry is "transportation"');
  const needsProfession =
    input.entityType === "pllc" ||
    input.entityType === "pc" ||
    input.entityType === "llp" ||
    input.industry === "professional_services";
  if (needsProfession && !input.profession)
    throw new InvalidProfileError(
      '`profession` is required for pllc, pc, llp and the "professional_services" industry (use "other" if unlisted)',
    );
  if (input.formationDate !== undefined && !ISO_DATE.test(input.formationDate))
    throw new InvalidProfileError("`formationDate` must be YYYY-MM-DD");
  const fye = input.fiscalYearEndMonth ?? 12;
  if (!Number.isInteger(fye) || fye < 1 || fye > 12)
    throw new InvalidProfileError("`fiscalYearEndMonth` must be an integer 1–12");
  const nonNeg = (name: string, v: number | undefined) => {
    if (v !== undefined && !(v >= 0))
      throw new InvalidProfileError(`\`${name}\` must be a non-negative number`);
  };
  nonNeg("employeeCount", input.employeeCount);
  nonNeg("fullTimeEmployeeCount", input.fullTimeEmployeeCount);
  if ((input.fullTimeEmployeeCount ?? 0) > (input.employeeCount ?? 0))
    throw new InvalidProfileError("`fullTimeEmployeeCount` cannot exceed `employeeCount`");
  nonNeg("annualPayroll", input.annualPayroll);
  nonNeg("annualRevenue", input.annualRevenue);
  nonNeg("annualNetIncome", input.annualNetIncome);
  nonNeg("largestContractorPaymentUsd", input.largestContractorPaymentUsd);

  const employeeCount = input.employeeCount ?? 0;
  const presence: Presence[] = [{ state, home: true, employeeCount, hasProperty: true }];
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
      presence.push({
        state: code,
        home: false,
        employeeCount: m.employeeCount ?? 0,
        hasProperty: m.hasProperty ?? false,
        salesUsd: m.salesUsd ?? 0,
      });
    }
  }

  let taxTreatment: ResolvedProfile["taxTreatment"];
  switch (input.entityType) {
    case "sole_proprietorship":
      taxTreatment = "sole_prop";
      break;
    case "partnership":
    case "lp":
    case "llp":
      taxTreatment = "partnership";
      break;
    case "c_corp":
      taxTreatment = "c_corp";
      break;
    case "s_corp":
      taxTreatment = "s_corp";
      break;
    case "pc":
    case "benefit_corp":
      taxTreatment = input.sCorpElection ? "s_corp" : "c_corp";
      break;
    case "nonprofit":
      taxTreatment = "nonprofit";
      break;
    case "llc":
    case "pllc":
      switch (input.llcTaxClassification ?? "disregarded") {
        case "disregarded":
          taxTreatment = "sole_prop";
          break;
        case "partnership":
          taxTreatment = "partnership";
          break;
        case "s_corp":
          taxTreatment = "s_corp";
          break;
        case "c_corp":
          taxTreatment = "c_corp";
          break;
      }
      break;
  }

  return {
    ...input,
    country,
    fiscalYearEndMonth: fye,
    state,
    formationState,
    isFormed: input.isFormed ?? true,
    industry: input.industry ?? "general",
    employeeCount,
    fullTimeEmployeeCount: input.fullTimeEmployeeCount ?? employeeCount,
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
  /** Replace the country's built-in rules (e.g. `[...defaultRules, myRule]`). */
  rules?: Rule[];
  /** Evaluation date (YYYY-MM-DD) for computing `nextDue`. Defaults to today (UTC). */
  asOf?: string;
}

export interface ComplianceResult {
  items: ComplianceItem[];
  profile: ResolvedProfile;
  asOf: string;
  /** Date the bundled rule data was last reviewed. */
  dataVersion: string;
  disclaimer: string;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Evaluates a profile and returns items together with the resolved profile and disclaimer. */
export function evaluate(input: BusinessProfile, options: EvaluateOptions = {}): ComplianceResult {
  const profile = resolveProfile(input);
  const asOf = options.asOf ?? today();
  if (!ISO_DATE.test(asOf)) throw new InvalidProfileError("`asOf` must be YYYY-MM-DD");
  const rules = options.rules ?? RULE_PACKS[profile.country];
  const items: ComplianceItem[] = [];
  const seen = new Map<string, number>();
  for (const rule of rules) {
    if (!rule.when(profile)) continue;
    const built = rule.items(profile);
    const drafts: ItemDraft[] = Array.isArray(built) ? built : [built];
    for (const { key, ...d } of drafts) {
      let id = [rule.id, d.state, key].filter(Boolean).join(":");
      const n = seen.get(id) ?? 0;
      seen.set(id, n + 1);
      if (n > 0) id = `${id}#${n}`;
      const item: ComplianceItem = { ...d, id };
      if (d.due) {
        const next = nextDueDate(d.due, {
          asOf,
          formationDate: profile.formationDate,
          biennial: d.frequency === "biennial",
        });
        if (next) item.nextDue = next;
      }
      items.push(item);
    }
  }
  return { items, profile, asOf, dataVersion: DATA_VERSION, disclaimer: DISCLAIMER };
}

/** Returns the compliance items that apply to the given business profile. */
export function getComplianceItems(input: BusinessProfile, options: EvaluateOptions = {}): ComplianceItem[] {
  return evaluate(input, options).items;
}

/** Describes the rules for a country: ids, what they cover and which inputs they read. */
export function listRules(country: Country = "US"): Array<Pick<Rule, "id" | "description" | "inputs">> {
  return RULE_PACKS[country].map(({ id, description, inputs }) => ({ id, description, inputs }));
}
