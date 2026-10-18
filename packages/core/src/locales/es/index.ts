import type { Catalog } from "../../i18n";
import { labels } from "./labels";
import deadlines from "./strings/deadlines.json";
import authority from "./strings/authority.json";
import descriptions from "./strings/descriptions.json";
import industries from "./strings/industries.json";
import localDescriptions from "./strings/local-descriptions.json";
import local from "./strings/local.json";
import notes from "./strings/notes.json";
import places from "./strings/places.json";
import reasons from "./strings/reasons.json";
import rulesExtra from "./strings/rules-extra.json";
import stateTaxes from "./strings/state-taxes.json";
import terms from "./strings/terms.json";
import titles from "./strings/titles.json";
import { rulePatterns } from "./patterns-rules";
import { authorityPatterns } from "./patterns-authority";
import { patterns } from "./patterns";
import { localPatterns } from "./patterns-local";
import { statePatterns } from "./patterns-state";
import { stateNames } from "./states";

// The engine's DISCLAIMER, spelled out so that this module does not import the engine.
const ENGLISH_DISCLAIMER =
  "General compliance information, not legal, tax or accounting advice, and no attorney-client relationship is created. Requirements depend on facts this library cannot see and change often; data is compiled from public sources and may be incomplete or out of date (see each item's provenance and the result's dataVersion). Confirm requirements with the cited authority or a qualified professional before relying on them.";

/**
 * Spanish catalog: labels, rule and data text, and the templates for generated text. Import it from
 * `business-obligations/locales/es` and pass it to `localize` or `localizePlan`.
 */
export const es: Catalog = {
  ...labels,
  locale: "es",
  strings: {
    [ENGLISH_DISCLAIMER]: labels.disclaimer as string,
    ...stateNames,
    ...places,
    ...stateTaxes,
    sole_prop: "empresa individual",
    ...notes,
    ...deadlines,
    ...titles,
    ...reasons,
    ...descriptions,
    ...local,
    ...industries,
    ...authority,
    ...localDescriptions,
    ...terms,
    ...rulesExtra,
  },
  patterns: [
    ...localPatterns,
    ...patterns,
    ...statePatterns,
    ...rulePatterns,
    ...authorityPatterns,
    // Last resort for "<text> (<qualifier>)": translates each part on its own.
    ["{1:w} ({2!})", "{1} ({2})"],
  ],
};
