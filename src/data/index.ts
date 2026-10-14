import type { IndustryAuthorities, StateInfo } from "./types";
import { STATES } from "./states";
import { CITIES } from "./cities";
import professionData from "../../data/professions.json";
import type { LocalJurisdiction } from "./types";
import { resolveState } from "../changes";

export { STATES };
export const STATE_CODES = Object.keys(STATES);
export { CITIES };
export const LOCAL_JURISDICTIONS: LocalJurisdiction[] = Object.values(CITIES).flat();

/** Lowercased, punctuation-free city name used for lookups ("St. Louis" and "Saint Louis" match). */
export const normalizeCity = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\bcity of\b/, "")
    .replace(/\bsaint\b/, "st")
    .replace(/\bfort\b/, "ft")
    .replace(/\bmount\b/, "mt")
    .replace(/\s+/g, " ")
    .trim();

/** A lookup over city seeds: constant-time however many cities are seeded. */
export type CityLookup = (state: string, city: string, county?: string) => LocalJurisdiction | undefined;

/**
 * Builds a lookup over a list of city seeds, for city data you load yourself (for example a state shard
 * fetched on demand) instead of bundling it. Names and aliases are matched after normalization.
 */
export function indexCities(list: LocalJurisdiction[]): CityLookup {
  const index = new Map<string, LocalJurisdiction[]>();
  for (const j of list)
    for (const name of [j.city, ...(j.aliases ?? [])]) {
      const key = `${j.state}:${normalizeCity(name)}`;
      const entries = index.get(key) ?? [];
      if (!entries.includes(j)) entries.push(j);
      index.set(key, entries);
    }
  // When several seeded cities in one state share a name, the one whose `counties` include `county` wins.
  return (state, city, county) => {
    const entries = index.get(`${state}:${normalizeCity(city)}`);
    if (!entries) return undefined;
    if (entries.length === 1 || !county) return entries[0];
    const c = normalizeCity(county.replace(/\bcounty\b/i, ""));
    return entries.find((j) => j.counties?.some((x) => normalizeCity(x) === c)) ?? entries[0];
  };
}

/** The bundled seed for a city, if there is one. */
export const findCity: CityLookup = indexCities(LOCAL_JURISDICTIONS);

export function stateInfo(code: string): StateInfo {
  const s = STATES[code];
  if (!s) throw new Error(`No state data for ${code}`);
  return resolveState(code, s);
}

export const industryAuthorities = (code: string): IndustryAuthorities => stateInfo(code).industry;

export interface BoardRef {
  name: string;
  url?: string;
}

const PROFESSIONS = (professionData as unknown as { professions: Record<string, Record<string, BoardRef>> })
  .professions;

/** The state board for a licensed profession, or undefined for "other". */
export function professionBoard(profession: string, state: string): BoardRef | undefined {
  return PROFESSIONS[profession]?.[state];
}
