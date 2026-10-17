import { stateName } from "./states";
import type { ComplianceResult } from "./engine";
import type { CostEstimate } from "./costs";
import type { LaunchPhase, LaunchPlan, LaunchStep } from "./launch";
import type {
  ComplianceItem,
  FilingMethod,
  Frequency,
  ItemCategory,
  Jurisdiction,
  ResolvedProfile,
} from "./types";

/** Translated templates for one rule. Placeholders look like `{state}`, `{city}` or `{authority}`. */
export interface RuleMessages {
  title?: string;
  description?: string;
  reason?: string;
  authority?: string;
  deadline?: string;
}

/**
 * A translation catalog. Everything is optional: items, labels or the disclaimer without an entry keep the
 * English text the engine produced.
 */
export interface Catalog {
  locale: string;
  disclaimer?: string;
  categories?: Partial<Record<ItemCategory, string>>;
  frequencies?: Partial<Record<Frequency, string>>;
  jurisdictions?: Partial<Record<Jurisdiction, string>>;
  /**
   * Messages by rule id (`state.annual-report`). A key of the form `ruleId:STATE` (for example
   * `state.annual-report:NY`) overrides the generic entry for that state.
   */
  rules?: Record<string, RuleMessages>;
  /**
   * Translations of exact English text, for any text field of an item (title, description, reason, authority,
   * deadline, renewal, processing time, exemptions, fee and penalty notes) and for plan phases. This is how the text
   * that comes from the bundled state, city and county data is translated: the same sentence appears in many places
   * and is translated once.
   */
  strings?: Record<string, string>;
  /**
   * Translations of English text with variable parts, as `[english, localized]` templates. `{1}`, `{2}`, ... stand for
   * the variable parts (a place, a fee, a deadline); the same number in the localized text puts that part back, itself
   * translated. The template must match the whole text, and the first one that does wins. Rule messages and exact
   * `strings` are tried first.
   */
  patterns?: Array<[english: string, localized: string]>;
  /** The twelve month names, January first. With `monthDay`, "April 15" in a text becomes "15 de abril". */
  months?: readonly string[];
  /** How a month and a day are written, e.g. `{day} de {month}`. */
  monthDay?: string;
  /** How a month, a day and a year are written, e.g. `{day} de {month} de {year}`. Defaults to `monthDay`. */
  monthDayYear?: string;
  /** Display names for entity types, used by `{entityType}` in rule messages. */
  entityTypes?: Record<string, string>;
  filingMethods?: Partial<Record<FilingMethod, string>>;
  /** Display labels for how well an item's data was checked. */
  confidence?: Partial<Record<"checked" | "compiled" | "unconfirmed", string>>;
}

export interface LocalizedItem extends ComplianceItem {
  /** Display labels in the catalog's locale (English enum values when the catalog has no label). */
  labels: {
    category: string;
    frequency: string;
    jurisdiction: string;
    filingMethod?: string[];
    confidence?: string;
  };
}

export interface LocalizedResult extends Omit<ComplianceResult, "items"> {
  items: LocalizedItem[];
  locale: string;
}

const fill = (template: string, values: Record<string, string | number | undefined>): string =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const v = values[key];
    return v === undefined ? whole : String(v);
  });

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_DAY = new RegExp(`\\b(${MONTHS_EN.join("|")}) (\\d{1,2})(?:, (\\d{4}))?\\b`, "g");

