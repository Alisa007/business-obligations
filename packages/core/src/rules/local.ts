import { allHold } from "../applicability";
import { feeCost } from "../fee";
import { resolveSchedule } from "../rrule";
import type { Rule } from "../types";
import { findCity, findCounty, stateInfo, type CityLookup, type CountyLookup } from "../data";
import type { LocalItem } from "../data/types";
import type { ResolvedProfile } from "../types";
import { isCorpLike, isUnincorporated } from "../entity";

/**
 * The seed items that apply to this business: one of the item's `appliesTo` tags matches the profile, and every
 * `appliesWhen` condition holds (for example `activities in ["lodging"]` keeps a lodging tax from showing for a shop).
 */
export function applicable(items: LocalItem[], p: ResolvedProfile): LocalItem[] {
  return items
    .filter((it) => !it.naics || it.naics.some((prefix) => p.naics?.startsWith(prefix)))
    .filter((it) => allHold(it.appliesWhen, p))
    .filter((it) =>
      it.appliesTo.some(
        (tag) =>
          tag === "all" ||
          (tag === "employees" && p.hasEmployees) ||
          (tag === "sells_goods" &&
            (p.sellsTaxableGoods || p.industry === "retail" || p.industry === "restaurant")) ||
          (tag === "corporation" &&
            (isCorpLike(p) || p.taxTreatment === "c_corp" || p.taxTreatment === "s_corp")) ||
          (tag === "unincorporated" && isUnincorporated(p)) ||
          (tag === "trade_name" && p.usesTradeName),
      ),
    );
}

/** Optional fields a seed item may carry beyond the common ones, copied onto the emitted item when present. */
export function extras(it: LocalItem, entryCheckedOn: string | undefined) {
  const checkedOn = it.checkedOn ?? entryCheckedOn;
  return {
    ...(it.appliesWhen ? { appliesWhen: it.appliesWhen } : {}),
    ...(it.exemptions ? { exemptions: it.exemptions } : {}),
    ...(it.supersedes ? { supersedes: it.supersedes } : {}),
    ...(it.preemptedBy ? { preemptedBy: it.preemptedBy } : {}),
    ...(it.formId ? { formId: it.formId } : {}),
    ...(it.filingMethod ? { filingMethod: it.filingMethod } : {}),
    ...(it.processingTime ? { processingTime: it.processingTime } : {}),
    ...(it.renewal ? { renewal: it.renewal } : {}),
    ...feeCost(it),
    // A seed entry carries the date it was checked against the official pages; the items inherit it.
    ...(checkedOn
      ? {
          provenance: {
            confidence: "checked" as const,
            checkedOn,
            sources: it.url ? [it.url] : [],
          },
        }
      : {}),
  };
}

const INPUTS = ["state", "employeeCount", "sellsTaxableGoods", "entityType", "usesTradeName"] as const;

/**
 * A rule that emits city-specific items from city seeds. The bundled rule uses the bundled seeds; pass your own
 * list (`seededCityRule(indexCities(seeds), "my.cities")`) to add cities without bundling them.
 */
export function seededCityRule(lookup: CityLookup, id = "local.seeded-city"): Rule {
  return {
    id,
    description: "City-specific licences and taxes for seeded cities (see data/cities/)",
    inputs: [...INPUTS, "city"],
    when: (p) => (lookup(p.state, p.city, p.county)?.items.length ?? 0) > 0,
    items: (p) => {
      const j = lookup(p.state, p.city, p.county)!;
      return applicable(j.items, p).map((it) => ({
        title: it.title,
        category: it.category,
        jurisdiction: "city" as const,
        state: p.state,
        authority: it.authority,
        description: it.description,
        ...resolveSchedule(it),
        url: it.url,
        ...extras(it, j.checkedOn),
        reason: `Business is located in ${j.city}, ${j.state}`,
      }));
    },
  };
}

/**
 * A rule that emits county-level items from county seeds (for example business personal property returns filed
 * with the county assessor). Pass your own list with `seededCountyRule(indexCounties(seeds), "my.counties")`.
 */
