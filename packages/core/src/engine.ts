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
import { dissolutionRules } from "./rules/dissolution";
import { addDays, isIsoDate, todayIso } from "./iso";
import { validateProfile, type ProfileIssue } from "./validate";
import { localRules, premisesRules } from "./rules/local";
import { industryFromNaics } from "./naics";
import { industryRules } from "./rules/industry";
import { nextDueDate } from "./dates";
import { dueToRRule, parseRRule } from "./rrule";
import { describeProvenance, provenanceFor } from "./provenance";
import { jurisdictionId, placeFacts, STATE_FIPS } from "./jurisdiction";
import {
  BUNDLED_CHANGES,
  RULESET_VERSION,
  changeMatchesItem,
  toNotice,
  withContext,
  type ChangeNotice,
  type RuleChange,
} from "./changes";

/** Rule packs by country. Add a country by registering its pack here. */
export const RULE_PACKS: Record<Country, Rule[]> = {
  // `.flat()` rather than spreads: bundlers can drop an unused call marked pure, but not an array spread.
  US: /* @__PURE__ */ [
    federalRules,
    stateRules,
    extraStateRules,
    industryRules,
    localRules,
    premisesRules,
    dissolutionRules,
  ].flat(),
};

/** The built-in US rules. */
export const defaultRules: Rule[] = /* @__PURE__ */ (() => RULE_PACKS.US)();

export const DATA_VERSION = "2026-10-13";

export const DISCLAIMER =
  "General compliance information, not legal, tax or accounting advice, and no attorney-client relationship is created. Requirements depend on facts this library cannot see and change often; data is compiled from public sources and may be incomplete or out of date (see each item's provenance and the result's dataVersion). Confirm requirements with the cited authority or a qualified professional before relying on them.";

export class InvalidProfileError extends Error {
  /** Every problem found, when the error comes from shape validation. */
  readonly issues: ProfileIssue[];
  constructor(message: string, issues: ProfileIssue[] = []) {
    super(message);
    this.name = "InvalidProfileError";
    this.issues = issues;
  }
}

