import zipData from "../data/zips.json";
import type { BusinessProfile } from "./types";

interface ZipData {
  places: string[];
  counties: string[];
  states: string[];
  zips: Record<string, [number, number, number]>;
}

const data = zipData as unknown as ZipData;

export interface ZipInfo {
  zip: string;
  city: string;
  county: string;
  state: string;
}

/** Exact ZIP lookup (city, county, state) from bundled GeoNames data (CC BY 4.0). */
export function lookupZip(zip: string): ZipInfo | undefined {
  const row = data.zips[zip.slice(0, 5)];
  if (!row) return undefined;
  return {
    zip: zip.slice(0, 5),
    city: data.places[row[0]]!,
    county: data.counties[row[1]]!,
    state: data.states[row[2]]!,
  };
}

/**
 * Fills `city`, `county` and `state` from the ZIP code, so callers can pass only a ZIP.
 * Explicit values win. Throws when the ZIP is unknown and a value is missing.
 */
export function withZip(
  profile: Omit<BusinessProfile, "city" | "county" | "zip"> &
    Required<Pick<BusinessProfile, "zip">> &
    Partial<Pick<BusinessProfile, "city" | "county">>,
): BusinessProfile {
  const info = lookupZip(profile.zip);
  if (!info && (!profile.city || !profile.county)) {
    throw new Error(`Unknown ZIP code "${profile.zip}"; provide city and county explicitly`);
  }
  return {
    ...profile,
    city: profile.city ?? info!.city,
    county: profile.county ?? info!.county,
    state: profile.state ?? info?.state,
  };
}
