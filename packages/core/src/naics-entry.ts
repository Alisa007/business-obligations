import naicsData from "../data/naics.json";
import { industryFromNaics } from "./naics";

const CODES = naicsData as unknown as Array<[string, string]>;

export interface NaicsCode {
  /** Six-digit 2022 NAICS code. */
  code: string;
  title: string;
}

/** Every six-digit 2022 NAICS code (US Census Bureau, public domain). */
export const NAICS_CODES: readonly NaicsCode[] = CODES.map(([code, title]) => ({ code, title }));

/** Title of a six-digit code, or undefined for an unknown code. */
export function naicsTitle(code: string): string | undefined {
  return NAICS_CODES.find((c) => c.code === code)?.title;
}

/**
 * Codes matching what the user typed: digits match a code prefix, words must all appear in the title.
 * Codes the engine has rules for (see `industryFromNaics`) come first.
 */
export function searchNaics(query: string, limit = 8): NaicsCode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const digits = /^\d+$/.test(q);
  const words = q.split(/\s+/);
  const found = NAICS_CODES.filter((c) =>
    digits ? c.code.startsWith(q) : words.every((w) => c.title.toLowerCase().includes(w)),
  );
  const known = (c: NaicsCode) => (industryFromNaics(c.code) ? 0 : 1);
  return found.sort((a, b) => known(a) - known(b)).slice(0, limit);
}

export { industryFromNaics };
export type { NaicsMatch } from "./naics";
