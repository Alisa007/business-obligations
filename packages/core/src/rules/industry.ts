import type { Rule } from "../types";
import { stateName } from "../states";
import { industryAuthorities, stateInfo } from "../data";

const auth = industryAuthorities;

export const industryRules: Rule[] = [
  {
    id: "industry.food-service",
    description: "Food service permits",
    inputs: ["industry", "county", "state"],
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
        description:
          "Most jurisdictions require at least one certified food protection manager and food handler cards for staff.",
        frequency: "ongoing",
        reason: "Industry is restaurant / food service",
      },
    ],
  },
  {
    id: "industry.construction",
    description: "Contractor licensing",
    inputs: ["industry", "state", "zip"],
    when: (p) => p.industry === "construction",
    items: (p) => ({
      title: auth(p.state).contractor
        ? `Obtain contractor license or registration (${stateName(p.state)})`
        : `Obtain local/trade contractor licenses (${stateName(p.state)} has no statewide general contractor license)`,
      category: "license",
      jurisdiction: auth(p.state).contractor ? "state" : "city",
      state: p.state,
      authority:
        auth(p.state).contractor ??
        `${p.city} building department and state trade boards (${stateName(p.state)})`,
      description:
        "Contractors generally need a license or registration, bonding and proof of insurance; thresholds and classifications vary.",
      frequency: "biennial",
      reason: "Industry is construction",
    }),
  },
  {
    id: "industry.construction-stormwater",
    description: "NPDES construction stormwater permit coverage",
    inputs: ["industry", "disturbedAcres", "state"],
    when: (p) => p.industry === "construction" && (p.disturbedAcres ?? 0) >= 1,
    items: (p) => ({
      title: "Obtain construction stormwater permit coverage (NPDES CGP) and prepare a SWPPP",
      category: "permit",
      jurisdiction: "state",
      state: p.state,
      authority: `EPA or the ${stateName(p.state)} NPDES stormwater authority`,
      description:
        "Construction that disturbs one acre or more, or is part of a larger common plan of development, needs coverage under the Construction General Permit (file a Notice of Intent) and a stormwater pollution prevention plan. Cities and counties may add their own grading or erosion-control permits.",
      frequency: "per_event",
      appliesWhen: [
        {
          field: "disturbedAcres",
          op: ">=",
          value: 1,
          description: "One or more acres of land disturbed",
        },
      ],
      exemptions: [
        "Sites that disturb under one acre and are not part of a larger common plan of development",
      ],
      formId: "Notice of Intent (NOI)",
      filingMethod: ["online"],
      reason: `Construction site disturbs ${p.disturbedAcres} acres (one acre or more triggers coverage)`,
      url: "https://www.epa.gov/npdes/stormwater-discharges-construction-activities",
    }),
  },
  {
    id: "industry.real-estate",
    description: "Real estate broker licensing",
    inputs: ["industry", "state"],
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
    description: "Healthcare facility licensing, NPI and HIPAA",
    inputs: ["industry", "state"],
    when: (p) => p.industry === "healthcare",
    items: (p) => [
      {
        title: `Obtain professional / facility license (${stateName(p.state)})`,
        category: "license",
        jurisdiction: "state",
        state: p.state,
        authority: auth(p.state).health,
        description:
          "Practitioners and facilities are licensed by state boards; some states restrict entity forms.",
        frequency: "biennial",
        reason: "Industry is healthcare",
      },
      {
        title: "Obtain organizational NPI and comply with HIPAA",
        category: "registration",
        jurisdiction: "federal",
        authority: "CMS / HHS",
        description:
          "National Provider Identifier for billing and HIPAA privacy/security program for covered entities.",
        frequency: "once",
        reason: "Industry is healthcare",
        url: "https://www.cms.gov/regulations-and-guidance/administrative-simplification/nationalprovidentstand",
      },
    ],
  },
  {
    id: "industry.alcohol",
    description: "State alcohol licensing",
    inputs: ["industry", "alcoholActivity", "state"],
    when: (p) => p.industry === "alcohol",
    items: (p) => ({
      title: `Obtain state alcohol ${p.alcoholActivity} license (${stateName(p.state)})`,
      category: "license",
      jurisdiction: "state",
      state: p.state,
      authority: auth(p.state).alcohol,
      description:
        "License class depends on activity (on-premise, off-premise, manufacturing, distribution); local approval is often required too.",
      frequency: "annual",
      reason: `Alcohol activity is ${p.alcoholActivity}`,
    }),
  },
  {
    id: "industry.cannabis",
    description: "State cannabis licensing and federal tax/regulatory status",
    inputs: ["industry", "cannabisActivity", "state"],
    when: (p) => p.industry === "cannabis",
    items: (p) => {
      const c = stateInfo(p.state).cannabis;
      const name = stateName(p.state);
      const licensable = c.status === "adult_use" || c.status === "medical_only";
      const first = licensable
        ? {
            title: `Obtain state cannabis ${p.cannabisActivity} license (${name})`,
            category: "license" as const,
            jurisdiction: "state" as const,
            state: p.state,
            authority: c.regulator ?? `${name} cannabis regulator`,
            description:
              c.status === "adult_use"
                ? "Adult-use and medical cannabis businesses are licensed by the state regulator, usually with local approval and caps or social-equity rules."
                : `Only the state medical program is licensed; license categories are often capped and competitive. ${c.note ?? ""}`.trim(),
            frequency: "annual" as const,
            reason: `Industry is cannabis (${p.cannabisActivity}); ${name} status is ${c.status.replace("_", " ")}`,
          }
        : {
            title: `No state licensing pathway for cannabis ${p.cannabisActivity} in ${name}`,
            category: "license" as const,
            jurisdiction: "state" as const,
            state: p.state,
            authority: `${name} attorney general / state law enforcement`,
            description: `${name} has no lawful licensed THC cannabis industry (at most limited CBD or low-THC access); commercial cannabis activity is unlawful under state law. Hemp-derived products are regulated separately by state agriculture and the FDA.`,
            frequency: "ongoing" as const,
            reason: `Industry is cannabis; ${name} status is ${c.status.replace("_", " ")}`,
          };
      return [
        first,
        {
          title: "Confirm federal controlled-substance status and tax treatment (IRC §280E)",
          category: "recordkeeping" as const,
          jurisdiction: "federal" as const,
          authority: "DEA / IRS",
          description:
            "Cannabis businesses remain subject to the federal Controlled Substances Act; while cannabis is a Schedule I or II substance, IRC §280E limits deductions for businesses trafficking in it. Banking and interstate commerce restrictions also apply.",
          frequency: "ongoing" as const,
          reason: "Industry is cannabis",
        },
      ];
    },
  },
  {
    id: "industry.childcare",
    description: "Child care facility licensing",
    inputs: ["industry", "state"],
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
    description: "USDOT registration for interstate commercial vehicles",
    inputs: ["industry", "commercialVehicles"],
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
      description:
        "Interstate operators of vehicles over 10,000 lbs, passenger vehicles over the capacity limits, or placardable hazmat carriers must register, file the MCS-150 biennial update, and carry required insurance.",
      frequency: "biennial",
      reason: "Interstate commercial vehicle operations meet the USDOT registration thresholds",
      url: "https://www.fmcsa.dot.gov/registration",
    }),
  },
];
