import {
  analyzeInputs,
  buildCalendar,
  estimateCosts,
  evaluate,
  industryFromNaics,
  planLaunch,
  toICS,
  type BusinessProfile,
  type ComplianceItem,
  type EntityType,
  type Profession,
} from "business-obligations";

// Labels are keyed by the library's own enum types, so adding a value there fails the build until it has a label here.
const ENTITY_LABELS: Record<EntityType, string> = {
  llc: "LLC",
  sole_proprietorship: "Sole proprietorship",
  s_corp: "S corporation",
  c_corp: "C corporation",
  partnership: "General partnership",
  lp: "Limited partnership",
  llp: "Limited liability partnership",
  pllc: "Professional LLC",
  pc: "Professional corporation",
  benefit_corp: "Benefit corporation",
  nonprofit: "Nonprofit",
};

const PROFESSION_LABELS: Record<Profession, string> = {
  attorney: "Attorney",
  cpa: "CPA",
  physician: "Physician",
  architect: "Architect",
  engineer: "Engineer",
  other: "Other",
};

const options = <K extends string>(labels: Record<K, string>) => Object.entries(labels) as Array<[K, string]>;
export const ENTITY_TYPES = options(ENTITY_LABELS);
export const PROFESSIONS = options(PROFESSION_LABELS);

/** Raw values of the profile form. Numbers are kept as the text the user typed. */
export interface FormValues {
  zip: string;
  entityType: string;
  /** NAICS code, 2 to 6 digits, or empty. */
  naics: string;
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
export const needsProfession = (f: Pick<FormValues, "entityType" | "naics">): boolean =>
  ["pllc", "pc", "llp"].includes(f.entityType) ||
  industryFromNaics(f.naics)?.industry === "professional_services";

/** Turns form values into a BusinessProfile; `place` is the result of a ZIP lookup. */
export function buildProfile(form: FormValues, place: Place): BusinessProfile {
  const profile: Record<string, unknown> = {
    entityType: form.entityType,
    zip: form.zip,
    city: place.city,
    county: place.county,
    state: place.state,
    naics: form.naics || undefined,
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

/** Today's date in the visitor's time zone; `toISOString()` is UTC and is already tomorrow on a US evening. */
export const today = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

function addYears(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

interface AnalyzeOptions {
  asOf?: string;
  openingDate?: string;
  isNew?: boolean;
}

/** Runs every analysis the playground shows. Throws the library's errors for the UI to display. */
export function analyze(profile: BusinessProfile, options: AnalyzeOptions = {}) {
  const asOf = options.asOf || today();
  // Every view answers for the same business: a new one has not formed yet, so its annual reports and returns
  // are not on the calendar and "what if" starts from the unformed profile.
  const current = { ...profile, isFormed: !options.isNew };
  const result = evaluate(current, { asOf });
  const plan = planLaunch(profile, { startDate: asOf, openingDate: options.openingDate || undefined });
  const calendar = buildCalendar(current, { from: asOf, to: addYears(asOf, 1) });
  return {
    result,
    plan,
    events: calendar.events,
    ics: toICS(calendar.events, { calendarName: "Compliance deadlines" }),
    costs: estimateCosts(result.items, { profile: result.profile, ownerCount: result.profile.ownerCount }),
    analysis: analyzeInputs(current, { asOf }),
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
  /** `verified`: checked against official pages; `unverified`: compiled, unconfirmed or past its review date. */
  trust: "all" | "verified" | "unverified";
}

export const NO_FILTERS: ObligationFilters = {
  jurisdiction: "all",
  category: "all",
  query: "",
  trust: "all",
};

type Filterable = Pick<
  ComplianceItem,
  "title" | "authority" | "description" | "reason" | "jurisdiction" | "category" | "nextDue" | "provenance"
>;

/** True when the item was checked against official pages and is not past its review date. */
export const isVerified = (i: Pick<ComplianceItem, "provenance">): boolean =>
  i.provenance?.confidence === "checked" && !i.provenance.stale;

/** What the result summary shows: size, nearest deadline, how much of the data is verified, and caveats. */
export function summarize(result: Analysis["result"]) {
  const items = result.items;
  const dated = items
    .filter((i): i is typeof i & { nextDue: string } => Boolean(i.nextDue) && i.nextDue! >= result.asOf)
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  const in30 = new Date(`${result.asOf}T00:00:00Z`);
  in30.setUTCDate(in30.getUTCDate() + 30);
  const horizon = in30.toISOString().slice(0, 10);
  return {
    total: items.length,
    verified: items.filter(isVerified).length,
    stale: items.filter((i) => i.provenance?.stale).length,
    next: dated[0],
    dueSoon: dated.filter((i) => i.nextDue <= horizon).length,
    hasCityData: items.some((i) => i.jurisdiction === "city" && i.ruleId === "local.seeded-city"),
    hasCountyData: items.some((i) => i.jurisdiction === "county" && i.ruleId === "local.seeded-county"),
    changes: result.upcomingChanges,
  };
}

/**
 * Filters obligations and groups them by jurisdiction. Within a group, items with a known next due date come
 * first (soonest first), then the rest alphabetically.
 */
export function groupObligations<T extends Filterable>(
  items: T[],
  { jurisdiction = "all", category = "all", query = "", trust = "all" }: Partial<ObligationFilters> = {},
) {
  const q = query.trim().toLowerCase();
  const match = (i: T) =>
    (jurisdiction === "all" || i.jurisdiction === jurisdiction) &&
    (category === "all" || i.category === category) &&
    (trust === "all" || (trust === "verified") === isVerified(i)) &&
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
