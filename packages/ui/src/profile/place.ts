import { industryFromNaics, type BusinessProfile } from "business-obligations";
import { DETAIL_FIELDS, NUMBER_FIELDS, type ProfileChoices } from "./choices";

/** Where a ZIP code is, as the engine wants it. */
export interface Place {
  city: string;
  county: string;
  state: string;
}

let zipModule: Promise<typeof import("business-obligations/zip")> | undefined;
/** Looks a ZIP code up. The table of ZIP codes is a separate bundle, loaded on first use. */
export async function lookupPlace(zip: string): Promise<Place | undefined> {
  zipModule ??= import("business-obligations/zip");
  const info = (await zipModule).lookupZip(zip);
  return info ? { city: info.city, county: info.county, state: info.state } : undefined;
}

/** Whether the profession question applies to these choices. */
export const needsProfession = (choices: Pick<ProfileChoices, "entityType" | "naics">): boolean =>
  ["pllc", "pc", "llp"].includes(choices.entityType ?? "") ||
  industryFromNaics(choices.naics)?.industry === "professional_services";

/**
 * The `BusinessProfile` for these choices in `place`. Questions not answered are left out, so the engine treats them
 * as unknown. The engine needs a business type: none chosen is taken as an LLC, the most common one.
 */
export function profileFromChoices(choices: ProfileChoices, place: Place): BusinessProfile {
  const entityType = choices.entityType ?? "llc";
  const profile: Record<string, unknown> = {
    entityType,
    zip: choices.zip,
    city: place.city,
    county: place.county,
    state: place.state,
    naics: choices.naics.length >= 2 ? choices.naics : undefined,
    profession: needsProfession({ entityType, naics: choices.naics })
      ? (choices.profession ?? "other")
      : undefined,
    // only LLCs have a tax classification to choose
    llcTaxClassification: ["llc", "pllc"].includes(entityType) ? choices.llcTaxClassification : undefined,
    formationDate: choices.isFormed ? choices.formationDate || undefined : undefined,
  };
  for (const field of [...NUMBER_FIELDS, ...DETAIL_FIELDS]) profile[field] = choices[field];
  // The engine refuses these, so they are left out as not given (the form shows what is wrong).
  if (
    choices.fullTimeEmployeeCount !== undefined &&
    choices.employeeCount !== undefined &&
    choices.fullTimeEmployeeCount > choices.employeeCount
  )
    delete profile.fullTimeEmployeeCount;
  if (choices.ownerCount !== undefined && choices.ownerCount < 1) delete profile.ownerCount;
  for (const [key, value] of Object.entries(profile))
    if (value === undefined || value === "") delete profile[key];
  return profile as unknown as BusinessProfile;
}