export function resolveProfile(input: BusinessProfile): ResolvedProfile {
  const issues = validateProfile(input);
  if (issues.length)
    throw new InvalidProfileError(
      issues
        .map(
          (i) =>
            i.message +
            (i.suggestion && !i.message.includes("did you mean")
              ? ` (try ${JSON.stringify(i.suggestion)})`
              : ""),
        )
        .join("; "),
      issues,
    );
  const country = input.country ?? "US";
  if (!(country in RULE_PACKS)) throw new InvalidProfileError(`Unsupported country "${country}"`);

  const zipState = input.zip ? stateFromZip(input.zip) : undefined;
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
  // An explicit `industry` wins; otherwise the NAICS code decides, and may also say the activity or profession.
  const fromNaics = input.industry ? undefined : industryFromNaics(input.naics);
  const industry = input.industry ?? fromNaics?.industry ?? "general";
  const alcoholActivity = input.alcoholActivity ?? fromNaics?.alcoholActivity;
  const profession = input.profession ?? fromNaics?.profession;
  if (industry === "alcohol" && !alcoholActivity)
    throw new InvalidProfileError('`alcoholActivity` is required when industry is "alcohol"');
  if (industry === "cannabis" && !input.cannabisActivity)
    throw new InvalidProfileError('`cannabisActivity` is required when industry is "cannabis"');
  if (industry === "transportation" && !input.commercialVehicles)
    throw new InvalidProfileError('`commercialVehicles` is required when industry is "transportation"');
  const needsProfession =
    input.entityType === "pllc" ||
    input.entityType === "pc" ||
    input.entityType === "llp" ||
    industry === "professional_services";
  if (needsProfession && !profession)
    throw new InvalidProfileError(
      '`profession` is required for pllc, pc, llp and the "professional_services" industry (use "other" if unlisted)',
    );
  if (input.dissolutionDate !== undefined && !isIsoDate(input.dissolutionDate))
    throw new InvalidProfileError("`dissolutionDate` must be YYYY-MM-DD");
  if (input.formationDate !== undefined && !isIsoDate(input.formationDate))
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
  if (input.ownerCount !== undefined && !(Number.isInteger(input.ownerCount) && input.ownerCount >= 1))
    throw new InvalidProfileError("`ownerCount` must be an integer of at least 1");
  // Only compared when both are given: with no head count, the full-time ones are the employees that are known.
  if (
    input.fullTimeEmployeeCount !== undefined &&
    input.employeeCount !== undefined &&
    input.fullTimeEmployeeCount > input.employeeCount
  )
    throw new InvalidProfileError("`fullTimeEmployeeCount` cannot exceed `employeeCount`");
  nonNeg("annualPayroll", input.annualPayroll);
  nonNeg("businessPropertyValueUsd", input.businessPropertyValueUsd);
  nonNeg("quarterlyPayrollUsd", input.quarterlyPayrollUsd);
  nonNeg("businessAgeYears", input.businessAgeYears);
  nonNeg("annualRevenue", input.annualRevenue);
  nonNeg("annualNetIncome", input.annualNetIncome);
  nonNeg("largestContractorPaymentUsd", input.largestContractorPaymentUsd);
  if (input.naics !== undefined && !/^\d{2,6}$/.test(input.naics))
    throw new InvalidProfileError("`naics` must be a 2 to 6 digit NAICS code");
  nonNeg("projectValueUsd", input.projectValueUsd);
  nonNeg("disturbedAcres", input.disturbedAcres);
  nonNeg("floorAreaSqFt", input.floorAreaSqFt);

  const employeeCount = input.employeeCount ?? input.fullTimeEmployeeCount ?? 0;
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
    industry,
    alcoholActivity,
    profession,
    employeeCount,
    fullTimeEmployeeCount: input.fullTimeEmployeeCount ?? employeeCount,
    hasEmployees: employeeCount > 0,
    ownerCount: input.ownerCount ?? 1,
    annualPayroll: input.annualPayroll ?? 0,
    businessPropertyValueUsd: input.businessPropertyValueUsd ?? 0,
    quarterlyPayrollUsd: input.quarterlyPayrollUsd ?? 0,
    businessAgeYears: input.businessAgeYears ?? 0,
    hasAutomatedPayrollSystem: input.hasAutomatedPayrollSystem ?? false,
    hasQualifiedRetirementPlan: input.hasQualifiedRetirementPlan ?? false,
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
  /**
   * Evaluation date (YYYY-MM-DD). Rules and data are resolved as of this date: enacted changes that have
   * taken effect by then are applied, and `nextDue` is computed from it. Defaults to today (local date).
   */
  asOf?: string;
  /** Additional rule changes (for example your own, or ones not yet bundled), appended to the bundled ones. */
  changes?: RuleChange[];
  /** How far back `recentChanges` looks, in days. Defaults to 365. */
  recentDays?: number;
}

export interface ComplianceResult {
  items: ComplianceItem[];
  profile: ResolvedProfile;
  asOf: string;
  /** Date the bundled rule data was last reviewed. */
  dataVersion: string;
  /** Version of the bundled rules and data (`YYYY-MM-DD.n`); changes whenever any rule or data changes. */
  rulesetVersion: string;
  /** Relevant changes that take effect after `asOf`, soonest first. Prepare for these. */
  upcomingChanges: ChangeNotice[];
  /** Relevant changes that took effect within `recentDays` before `asOf`, most recent first. */
  recentChanges: ChangeNotice[];
  disclaimer: string;
}

/** Renewal cycle in words, for licence-like items that recur on a fixed period. */
const RENEWAL_INTERVAL: Partial<Record<ComplianceItem["frequency"], string>> = {
  annual: "year",
  biennial: "two years",
  every_five_years: "five years",
};
const FEEDBACK_URL =
  "https://github.com/Alisa007/business-obligations/issues/new?template=data-correction.yml&title=";

type DraftBody = ItemDraft extends infer T ? (T extends unknown ? Omit<T, "key"> : never) : never;

