import places from "./data/places.json";
import type { ComplianceItem } from "./types";

/** Two-digit FIPS codes of the states and DC. */
export const STATE_FIPS: Readonly<Record<string, string>> = {
  AL: "01",
  AK: "02",
  AZ: "04",
  AR: "05",
  CA: "06",
  CO: "08",
  CT: "09",
  DE: "10",
  DC: "11",
  FL: "12",
  GA: "13",
  HI: "15",
  ID: "16",
  IL: "17",
  IN: "18",
  IA: "19",
  KS: "20",
  KY: "21",
  LA: "22",
  ME: "23",
  MD: "24",
  MA: "25",
  MI: "26",
  MN: "27",
  MS: "28",
  MO: "29",
  MT: "30",
  NE: "31",
  NV: "32",
  NH: "33",
  NJ: "34",
  NM: "35",
  NY: "36",
  NC: "37",
  ND: "38",
  OH: "39",
  OK: "40",
  OR: "41",
  PA: "42",
  RI: "44",
  SC: "45",
  SD: "46",
  TN: "47",
  TX: "48",
  UT: "49",
  VT: "50",
  VA: "51",
  WA: "53",
  WV: "54",
  WI: "55",
  WY: "56",
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Drops the generic suffix of a county name ("Travis County" and "Travis" are the same county). */
const countySlug = (s: string) =>
  slug(
    s
      .replace(/\s+(county|parish|borough|census area|municipality|city and borough)$/i, "")
      .replace(/\s+county$/i, ""),
  );

type PlaceTable = Record<string, { c: Record<string, string>; p: Record<string, string> }>;
const PLACES = places as PlaceTable;

/** Stable id for the jurisdiction an item belongs to. City and county names come from the evaluated profile. */
export function jurisdictionId(
  item: Pick<ComplianceItem, "jurisdiction" | "state">,
  place: { city: string; county: string },
): string {
  if (item.jurisdiction === "federal" || !item.state) return "US";
  const base = `US-${item.state}`;
  if (item.jurisdiction === "county") return `${base}/county/${countySlug(place.county)}`;
  if (item.jurisdiction === "city") return `${base}/city/${slug(place.city)}`;
  return base;
}

/** Census FIPS code (and incorporated status for cities) for a county or city item, when it is known. */
export function placeFacts(
  item: Pick<ComplianceItem, "jurisdiction" | "state">,
  place: { city: string; county: string },
): { fips: string; incorporated?: boolean } | undefined {
  const st = item.state;
  const fp = st ? STATE_FIPS[st] : undefined;
  const table = st ? PLACES[st] : undefined;
  if (!fp || !table) return undefined;
  if (item.jurisdiction === "county") {
    const code = table.c[countySlug(place.county)];
    return code ? { fips: fp + code } : undefined;
  }
  if (item.jurisdiction === "city") {
    const code = table.p[slug(place.city)];
    return code ? { fips: fp + code.slice(0, 5), incorporated: code.endsWith("i") } : undefined;
  }
  return undefined;
}
