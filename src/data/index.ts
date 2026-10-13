import type { IndustryAuthorities, StateInfo } from "./types";
import { STATES } from "./states";
import localData from "../../data/local.json";
import professionData from "../../data/professions.json";
import type { LocalJurisdiction } from "./types";

export { STATES };
export const STATE_CODES = Object.keys(STATES);
export const LOCAL_JURISDICTIONS = localData as unknown as LocalJurisdiction[];

export function stateInfo(code: string): StateInfo {
  const s = STATES[code];
  if (!s) throw new Error(`No state data for ${code}`);
  return s;
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