const RECURRING = new Set<string>([
  "annual",
  "biennial",
  "every_five_years",
  "semiannual",
  "quarterly",
  "monthly",
]);

/** A draft without its `key`, with its recurrence rule, if any, resolved to the item's `frequency` and `due`. */
function settle(draft: DraftBody): Omit<ComplianceItem, "id" | "ruleId" | "nextDue" | "recurrence"> {
  if (!("rrule" in draft)) {
    if (RECURRING.has(draft.frequency))
      throw new Error(
        `"${draft.title}" recurs (${draft.frequency}); give it an rrule instead of a frequency`,
      );
    return draft;
  }
  const { rrule, anchor, ...rest } = draft;
  const { frequency, due } = parseRRule(rrule, anchor);
  return { ...rest, frequency, ...(due ? { due } : {}) };
}

/** Evaluates a profile and returns items together with the resolved profile and disclaimer. */
export function evaluate(input: BusinessProfile, options: EvaluateOptions = {}): ComplianceResult {
  const profile = resolveProfile(input);
  const asOf = options.asOf ?? todayIso();
  if (!isIsoDate(asOf)) throw new InvalidProfileError("`asOf` must be YYYY-MM-DD");
  const rules = options.rules ?? RULE_PACKS[profile.country];
  const changes = [...BUNDLED_CHANGES, ...(options.changes ?? [])];
  return withContext(asOf, changes, () => {
    const items: ComplianceItem[] = [];
    const seen = new Map<string, number>();
    for (const rule of rules) {
      if (!rule.when(profile)) continue;
      const built = rule.items(profile);
      const drafts: ItemDraft[] = Array.isArray(built) ? built : [built];
      for (const { key, ...draft } of drafts) {
        const d = settle(draft as DraftBody);
        let id = [rule.id, d.state, key].filter(Boolean).join(":");
        const n = seen.get(id) ?? 0;
        seen.set(id, n + 1);
        if (n > 0) id = `${id}#${n}`;
        const item: ComplianceItem = { ...d, id, ruleId: rule.id };
        if (d.due) {
          const next = nextDueDate(d.due, {
            asOf,
            formationDate: profile.formationDate,
            biennial: d.frequency === "biennial",
            intervalYears: d.frequency === "every_five_years" ? 5 : undefined,
          });
          if (next) item.nextDue = next;
          const recurrence = dueToRRule(d.due, d.frequency);
          if (recurrence) item.recurrence = recurrence;
        }
        item.provenance = describeProvenance(
          item.provenance ?? provenanceFor(item, profile),
          asOf,
          DATA_VERSION,
        );
        item.jurisdictionId = jurisdictionId(item, profile);
        if (item.state && STATE_FIPS[item.state]) item.stateFips = STATE_FIPS[item.state];
        const interval = RENEWAL_INTERVAL[item.frequency];
        if (!item.renewal && interval && ["license", "permit", "registration"].includes(item.category))
          item.renewal = `Renew every ${interval}${item.deadline ? `; due ${item.deadline}` : ""}`;
        const facts = placeFacts(item, profile);
        if (facts) {
          item.fips = facts.fips;
          if (item.jurisdiction === "city" && facts.incorporated !== undefined)
            item.incorporated = facts.incorporated;
        }
        item.feedbackUrl = `${FEEDBACK_URL}${encodeURIComponent(`Data correction: ${item.id}`)}`;
        const upcoming = changes
          .filter((c) => c.effective > asOf && changeMatchesItem(c, item))
          .sort((a, b) => a.effective.localeCompare(b.effective))
          .map(toNotice);
        if (upcoming.length) item.upcomingChanges = upcoming;
        items.push(item);
      }
    }
    // An item that supersedes another marks it as preempted, so consumers can hide or explain the loser.
    const byId = new Map(items.map((it) => [it.id, it]));
    for (const it of items) {
      for (const target of it.supersedes ?? []) {
        // A target is an item id, or a rule id that stands for every item that rule produced.
        const hit = byId.get(target);
        const hits = hit ? [hit] : items.filter((x) => x.ruleId === target);
        for (const other of hits) if (other !== it && !other.preemptedBy) other.preemptedBy = it.id;
      }
    }
    const states = new Set([profile.formationState, ...profile.presence.map((x) => x.state)]);
    // A change concerns the business when it is tied to the change's state and, if the change names rules, when one
    // of the business's items comes from them. A repeal is the exception: the repealed obligation no longer
    // produces an item, so the state tie has to be enough.
    const relevant = (c: RuleChange) =>
      (!c.scope.state || states.has(c.scope.state)) &&
      (!c.scope.rules ||
        (c.kind === "repeal" && !!c.scope.state) ||
        items.some((it) => changeMatchesItem(c, it)));
    const since = addDays(asOf, -(options.recentDays ?? 365));
    const upcomingChanges = changes
      .filter((c) => c.effective > asOf && relevant(c))
      .sort((a, b) => a.effective.localeCompare(b.effective))
      .map(toNotice);
    const recentChanges = changes
      .filter((c) => c.effective <= asOf && c.effective >= since && relevant(c))
      .sort((a, b) => b.effective.localeCompare(a.effective))
      .map(toNotice);
    return {
      items,
      profile,
      asOf,
      dataVersion: DATA_VERSION,
      rulesetVersion: RULESET_VERSION,
      upcomingChanges,
      recentChanges,
      disclaimer: DISCLAIMER,
    };
  });
}

