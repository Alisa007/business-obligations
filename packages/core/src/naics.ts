import type { AlcoholActivity, Industry, Profession } from "./types";

/** What a NAICS code tells the engine; anything a code cannot say stays an explicit input. */
export interface NaicsMatch {
  industry: Industry;
  /** For alcohol codes: what the business does with alcohol. */
  alcoholActivity?: AlcoholActivity;
  /** For licensed professions: which one. */
  profession?: Profession;
}

// Longest matching prefix wins, so a specific code overrides its sector. Transportation and cannabis are not
// derived: they need vehicle or activity answers that no code carries (cannabis has no NAICS code of its own).
const PREFIXES: Array<[string, NaicsMatch]> = [
  ["23", { industry: "construction" }],
  ["44", { industry: "retail" }],
  ["45", { industry: "retail" }],
  ["4453", { industry: "alcohol", alcoholActivity: "retail" }],
  ["4248", { industry: "alcohol", alcoholActivity: "wholesale" }],
  ["31212", { industry: "alcohol", alcoholActivity: "manufacture" }],
  ["31213", { industry: "alcohol", alcoholActivity: "manufacture" }],
  ["31214", { industry: "alcohol", alcoholActivity: "manufacture" }],
  ["722", { industry: "restaurant" }],
  ["7224", { industry: "alcohol", alcoholActivity: "retail" }],
  ["531", { industry: "real_estate" }],
  ["621", { industry: "healthcare" }],
  ["622", { industry: "healthcare" }],
  ["623", { industry: "healthcare" }],
  ["6244", { industry: "childcare" }],
  ["5411", { industry: "professional_services", profession: "attorney" }],
  ["5412", { industry: "professional_services", profession: "other" }],
  ["541211", { industry: "professional_services", profession: "cpa" }],
  ["5413", { industry: "professional_services", profession: "other" }],
  ["54131", { industry: "professional_services", profession: "architect" }],
  ["54133", { industry: "professional_services", profession: "engineer" }],
];

/** Industry (and, where the code says so, alcohol activity or profession) implied by a 2 to 6 digit NAICS code. */
export function industryFromNaics(naics: string | undefined): NaicsMatch | undefined {
  if (!naics) return undefined;
  let best: NaicsMatch | undefined;
  let length = 0;
  for (const [prefix, match] of PREFIXES) {
    if (naics.startsWith(prefix) && prefix.length >= length) {
      best = match;
      length = prefix.length;
    }
  }
  return best;
}
