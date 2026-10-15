import { STATES } from "./data/states";

export function isState(code: string): boolean {
  return code in STATES;
}

export function stateName(code: string): string {
  return STATES[code]?.name ?? code;
}