export interface ItemDiff {
  id: string;
  title: string;
  /** Changed fields with their values before and after. */
  fields: Record<string, { before: unknown; after: unknown }>;
}

export interface Preview {
  from: string;
  to: string;
  added: ComplianceItem[];
  removed: ComplianceItem[];
  changed: ItemDiff[];
  /** Changes that take effect after `from` and on or before `to`. */
  changes: ChangeNotice[];
}

const COMPARED: Array<keyof ComplianceItem> = [
  "title",
  "authority",
  "description",
  "frequency",
  "deadline",
  "due",
  "category",
  "jurisdiction",
];

/** Differences between two evaluations of the same profile, matched by item id. */
export function diffItems(
  before: ComplianceItem[],
  after: ComplianceItem[],
): Omit<Preview, "from" | "to" | "changes"> {
  const b = new Map(before.map((i) => [i.id, i]));
  const a = new Map(after.map((i) => [i.id, i]));
  const changed: ItemDiff[] = [];
  for (const [id, x] of a) {
    const y = b.get(id);
    if (!y) continue;
    const fields: ItemDiff["fields"] = {};
    for (const f of COMPARED) {
      if (JSON.stringify(y[f]) !== JSON.stringify(x[f])) fields[f] = { before: y[f], after: x[f] };
    }
    if (Object.keys(fields).length) changed.push({ id, title: x.title, fields });
  }
  return {
    added: after.filter((i) => !b.has(i.id)),
    removed: before.filter((i) => !a.has(i.id)),
    changed,
  };
}

/**
 * Shows how a business's obligations differ between two dates once enacted rule changes take effect, so
 * users can prepare. `from` defaults to today.
 */
export function previewChanges(
  input: BusinessProfile,
  options: { from?: string; to: string; rules?: Rule[]; changes?: RuleChange[] },
): Preview {
  const from = options.from ?? todayIso();
  const base = { rules: options.rules, changes: options.changes };
  const before = evaluate(input, { ...base, asOf: from });
  const after = evaluate(input, { ...base, asOf: options.to });
  const changes = [...before.upcomingChanges].filter((c) => c.effective <= options.to);
  return { from, to: options.to, ...diffItems(before.items, after.items), changes };
}

/** Returns the compliance items that apply to the given business profile. */
export function getComplianceItems(input: BusinessProfile, options: EvaluateOptions = {}): ComplianceItem[] {
  return evaluate(input, options).items;
}

/** Describes the rules for a country: ids, what they cover and which inputs they read. */
export function listRules(country: Country = "US"): Array<Pick<Rule, "id" | "description" | "inputs">> {
  return RULE_PACKS[country].map(({ id, description, inputs }) => ({ id, description, inputs }));
}
