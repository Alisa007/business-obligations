// Per-state files of industry-scoped items; edit data/industries/*.json, then list the file here.
import DE from "../../data/industries/DE.json";
import NY from "../../data/industries/NY.json";
import type { LocalItem } from "./types";

/** Licenses, permits and registrations a state requires of particular industries, by state code. */
export const INDUSTRY_ITEMS: Record<string, LocalItem[]> = {
  DE: DE as LocalItem[],
  NY: NY as LocalItem[],
};
