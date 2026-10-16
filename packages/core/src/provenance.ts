import { stateInfo } from "./data";
import { reportKey } from "./rules/state";
import type { ComplianceItem, Provenance, ResolvedProfile, SourceKind, SourceRef } from "./types";

/** Data checked against official pages should be re-verified after this many days. */
export const REVIEW_INTERVAL_DAYS = 365;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function sourceKind(url: string): SourceKind {
  if (/\.pdf($|[?#])/i.test(url)) return "pdf";
  if (/municode|amlegal|ordinance|codelibrary/i.test(url)) return "ordinance";
  if (/statute|legis|law\.cornell|ecfr\.gov|\/code\//i.test(url)) return "statute";
  if (/\.(csv|json)($|[?#])|data\.gov|doleta\.gov\/unemploy/i.test(url)) return "dataset";
  return "agency_page";
}

/** Adds the compilation date, review date, staleness flag and detailed sources to a provenance record. */
export function describeProvenance(p: Provenance, asOf: string, compiledOn: string): Provenance {
  const out: Provenance = { ...p, compiledOn };
  // The review clock starts at the last check, or at compilation for data that was never individually checked.
  out.reviewBy = addDays(p.checkedOn ?? compiledOn, REVIEW_INTERVAL_DAYS);
  out.stale = out.reviewBy < asOf;
  out.sourceDetails = p.sources.map((url): SourceRef => ({
    url,
    kind: sourceKind(url),
    ...(p.checkedOn ? { retrievedOn: p.checkedOn } : {}),
    archiveUrl: `https://web.archive.org/web/${url}`,
  }));
  return out;
}

/**
 * Derives where an item's data comes from. Fields the project checked against official pages (entity
 * reports, workers' comp thresholds, DBA filing level, cannabis regulators) are `checked`, or
 * `unconfirmed` when the state's verification block lists the field. Everything else is `compiled`.
 */
const DOL_UI_SOURCE = "https://oui.doleta.gov/unemploy/content/sigpros/2020-2029/January2026.pdf";
const UI_CHECKED_ON = "2026-10-13";

export function provenanceFor(item: ComplianceItem, p: ResolvedProfile): Provenance {
  const url = item.url ? [item.url] : [];
  if (item.id.startsWith("state.employer") && item.title.includes("unemployment insurance contributions")) {
    // Wage base and rates come from the U.S. DOL's January 2026 table of state UI laws.
    return { confidence: "checked", checkedOn: UI_CHECKED_ON, sources: [DOL_UI_SOURCE, ...url] };
  }
  if (item.id.startsWith("state.entity-tax") && item.state) {
    const detail = stateInfo(item.state).entityTaxDetail;
    if (detail)
      return { confidence: "checked", checkedOn: detail.checkedOn, sources: [detail.source, ...url] };
  }
  if (!item.state || !(item.id.startsWith("state.") || item.id.startsWith("industry.cannabis"))) {
    return { confidence: "compiled", sources: url };
  }
  const s = stateInfo(item.state);
  const v = s.verification;
  const unconfirmed = new Set(v.unconfirmed);
  const has = (...keys: string[]) => keys.some((k) => unconfirmed.has(k));
  let field: "checked" | "unconfirmed" | "compiled" = "compiled";

  if (item.id.startsWith("state.annual-report")) {
    const k = reportKey(p, item.state);
    field = has(k, `${k}.fee`, `${k}.deadline`) ? "unconfirmed" : "checked";
  } else if (item.id.startsWith("state.employer") && /workers' compensation/.test(item.title)) {
    field = has("workersComp.trigger", "workersComp.threshold") ? "unconfirmed" : "checked";
  } else if (item.id.startsWith("state.trade-name")) {
    field = v.dba === "checked" ? "checked" : "unconfirmed";
  } else if (item.id.startsWith("industry.cannabis")) {
    field = has("cannabis.regulator", "cannabis.status") ? "unconfirmed" : "checked";
  }
  if (field === "compiled") return { confidence: "compiled", sources: url };
  return {
    confidence: field,
    checkedOn: v.checkedOn,
    sources: [...new Set([...v.sources, ...url])],
  };
}
