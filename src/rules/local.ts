import type { Rule } from "../types.js";
import { STATES } from "../data/states.js";

export const localRules: Rule[] = [
  {
    id: "local.business-license",
    when: () => true,
    items: (p) => {
      const s = STATES[p.state]!;
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
    when: (p) => p.homeBased,
    items: (p) => ({
      title: `Obtain home occupation permit from ${p.city} planning/zoning`,
      category: "permit",
      jurisdiction: "city",
      state: p.state,
      authority: `${p.city} (${p.county} County) planning/zoning department`,
      description: "Home-based businesses need a home occupation permit and must comply with zoning limits (signage, customers, employees).",
      frequency: "once",
      reason: "Business is home-based",
    }),
  },
  {
    id: "local.certificate-of-occupancy",
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
];
