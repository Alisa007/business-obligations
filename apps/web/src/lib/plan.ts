import {
  analyzeInputs,
  buildCalendar,
  estimateCosts,
  evaluate,
  planLaunch,
  toICS,
  type BusinessProfile,
  type Scope,
} from "business-obligations";
import { isVerified, todayIso, type ConditionalItem } from "business-obligations-ui";

function addYears(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

interface AnalyzeOptions {
  asOf?: string;
  openingDate?: string;
  isNew?: boolean;
  /** Only the federal rules, which need no place: for when none is known. */
  federalOnly?: boolean;
}

/**
 * Items that are not in the result but would be if a detail that is still unknown turned out differently. `analyzeInputs`
 * says which item ids each alternative value adds; the items themselves come from evaluating with that value.
 */
export function conditionalItems(
  profile: BusinessProfile,
  result: ReturnType<typeof evaluate>,
  analysis: ReturnType<typeof analyzeInputs>,
  asOf: string,
  scope?: Scope,
): ConditionalItem[] {
  const have = new Set(result.items.map((item) => item.id));
  // Only what is unknown: a detail the person gave is settled, so what it would change is not "conditional".
  const unknown = new Set<string>(analysis.defaultsUsed.map((input) => input.field));
  const found = new Map<string, ConditionalItem>();
  for (const sensitivity of analysis.sensitivity)
    for (const change of unknown.has(sensitivity.field) ? sensitivity.changes : []) {
      const added = new Set(change.added.filter((id) => !have.has(id)));
      if (added.size === 0) continue;
      const alternative = evaluate({ ...profile, [sensitivity.field]: change.value }, { asOf, scope });
      for (const item of alternative.items) {
        if (!added.has(item.id)) continue;
        const entry = found.get(item.id) ?? { item, when: [] };
        const same = entry.when.find((w) => w.field === sensitivity.field);
        if (same) same.values.push(change.value);
        else entry.when.push({ field: sensitivity.field, values: [change.value] });
        found.set(item.id, entry);
      }
    }
  return [...found.values()];
}

/** Runs every analysis the playground shows. Throws the library's errors for the UI to display. */
export function analyze(profile: BusinessProfile, options: AnalyzeOptions = {}) {
  const asOf = options.asOf || todayIso();
  // Every view answers for the same business: a new one has not formed yet, so its annual reports and returns
  // are not on the calendar and "what if" starts from the unformed profile.
  const current = { ...profile, isFormed: !options.isNew };
  const scope = options.federalOnly ? "federal" : undefined;
  const result = evaluate(current, { asOf, scope });
  const plan = planLaunch(profile, { startDate: asOf, openingDate: options.openingDate || undefined, scope });
  const calendar = buildCalendar(current, { from: asOf, to: addYears(asOf, 1), scope });
  const analysis = analyzeInputs(current, { asOf, scope });
  return {
    federalOnly: Boolean(options.federalOnly),
    result,
    plan,
    conditional: conditionalItems(current, result, analysis, asOf, scope),
    events: calendar.events,
    ics: toICS(calendar.events, { calendarName: "Compliance deadlines" }),
    costs: estimateCosts(result.items, { profile: result.profile, ownerCount: result.profile.ownerCount }),
    analysis,
  };
}

export type Analysis = ReturnType<typeof analyze>;

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