// A sentence ends at ". " before a capital letter, but not after an initial or abbreviation ("N.C.G.S.", "Rev. Stat.").
const SENTENCE_BREAK =
  /(?<=[.!?])(?<!\b[A-Z]\.)(?<!\b(?:Rev|Stat|Code|Gen|Ann|Misc|Miss|Sec|No|St|Co|Inc|Ltd|Dept|Ch)\.)\s+(?=[A-Z0-9$(])/;
const DATE = `(?:${MONTHS_EN.join("|")}) \\d{1,2}(?:, \\d{4})?`;
const PURE_DATES = new RegExp(`^${DATE}(?:, ${DATE})*$`);

const compiled = new WeakMap<Catalog, Array<Pattern>>();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface Pattern {
  regex: RegExp;
  localized: string;
  /** Parts that must come out translated for the template to apply. */
  required: string[];
}

/** What a part may match: any text by default, or a number, a single word or a two-letter state code. */
const NAME = "[A-Z][\\p{L}.'’-]*";
const PART: Record<string, string> = {
  n: "\\d[\\d,.]*",
  w: "\\S+",
  c: "[A-Z]{2}",
  // Capitalised words, optionally joined by "of"/"the"/"and" (a state or place name).
  p: `${NAME}(?: (?:(?:of|the|and) )?${NAME}){0,3}`,
};

/**
 * `File {1} for {2}` -> /^File (?<g1>.+?) for (?<g2>.+?)$/s. A part can be typed (`{1:n}` number, `{1:w}` word,
 * `{1:c}` state code, `{1:p}` capitalised name) and marked `!` (`{1!}`) when the template should only apply if that part gets translated. A
 * repeated number must repeat the same text.
 */
const compilePattern = (template: string, localized: string): Pattern => {
  const seen = new Set<string>();
  const required: string[] = [];
  const source = template
    .split(/(\{\d(?::[nwcp])?!?\})/)
    .map((part) => {
      const m = /^\{(\d)(?::([nwcp]))?(!)?\}$/.exec(part);
      if (!m) return escape(part);
      const [, n, type, must] = m as unknown as [string, string, string | undefined, string | undefined];
      if (must && !required.includes(n)) required.push(n);
      if (seen.has(n)) return `\\k<g${n}>`;
      seen.add(n);
      return `(?<g${n}>${type ? PART[type] : ".+?"})`;
    })
    .join("");
  return { regex: new RegExp(`^${source}$`, "su"), localized, required };
};

const patternsOf = (catalog: Catalog): Pattern[] => {
  let list = compiled.get(catalog);
  if (!list) {
    list = (catalog.patterns ?? []).map(([english, localized]) => compilePattern(english, localized));
    compiled.set(catalog, list);
  }
  return list;
};

/**
 * Translates one piece of English text with a catalog: an exact `strings` entry, else the first matching
 * `patterns` template, else month-and-day phrases ("April 15"). Text without a translation is returned unchanged.
 */
export function localizeText(text: string, catalog: Catalog, depth = 0): string {
  const trimmed = text.trim();
  if (trimmed !== text) {
    if (!trimmed) return text;
    const lead = text.slice(0, text.length - text.trimStart().length);
    const trail = text.slice(text.trimEnd().length);
    return lead + localizeText(trimmed, catalog, depth) + trail;
  }
  const exact = catalog.strings?.[text] ?? catalog.entityTypes?.[text];
  if (exact !== undefined) return exact;
  if (depth < 4) {
    for (const { regex, localized, required } of patternsOf(catalog)) {
      const m = regex.exec(text);
      if (!m) continue;
      const parts = new Map<string, string>();
      const part = (n: string) => {
        let value = parts.get(n);
        if (value === undefined) {
          value = localizeText(m.groups?.[`g${n}`] ?? "", catalog, depth + 1);
          parts.set(n, value);
        }
        return value;
      };
      if (required.some((n) => part(n) === m.groups?.[`g${n}`])) continue;
      const out = localized.replace(/\{(\d)(?::[nwcp])?!?\}/g, (_, n: string) => part(n));
      // A text that begins with a translated value (an entity type) starts with a capital letter.
      return localized.startsWith("{") ? out.charAt(0).toLocaleUpperCase(catalog.locale) + out.slice(1) : out;
    }
  }
  // Several sentences: translate each one, but only when every sentence has a translation.
  if (depth < 4) {
    const sentences = text.split(SENTENCE_BREAK);
    if (sentences.length > 1) {
      const parts = sentences.map((sentence) => localizeText(sentence, catalog, depth + 1));
      if (parts.every((part, i) => part !== sentences[i])) return parts.join(" ");
    }
  }
  // A text that is only month-and-day dates ("April 30, July 31") needs no template. Dates inside a sentence are left
  // alone: the sentence has to be translated as a whole, or it would come out half in each language.
  if (catalog.months?.length === 12 && catalog.monthDay && PURE_DATES.test(text)) {
    const { months, monthDay } = catalog;
    return text.replace(MONTH_DAY, (_, month: string, day: string, year?: string) => {
      const template = year ? (catalog.monthDayYear ?? monthDay) : monthDay;
      return template
        .replace("{month}", months[MONTHS_EN.indexOf(month)] ?? month)
        .replace("{day}", day)
        .replace("{year}", year ?? "");
    });
  }
  return text;
}

function localizeItem(item: ComplianceItem, p: ResolvedProfile, catalog: Catalog): LocalizedItem {
  const code = item.state;
  const messages = (code && catalog.rules?.[`${item.ruleId}:${code}`]) || catalog.rules?.[item.ruleId] || {};
  const values = {
    state: code ? stateName(code) : undefined,
    stateCode: code,
    city: p.city,
    county: p.county,
    zip: p.zip,
    authority: item.authority,
    title: item.title,
    deadline: item.deadline,
    nextDue: item.nextDue,
    amount: item.cost?.amount,
    formationState: stateName(p.formationState),
    entityType: catalog.entityTypes?.[p.entityType] ?? p.entityType,
    formId: item.formId,
  };
  const pick = (field: keyof RuleMessages, original: string): string => {
    const t = messages[field];
    return t === undefined ? localizeText(original, catalog) : fill(t, values);
  };
  const text = (value: string) => localizeText(value, catalog);
  return {
    ...item,
    title: pick("title", item.title),
    description: pick("description", item.description),
    reason: pick("reason", item.reason),
    authority: pick("authority", item.authority),
    ...(item.deadline !== undefined ? { deadline: pick("deadline", item.deadline) } : {}),
    ...(item.renewal !== undefined ? { renewal: text(item.renewal) } : {}),
    ...(item.processingTime !== undefined ? { processingTime: text(item.processingTime) } : {}),
    ...(item.exemptions ? { exemptions: item.exemptions.map(text) } : {}),
    ...(item.appliesWhen
      ? {
          appliesWhen: item.appliesWhen.map((w) =>
            w.description ? { ...w, description: text(w.description) } : w,
          ),
        }
      : {}),
    ...(item.cost?.note !== undefined ? { cost: { ...item.cost, note: text(item.cost.note) } } : {}),
    ...(item.penalty?.note !== undefined
      ? { penalty: { ...item.penalty, note: text(item.penalty.note) } }
      : {}),
    ...(item.upcomingChanges
      ? { upcomingChanges: item.upcomingChanges.map((c) => ({ ...c, summary: text(c.summary) })) }
      : {}),
    labels: {
      category: catalog.categories?.[item.category] ?? item.category,
      frequency: catalog.frequencies?.[item.frequency] ?? item.frequency,
      jurisdiction: catalog.jurisdictions?.[item.jurisdiction] ?? item.jurisdiction,
      ...(item.filingMethod
        ? { filingMethod: item.filingMethod.map((m) => catalog.filingMethods?.[m] ?? m) }
        : {}),
      ...(item.provenance
        ? { confidence: catalog.confidence?.[item.provenance.confidence] ?? item.provenance.confidence }
        : {}),
    },
  };
}

/**
 * Applies a catalog to a result. Rule-level templates are keyed by `ruleId` and may use `{state}` (name),
 * `{stateCode}`, `{city}`, `{county}`, `{zip}`, `{authority}`, `{title}` (the English title), `{deadline}`,
 * `{nextDue}`, `{amount}`, `{formationState}`, `{entityType}` and `{formId}`. Text without a rule template goes
 * through `localizeText` (`strings`, `patterns`, month names).
 */
export function localize(result: ComplianceResult, catalog: Catalog): LocalizedResult {
  return {
    ...result,
    items: result.items.map((item) => localizeItem(item, result.profile, catalog)),
    disclaimer: catalog.disclaimer ?? localizeText(result.disclaimer, catalog),
    locale: catalog.locale,
  };
}

export interface LocalizedStep extends Omit<LaunchStep, "item"> {
  item: LocalizedItem;
}

export interface LocalizedPhase extends Omit<LaunchPhase, "steps"> {
  steps: LocalizedStep[];
}

export interface LocalizedPlan extends Omit<LaunchPlan, "result" | "phases" | "steps" | "costs"> {
  locale: string;
  result: LocalizedResult;
  phases: LocalizedPhase[];
  steps: LocalizedStep[];
  costs: CostEstimate;
}

/**
 * Applies a catalog to a launch plan: its items (see `localize`), the phase titles and descriptions, and the item
 * titles and reasons in the cost estimate.
 */
export function localizePlan(plan: LaunchPlan, catalog: Catalog): LocalizedPlan {
  const result = localize(plan.result, catalog);
  const byId = new Map(result.items.map((i) => [i.id, i]));
  const itemOf = (item: ComplianceItem) =>
    byId.get(item.id) ?? localizeItem(item, plan.result.profile, catalog);
  const step = (s: LaunchStep): LocalizedStep => ({ ...s, item: itemOf(s.item) });
  const title = (id: string, fallback: string) => byId.get(id)?.title ?? localizeText(fallback, catalog);
  const steps = plan.steps.map(step);
  const stepByOrder = new Map(steps.map((s) => [s.order, s]));
  return {
    ...plan,
    locale: catalog.locale,
    result,
    steps,
    phases: plan.phases.map((ph) => ({
      ...ph,
      title: localizeText(ph.title, catalog),
      description: localizeText(ph.description, catalog),
      steps: ph.steps.map((s) => stepByOrder.get(s.order) ?? step(s)),
    })),
    costs: {
      ...plan.costs,
      lines: plan.costs.lines.map((l) => ({ ...l, title: title(l.id, l.title) })),
      unknown: plan.costs.unknown.map((u) => ({
        ...u,
        title: title(u.id, u.title),
        reason: byId.get(u.id)?.reason ?? localizeText(u.reason, catalog),
      })),
    },
  };
}

/** Rule ids and the English strings they produce for a result: a starting point for a translation catalog. */
export function catalogTemplate(
  result: ComplianceResult,
): Record<string, Required<Pick<RuleMessages, "title" | "description" | "reason">>> {
  const out: Record<string, { title: string; description: string; reason: string }> = {};
  for (const i of result.items)
    out[i.ruleId] ??= { title: i.title, description: i.description, reason: i.reason };
  return out;
}
