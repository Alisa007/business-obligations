import { stateName } from "./states";
import type { ComplianceResult } from "./engine";
import type { ComplianceItem, Frequency, ItemCategory, Jurisdiction } from "./types";

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
}

export interface LocalizedItem extends ComplianceItem {
  /** Display labels in the catalog's locale (English enum values when the catalog has no label). */
  labels: { category: string; frequency: string; jurisdiction: string };
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

/**
 * Applies a catalog to a result. Rule-level templates are keyed by `ruleId` and may use `{state}` (name),
 * `{stateCode}`, `{city}`, `{county}`, `{zip}`, `{authority}`, `{title}` (the English title), `{deadline}`,
 * `{nextDue}`, `{amount}`, `{formationState}` and `{entityType}`.
 */
export function localize(result: ComplianceResult, catalog: Catalog): LocalizedResult {
  const p = result.profile;
  const items = result.items.map((item): LocalizedItem => {
    const code = item.state;
    const messages =
      (code && catalog.rules?.[`${item.ruleId}:${code}`]) || catalog.rules?.[item.ruleId] || {};
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
      entityType: p.entityType,
    };
    const pick = (field: keyof RuleMessages): string | undefined => {
      const t = messages[field];
      return t === undefined ? undefined : fill(t, values);
    };
    return {
      ...item,
      title: pick("title") ?? item.title,
      description: pick("description") ?? item.description,
      reason: pick("reason") ?? item.reason,
      authority: pick("authority") ?? item.authority,
      ...(item.deadline !== undefined ? { deadline: pick("deadline") ?? item.deadline } : {}),
      labels: {
        category: catalog.categories?.[item.category] ?? item.category,
        frequency: catalog.frequencies?.[item.frequency] ?? item.frequency,
        jurisdiction: catalog.jurisdictions?.[item.jurisdiction] ?? item.jurisdiction,
      },
    };
  });
  return {
    ...result,
    items,
    disclaimer: catalog.disclaimer ?? result.disclaimer,
    locale: catalog.locale,
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
