import type { Rule } from "../types.js";
import { stateName } from "../states.js";

export const localRules: Rule[] = [
  {
    id: "local.business-license",
    when: () => true,
    items: (p) => ({
      title: "Obtain local general business license / tax registration",
      category: "license",
      jurisdiction: "city",
      state: p.state,
      authority: `City or county government for ZIP ${p.zip} (${stateName(p.state)})`,
      description: "Most cities and counties require a general business license or tax certificate to operate within their limits.",
      frequency: "annual",
      reason: "Business operates at a physical location",
      needsVerification: true,
    }),
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
