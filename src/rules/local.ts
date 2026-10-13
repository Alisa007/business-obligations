import type { Rule, ResolvedProfile } from "../types";
import { LOCAL_JURISDICTIONS, stateInfo } from "../data";
import { isCorpLike, isUnincorporated } from "../entity";

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\bcity of\b/, "")
    .replace(/\bsaint\b/, "st.")
    .trim();

function jurisdictionFor(p: ResolvedProfile) {
  return LOCAL_JURISDICTIONS.find(
    (j) =>
      j.state === p.state &&
      (norm(j.city) === norm(p.city) ||
        (j.counties ?? []).some((c) => norm(c) === norm(p.county) && norm(j.city) === norm(p.city))),
  );
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
        authority: `${s.local.authority}: ${p.city} / ${p.county} County (ZIP ${p.zip})`,
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
    inputs: ["homeBased", "industry", "city", "county"],
    when: (p) => !p.homeBased && p.industry !== "transportation",
    items: (p) => ({
      title: `Obtain certificate of occupancy for premises in ${p.city}`,
      category: "permit",
      jurisdiction: "city",
      state: p.state,
      authority: `${p.city} (${p.county} County) building department`,
      description: "The commercial space must be approved for its intended use before operating.",
      frequency: "once",
      reason: "Business operates from commercial premises",
    }),
  },
  {
    id: "local.seeded-city",
    description: "City-specific licences and taxes for seeded cities (see data/local.json)",
    inputs: ["state", "city", "county", "employeeCount", "sellsTaxableGoods", "entityType"],
    when: (p) => jurisdictionFor(p) !== undefined,
    items: (p) => {
      const j = jurisdictionFor(p)!;
      return j.items
        .filter((it) =>
          it.appliesTo.some(
            (tag) =>
              tag === "all" ||
              (tag === "employees" && p.hasEmployees) ||
              (tag === "sells_goods" &&
                (p.sellsTaxableGoods || p.industry === "retail" || p.industry === "restaurant")) ||
              (tag === "corporation" &&
                (isCorpLike(p) || p.taxTreatment === "c_corp" || p.taxTreatment === "s_corp")) ||
              (tag === "unincorporated" && isUnincorporated(p)),
          ),
        )
        .map((it) => ({
          title: it.title,
          category: it.category,
          jurisdiction: "city" as const,
          state: p.state,
          authority: it.authority,
          description: it.description,
          frequency: it.frequency,
          deadline: it.deadline,
          due: it.due,
          url: it.url,
          reason: `Business is located in ${j.city}, ${j.state}`,
        }));
    },
  },
];
