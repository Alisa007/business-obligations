import type { Rule } from "../types.js";
import { STATES } from "../data/states.js";

export const localRules: Rule[] = [
  {
    id: "local.business-license",
    when: () => true,
    items: (p) => {
      const l = STATES[p.state]!.local;
      return {
        title: `${l.title} (${STATES[p.state]!.name})`,
        category: "license",
        jurisdiction: "city",
        state: p.state,
        authority: `${l.authority} for ZIP ${p.zip}`,
        description: l.description,
        frequency: "annual",
        reason: "Business operates at a physical location",
        needsVerification: true,
      };
    },
  },
  {
    id: "local.home-occupation",
    when: (p) => p.homeBased,
    items: (p) => ({
      title: "Obtain home occupation permit / confirm zoning",
      category: "permit",
      jurisdiction: "city",
      state: p.state,
      authority: `City or county planning/zoning department for ZIP ${p.zip}`,
      description: "Home-based businesses may need a home occupation permit and must comply with zoning limits (signage, customers, employees).",
      frequency: "once",
      reason: "Business is home-based",
      needsVerification: true,
    }),
  },
  {
    id: "local.certificate-of-occupancy",
    when: (p) => !p.homeBased && p.industry !== "transportation",
    items: (p) => ({
      title: "Confirm certificate of occupancy and zoning for premises",
      category: "permit",
      jurisdiction: "city",
      state: p.state,
      authority: `City or county building department for ZIP ${p.zip}`,
      description: "The commercial space must be approved for its intended use.",
      frequency: "once",
      reason: "Business operates from commercial premises",
      needsVerification: true,
    }),
  },
];