export function seededCountyRule(lookup: CountyLookup, id = "local.seeded-county"): Rule {
  return {
    id,
    description: "County-level filings and licences for seeded counties (see data/counties/)",
    inputs: [...INPUTS, "county"],
    when: (p) => (lookup(p.state, p.county)?.items.length ?? 0) > 0,
    items: (p) => {
      const j = lookup(p.state, p.county)!;
      return applicable(j.items, p).map((it) => ({
        title: it.title,
        category: it.category,
        jurisdiction: "county" as const,
        state: p.state,
        authority: it.authority,
        description: it.description,
        ...resolveSchedule(it),
        url: it.url,
        ...extras(it, j.checkedOn),
        reason: `Business is located in ${j.county} County, ${j.state}`,
      }));
    },
  };
}

export const localRules: Rule[] = [
  {
    id: "local.business-license",
    description: "General local business license for the state's licensing regime",
    inputs: ["state", "city", "county", "zip"],
    when: () => true,
    items: (p) => {
      const s = stateInfo(p.state);
      return {
        title: `${s.local.title} — ${p.city}, ${p.county} County, ${s.name}`,
        category: "license",
        jurisdiction: "city",
        state: p.state,
        authority: `${s.local.authority}: ${p.city} / ${p.county} County${p.zip ? ` (ZIP ${p.zip})` : ""}`,
        description: s.local.description,
        frequency: "annual",
        reason: `Business is located in ${p.city}, ${p.state}`,
      };
    },
  },
  {
    id: "local.home-occupation",
    description: "Home occupation permit",
    inputs: ["homeBased", "city", "county"],
    when: (p) => p.homeBased,
    items: (p) => ({
      title: `Obtain home occupation permit from ${p.city} planning/zoning`,
      category: "permit",
      jurisdiction: "city",
      state: p.state,
      authority: `${p.city} (${p.county} County) planning/zoning department`,
      description:
        "Home-based businesses need a home occupation permit and must comply with zoning limits (signage, customers, employees).",
      frequency: "once",
      reason: "Business is home-based",
    }),
  },
  {
    id: "local.certificate-of-occupancy",
    description: "Certificate of occupancy for commercial premises",
    inputs: ["homeBased", "industry", "city", "county", "floorAreaSqFt"],
    when: (p) => !p.homeBased && p.industry !== "transportation",
    items: (p) => ({
      title: `Obtain certificate of occupancy for premises in ${p.city}`,
      category: "permit",
      jurisdiction: "city",
      state: p.state,
      authority: `${p.city} (${p.county} County) building department`,
      description: "The commercial space must be approved for its intended use before operating.",
      frequency: "once",
      appliesWhen: [
        { field: "homeBased", op: "==", value: false, description: "Operates from commercial premises" },
      ],
      exemptions: [
        "Home-based businesses, which are usually covered by home-occupation rules instead",
        "Transportation businesses without a fixed premises",
      ],
      reason: p.floorAreaSqFt
        ? `Business operates from ${p.floorAreaSqFt} sq ft of commercial premises`
        : "Business operates from commercial premises",
    }),
  },
  /* @__PURE__ */ seededCityRule(findCity),
  /* @__PURE__ */ seededCountyRule(findCounty),
];

/** City permits triggered by premises facts rather than by seeded city data. */
export const premisesRules: Rule[] = [
  {
    id: "local.sign-permit",
    description: "Sign permit for exterior signage",
    inputs: ["hasSignage", "city", "state"],
    when: (p) => p.hasSignage === true,
    items: (p) => ({
      title: "Obtain a sign permit before installing exterior signage",
      category: "permit",
      jurisdiction: "city",
      state: p.state,
      authority: `${p.city} planning or building department`,
      description:
        "Most cities require a permit for permanent exterior signs and regulate size, illumination and placement; landlords and zoning overlays may add rules.",
      frequency: "once",
      appliesWhen: [{ field: "hasSignage", op: "==", value: true, description: "Displays exterior signage" }],
      reason: "Business displays exterior signage",
    }),
  },
];
