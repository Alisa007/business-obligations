// Per-state files of industry-scoped items; edit data/industries/*.json, then list the file here.
import CA from "../../data/industries/CA.json";
import DE from "../../data/industries/DE.json";
import FL from "../../data/industries/FL.json";
import IL from "../../data/industries/IL.json";
import MI from "../../data/industries/MI.json";
import NY from "../../data/industries/NY.json";
import ND from "../../data/industries/ND.json";
import TX from "../../data/industries/TX.json";
import type { LocalItem } from "./types";

/** Licenses, permits and registrations a state requires of particular industries, by state code. */
export const INDUSTRY_ITEMS: Record<string, LocalItem[]> = {
  CA: CA as LocalItem[],
  DE: DE as LocalItem[],
  FL: FL as LocalItem[],
  IL: IL as LocalItem[],
  MI: MI as LocalItem[],
  NY: NY as LocalItem[],
  ND: ND as LocalItem[],
  TX: TX as LocalItem[],
};
