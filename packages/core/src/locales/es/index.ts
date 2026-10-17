import type { Catalog } from "../../i18n";
import core from "./core.json";
import { labels } from "./labels";
import local from "./local.json";
import { patterns } from "./patterns";
import { stateNames } from "./states";

/**
 * Spanish catalog: labels, rule and data text, and the templates for generated text. Import it from
 * `business-obligations/locales/es` and pass it to `localize` or `localizePlan`.
 */
export const es: Catalog = {
  ...labels,
  locale: "es",
  strings: {
    ...stateNames,
    sole_prop: "empresa individual",
    partnership: "sociedad colectiva",
    s_corp: "corporación S",
    c_corp: "corporación C",
    nonprofit: "organización sin fines de lucro",
    ...(core as Record<string, string>),
    ...(local as Record<string, string>),
  },
  patterns,
};
