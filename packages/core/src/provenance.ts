import { stateInfo } from "./data";
import { reportKey } from "./rules/state";
import type { ComplianceItem, Provenance, ResolvedProfile } from "./types";

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
