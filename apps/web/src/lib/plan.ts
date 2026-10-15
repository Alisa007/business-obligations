import {
  analyzeInputs,
  buildCalendar,
  estimateCosts,
  evaluate,
  planLaunch,
  toICS,
  type BusinessProfile,
  type ComplianceItem,
  type EntityType,
  type Industry,
} from "compliance-rules-engine";

export const ENTITY_TYPES: Array<[EntityType, string]> = [
  ["llc", "LLC"],
  ["sole_proprietorship", "Sole proprietorship"],
  ["s_corp", "S corporation"],
  ["c_corp", "C corporation"],
  ["partnership", "General partnership"],
  ["lp", "Limited partnership"],
  ["llp", "Limited liability partnership"],
  ["pllc", "Professional LLC"],
  ["pc", "Professional corporation"],
  ["benefit_corp", "Benefit corporation"],
  ["nonprofit", "Nonprofit"],
];

export const INDUSTRIES: Array<[string, string]> = [
  ["general", "General / other"],
  ["retail", "Retail"],
  ["restaurant", "Restaurant / food service"],
  ["construction", "Construction"],
  ["healthcare", "Healthcare"],
  ["real_estate", "Real estate"],
  ["professional_services", "Professional services"],
  ["childcare", "Childcare"],
];

export const PROFESSIONS: Array<[string, string]> = [
  ["attorney", "Attorney"],
  ["cpa", "CPA"],
  ["physician", "Physician"],
  ["architect", "Architect"],
  ["engineer", "Engineer"],
  ["other", "Other"],
];

/** Raw values of the profile form. Numbers are kept as the text the user typed. */
export interface FormValues {
  zip: string;
  entityType: string;
  industry: string;
  profession: string;
  employees: string;
  payroll: string;
  revenue: string;
  owners: string;
  sellsGoods: boolean;
  homeBased: boolean;
  tradeName: boolean;
  isNew: boolean;
  formationDate: string;
}

export interface Place {
  city: string;
  county: string;
  state: string;
}

const num = (v: string): number | undefined => {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

/** Whether the profession question applies to these answers. */
export const needsProfession = (f: Pick<FormValues, "entityType" | "industry">): boolean =>
  ["pllc", "pc", "llp"].includes(f.entityType) || f.industry === "professional_services";

/** Turns form values into a BusinessProfile; `place` is the result of a ZIP lookup. */
export function buildProfile(form: FormValues, place: Place): BusinessProfile {
  const profile: Record<string, unknown> = {
    entityType: form.entityType,
    zip: form.zip,
    city: place.city,
    county: place.county,
    state: place.state,
    industry: form.industry === "general" ? undefined : form.industry,
    profession: needsProfession(form) ? form.profession || "other" : undefined,
    employeeCount: num(form.employees),
    annualPayroll: num(form.payroll),
    annualRevenue: num(form.revenue),
    ownerCount: num(form.owners),
    sellsTaxableGoods: form.sellsGoods ? true : undefined,
    homeBased: form.homeBased ? true : undefined,
    usesTradeName: form.tradeName ? true : undefined,
    formationDate: form.isNew ? undefined : form.formationDate || undefined,
  };
  for (const [k, v] of Object.entries(profile)) if (v === undefined || v === "") delete profile[k];
  return profile as unknown as BusinessProfile;
}

export const today = (): string => new Date().toISOString().slice(0, 10);

function addYears(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

export interface AnalyzeOptions {
  asOf?: string;
  openingDate?: string;
  isNew?: boolean;
}

/** Runs every analysis the playground shows. Throws the library's errors for the UI to display. */
export function analyze(profile: BusinessProfile, options: AnalyzeOptions = {}) {
  const asOf = options.asOf || today();
  const result = evaluate({ ...profile, isFormed: !options.isNew }, { asOf });
  const plan = planLaunch(profile, { startDate: asOf, openingDate: options.openingDate || undefined });
  const calendar = buildCalendar(profile, { from: asOf, to: addYears(asOf, 1) });
  return {
    result,
    plan,
    events: calendar.events,
    ics: toICS(calendar.events, { calendarName: "Compliance deadlines" }),
    costs: estimateCosts(result.items, { profile: result.profile, ownerCount: result.profile.ownerCount }),
    analysis: analyzeInputs(profile, { asOf }),
  };
}

export type Analysis = ReturnType<typeof analyze>;

export const JURISDICTIONS: Array<[ComplianceItem["jurisdiction"], string]> = [
  ["federal", "Federal"],
  ["state", "State"],
  ["county", "County"],
  ["city", "City"],
];

export interface ObligationFilters {
  jurisdiction: string;
  category: string;
  query: string;
}

export const NO_FILTERS: ObligationFilters = { jurisdiction: "all", category: "all", query: "" };

type Filterable = Pick<
  ComplianceItem,
  "title" | "authority" | "description" | "reason" | "jurisdiction" | "category" | "nextDue"
>;

/**
 * Filters obligations and groups them by jurisdiction. Within a group, items with a known next due date come
 * first (soonest first), then the rest alphabetically.
 */
export function groupObligations<T extends Filterable>(
  items: T[],
  { jurisdiction = "all", category = "all", query = "" }: Partial<ObligationFilters> = {},
) {
  const q = query.trim().toLowerCase();
  const match = (i: T) =>
    (jurisdiction === "all" || i.jurisdiction === jurisdiction) &&
    (category === "all" || i.category === category) &&
    (!q || `${i.title} ${i.authority} ${i.description} ${i.reason}`.toLowerCase().includes(q));
  const byDue = (a: T, b: T) =>
    (a.nextDue ?? "9999-12-31").localeCompare(b.nextDue ?? "9999-12-31") || a.title.localeCompare(b.title);
  return JURISDICTIONS.map(([key, label]) => ({
    jurisdiction: key,
    label,
    items: items.filter((i) => i.jurisdiction === key && match(i)).sort(byDue),
  })).filter((g) => g.items.length > 0);
}

/** Counts items per value of `key`, ignoring the filter on that same key. */
export function countBy<T extends Filterable>(
  items: T[],
  key: "jurisdiction" | "category",
  filters: Partial<ObligationFilters> = {},
): Record<string, number> {
  const kept = groupObligations(items, { ...filters, [key]: "all" }).flatMap((g) => g.items);
  const counts: Record<string, number> = {};
  for (const i of kept) counts[i[key]] = (counts[i[key]] ?? 0) + 1;
  return counts;
}

export type { ComplianceItem, Industry };
