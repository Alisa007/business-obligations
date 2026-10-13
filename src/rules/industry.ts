import type { Rule } from "../types.js";
import { stateName } from "../states.js";
import { INDUSTRY_AUTHORITIES } from "../data/industry.js";

const auth = (state: string) => INDUSTRY_AUTHORITIES[state]!;

export const industryRules: Rule[] = [
  {
    id: "industry.food-service",
    when: (p) => p.industry === "restaurant",
    items: (p) => [
      {
        title: "Obtain food service establishment / health permit",
        category: "permit",
        jurisdiction: "county",
        state: p.state,
        authority: `${p.county} County health department (${stateName(p.state)})`,
        description: "Plan review, inspection and operating permit for food service.",
        frequency: "annual",
        reason: "Industry is restaurant / food service",
      },
      {
        title: "Ensure certified food protection manager on staff",
        category: "license",
        jurisdiction: "state",
        state: p.state,
        authority: auth(p.state).health,
        description: "Most jurisdictions require at least one certified food protection manager and food handler cards for staff.",
        frequency: "ongoing",
        reason: "Industry is restaurant / food service",
      },
    ],
  },
  {
    id: "industry.construction",
    when: (p) => p.industry === "construction",
    items: (p) => ({
      title: auth(p.state).contractor
        ? `Obtain contractor license or registration (${stateName(p.state)})`
        : `Obtain local/trade contractor licenses (${stateName(p.state)} has no statewide general contractor license)`,
      category: "license",
      jurisdiction: auth(p.state).contractor ? "state" : "city",
      state: p.state,
      authority: auth(p.state).contractor ?? `City/county building department and state trade boards for ZIP ${p.zip}`,
      description: "Contractors generally need a license or registration, bonding and proof of insurance; thresholds and classifications vary.",
      frequency: "biennial",
      reason: "Industry is construction",
    }),
  },
  {
    id: "industry.real-estate",
    when: (p) => p.industry === "real_estate",
    items: (p) => ({
      title: `Obtain real estate broker license (${stateName(p.state)})`,
      category: "license",
      jurisdiction: "state",
      state: p.state,
      authority: auth(p.state).realEstate,
      description: "Brokerage entities need a licensed designated broker and entity registration.",
      frequency: "biennial",
      reason: "Industry is real estate",
    }),
  },
  {
    id: "industry.healthcare",
    when: (p) => p.industry === "healthcare",
    items: (p) => [
      {
        title: `Obtain professional / facility license (${stateName(p.state)})`,
        category: "license",
        jurisdiction: "state",
        state: p.state,
        authority: auth(p.state).health,
        description: "Practitioners and facilities are licensed by state boards; some states restrict entity forms.",
        frequency: "biennial",
        reason: "Industry is healthcare",
      },
      {
        title: "Obtain organizational NPI and comply with HIPAA",
        category: "registration",
        jurisdiction: "federal",
        authority: "CMS / HHS",
        description: "National Provider Identifier for billing and HIPAA privacy/security program for covered entities.",
        frequency: "once",
        reason: "Industry is healthcare",
        url: "https://nppes.cms.hhs.gov",
      },
    ],
  },
  {
    id: "industry.alcohol",
    when: (p) => p.industry === "alcohol",
    items: (p) => ({
      title: `Obtain state alcohol beverage license (${stateName(p.state)})`,
      category: "license",
      jurisdiction: "state",
      state: p.state,
      authority: auth(p.state).alcohol,
      description: "License class depends on activity (on-premise, off-premise, manufacturing, distribution); local approval is often required too.",
      frequency: "annual",
      reason: "Industry involves alcohol",
    }),
  },
  {
    id: "industry.childcare",
    when: (p) => p.industry === "childcare",
    items: (p) => ({
      title: `Obtain child care facility license (${stateName(p.state)})`,
      category: "license",
      jurisdiction: "state",
      state: p.state,
      authority: auth(p.state).childCare,
      description: "Facility licensing with background checks, staff ratios and inspections.",
      frequency: "annual",
      reason: "Industry is child care",
    }),
  },
  {
    id: "industry.transportation",
    when: (p) => {
      const v = p.commercialVehicles;
      if (p.industry !== "transportation" || !v || !v.interstate) return false;
      return (
        (v.grossWeightLbs ?? 0) >= 10_001 ||
        (v.passengerCapacity ?? 0) >= 16 ||
        ((v.passengerCapacity ?? 0) >= 9 && !!v.forHire) ||
        !!v.carriesHazmat
      );
    },
    items: () => ({
      title: "Register with FMCSA for a USDOT number",
      category: "registration",
      jurisdiction: "federal",
      authority: "FMCSA",
      description: "Interstate operators of vehicles over 10,000 lbs, passenger vehicles over the capacity limits, or placardable hazmat carriers must register, file the MCS-150 biennial update, and carry required insurance.",
      frequency: "biennial",
      reason: "Interstate commercial vehicle operations meet the USDOT registration thresholds",
      url: "https://www.fmcsa.dot.gov/registration",
    }),
  },
];
