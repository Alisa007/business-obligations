import { STATES } from "./data/states";

export const STATE_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(STATES).map(([code, s]) => [code, s.name]),
);

export function isState(code: string): boolean {
  return code in STATES;
}

export function stateName(code: string): string {
  return STATES[code]?.name ?? code;
}
