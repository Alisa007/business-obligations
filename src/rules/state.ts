import type { ItemDraft, Rule, ResolvedProfile } from "../types.js";
import { NO_STATE_SALES_TAX, stateName } from "../states.js";

const isSeparateEntity = (p: ResolvedProfile) =>
  p.entityType !== "sole_proprietorship" && p.entityType !== "partnership";

/** Entity-level annual/periodic report where we know the specifics. */
const ANNUAL_REPORT: Record<string, { title: string; frequency: "annual" | "biennial"; deadline: string; authority: string; url?: string }> = {
  CA: { title: "File Statement of Information", frequency: "biennial", deadline: "Within the entity's anniversary month (annual for corporations)", authority: "California Secretary of State", url: "https://bizfileonline.sos.ca.gov" },
  DE: { title: "File annual franchise tax report and pay tax", frequency: "annual", deadline: "March 1 (corporations) / June 1 (LLCs, $300 tax)", authority: "Delaware Division of Corporations", url: "https://corp.delaware.gov" },
  TX: { title: "File Texas Franchise Tax report", frequency: "annual", deadline: "May 15", authority: "Texas Comptroller of Public Accounts", url: "https://comptroller.texas.gov/taxes/franchise/" },
  NY: { title: "File Biennial Statement", frequency: "biennial", deadline: "During the entity's anniversary month", authority: "New York Department of State", url: "https://dos.ny.gov/biennial-statements" },
  FL: { title: "File Annual Report", frequency: "annual", deadline: "January 1 – May 1", authority: "Florida Division of Corporations", url: "https://dos.fl.gov/sunbiz/" },
  WA: { title: "File Annual Report", frequency: "annual", deadline: "End of the entity's anniversary month", authority: "Washington Secretary of State", url: "https://ccfs.sos.wa.gov" },
  GA: { title: "File Annual Registration", frequency: "annual", deadline: "January 1 – April 1", authority: "Georgia Secretary of State", url: "https://ecorp.sos.ga.gov" },
  IL: { title: "File Annual Report", frequency: "annual", deadline: "Before the first day of the anniversary month", authority: "Illinois Secretary of State" },
  NV: { title: "File Annual List of Managers/Officers", frequency: "annual", deadline: "Last day of the anniversary month", authority: "Nevada Secretary of State", url: "https://www.nvsos.gov" },
  CO: { title: "File Periodic Report", frequency: "annual", deadline: "Within the 3-month window around the anniversary month", authority: "Colorado Secretary of State", url: "https://www.sos.state.co.us" },
};

/** Registered agent requirement — all states require one for LLCs and corporations. */
const registeredAgent = (state: string, reason: string): ItemDraft => ({
  title: `Maintain a registered agent in ${stateName(state)}`,
  category: "registration",
  jurisdiction: "state",
  state,
  authority: `${stateName(state)} Secretary of State (or equivalent)`,
  description: "A person or service with a physical address in the state to receive legal notices and service of process.",
  frequency: "ongoing",
  reason,
  needsVerification: false,
});

export const stateRules: Rule[] = [
  {
    id: "state.formation",
    when: (p) => !p.isFormed && p.entityType !== "sole_proprietorship" && p.entityType !== "partnership",
    items: (p) => ({
      title: `File formation documents in ${stateName(p.formationState)}`,
      category: "filing",
      jurisdiction: "state",
      state: p.formationState,
      authority: `${stateName(p.formationState)} Secretary of State (or equivalent)`,
      description:
        p.entityType === "llc"
          ? "Articles of Organization (Certificate of Formation / Certificate of Organization in some states)."
          : p.entityType === "nonprofit"
            ? "Articles of Incorporation for a nonprofit corporation."
            : "Articles of Incorporation (Certificate of Incorporation in some states).",
      frequency: "once",
      reason: "Entity has not been formed yet",
      needsVerification: false,
    }),
  },
  {
    id: "state.registered-agent",
    when: isSeparateEntity,
    items: (p) => registeredAgent(p.formationState, `${p.entityType} formed in ${p.formationState}`),
  },
  {
    id: "state.foreign-qualification",
    when: (p) => isSeparateEntity(p) && p.state !== p.formationState,
    items: (p) => [
      {
        title: `Register as a foreign ${p.entityType === "llc" ? "LLC" : "entity"} in ${stateName(p.state)}`,
        category: "registration",
        jurisdiction: "state",
        state: p.state,
        authority: `${stateName(p.state)} Secretary of State (or equivalent)`,
        description: "Certificate of Authority / Foreign Registration required to do business outside the formation state.",
        frequency: "once",
        reason: `Formed in ${p.formationState} but operating in ${p.state}`,
        needsVerification: false,
      },
      registeredAgent(p.state, `Foreign registration in ${p.state} requires a local registered agent`),
    ],
  },
  {
    id: "state.other-states",
    when: (p) => p.otherStates.length > 0,
    items: (p) =>
      p.otherStates.map((s) => ({
        title: `Evaluate nexus and registration in ${stateName(s)}`,
        category: "registration" as const,
        jurisdiction: "state" as const,
        state: s,
        authority: `${stateName(s)} Department of Revenue / Secretary of State`,
        description: "Employees, property or sales in another state can trigger foreign qualification, income/franchise tax, payroll and sales tax registration there.",
        frequency: "once" as const,
        reason: `Business has activity in ${s}`,
        needsVerification: true,
      })),
  },
  {
    id: "state.annual-report",
    when: (p) => isSeparateEntity(p) && p.isFormed,
    items: (p) => {
      const known = ANNUAL_REPORT[p.formationState];
      if (known) {
        return {
          title: `${known.title} (${stateName(p.formationState)})`,
          category: "filing",
          jurisdiction: "state",
          state: p.formationState,
          authority: known.authority,
          description: "Periodic entity report required to keep the entity in good standing.",
          frequency: known.frequency,
          deadline: known.deadline,
          reason: `${p.entityType} formed in ${p.formationState}`,
          needsVerification: false,
          url: known.url,
        };
      }
      return {
        title: `Check annual / periodic report requirements (${stateName(p.formationState)})`,
        category: "filing",
        jurisdiction: "state",
        state: p.formationState,
        authority: `${stateName(p.formationState)} Secretary of State (or equivalent)`,
        description: "Most states require an annual or biennial report (and sometimes a fee) to keep the entity active.",
        frequency: "annual",
        reason: `${p.entityType} formed in ${p.formationState}`,
        needsVerification: true,
      };
    },
  },
  {
    id: "state.ca-franchise-tax",
    when: (p) => p.state === "CA" && p.isFormed && (p.entityType === "llc" || p.entityType === "c_corp" || p.entityType === "s_corp"),
    items: (p) => {
      const out: ItemDraft[] = [
        {
          title: "Pay California minimum franchise tax ($800)",
          category: "payment",
          jurisdiction: "state",
          state: "CA",
          authority: "California Franchise Tax Board",
          description:
            p.entityType === "c_corp"
              ? "Minimum $800 franchise tax; S corporations pay the greater of $800 or 1.5% of net income."
              : "Annual $800 minimum tax for LLCs (Form 3522), plus Form 568 / 100 / 100S return.",
          frequency: "annual",
          deadline: "15th day of the 4th month of the tax year (estimated); return due 15th day of 3rd/4th month after year end",
          reason: "Entity is doing business in California",
          needsVerification: false,
          url: "https://www.ftb.ca.gov",
        },
      ];
      if (p.entityType === "llc" && (p.annualRevenue ?? 0) >= 250_000) {
        out.push({
          title: "Pay California LLC fee on gross receipts (Form 3536)",
          category: "payment",
          jurisdiction: "state",
          state: "CA",
          authority: "California Franchise Tax Board",
          description: "Tiered annual fee for LLCs with California-source gross receipts of $250,000 or more.",
          frequency: "annual",
          deadline: "15th day of the 6th month of the tax year",
          reason: `Annual revenue is ${p.annualRevenue}`,
          needsVerification: false,
        });
      }
      return out;
    },
  },
  {
    id: "state.sales-tax-permit",
    when: (p) => p.sellsTaxableGoods || p.industry === "retail" || p.industry === "restaurant",
    items: (p) => {
      if (NO_STATE_SALES_TAX.has(p.state)) {
        return {
          title: `Check local sales tax / business registration (${stateName(p.state)})`,
          category: "registration",
          jurisdiction: "state",
          state: p.state,
          authority: `${stateName(p.state)} revenue authority`,
          description: `${stateName(p.state)} has no statewide sales tax, but local sales taxes (e.g. AK boroughs) or other gross-receipts taxes can apply.`,
          frequency: "once",
          reason: "Business sells goods",
          needsVerification: true,
        };
      }
      return [
        {
          title: `Register for a sales tax permit (${stateName(p.state)})`,
          category: "permit",
          jurisdiction: "state",
          state: p.state,
          authority: `${stateName(p.state)} Department of Revenue`,
          description: "Seller's permit / sales and use tax registration required before making taxable sales.",
          frequency: "once",
          reason: "Business sells taxable goods",
          needsVerification: false,
        },
        {
          title: `File sales tax returns and remit tax (${stateName(p.state)})`,
          category: "payment",
          jurisdiction: "state",
          state: p.state,
          authority: `${stateName(p.state)} Department of Revenue`,
          description: "Collect sales tax from customers and remit on the filing frequency assigned by the state.",
          frequency: "monthly",
          deadline: "Monthly, quarterly or annually as assigned",
          reason: "Business sells taxable goods",
          needsVerification: false,
        },
      ];
    },
  },
  {
    id: "state.employer",
    when: (p) => p.hasEmployees,
    items: (p) => {
      const st = stateName(p.state);
      const items: ItemDraft[] = [
        {
          title: `Register for state withholding tax and unemployment insurance (${st})`,
          category: "registration",
          jurisdiction: "state",
          state: p.state,
          authority: `${st} revenue and workforce agencies`,
          description: "Employer account for state income tax withholding (where applicable) and state unemployment insurance (SUI).",
          frequency: "once",
          reason: "Business has employees",
          needsVerification: false,
        },
        {
          title: `File and pay state unemployment insurance contributions (${st})`,
          category: "payment",
          jurisdiction: "state",
          state: p.state,
          authority: `${st} workforce agency`,
          description: "Quarterly wage report and contribution payment.",
          frequency: "quarterly",
          reason: "Business has employees",
          needsVerification: false,
        },
        {
          title: `Report new hires to the state directory (${st})`,
          category: "filing",
          jurisdiction: "state",
          state: p.state,
          authority: `${st} new hire reporting center`,
          description: "Federal law requires reporting each new hire, typically within 20 days.",
          frequency: "per_event",
          reason: "Business has employees",
          needsVerification: false,
        },
        {
          title: `Carry workers' compensation insurance (${st})`,
          category: "insurance",
          jurisdiction: "state",
          state: p.state,
          authority: `${st} workers' compensation agency`,
          description:
            p.state === "TX"
              ? "Optional for most private employers in Texas, but non-subscribers lose common-law defenses."
              : "Required for most employers; thresholds vary by state.",
          frequency: "ongoing",
          reason: "Business has employees",
          needsVerification: p.state === "TX",
        },
      ];
      return items;
    },
  },
  {
    id: "state.trade-name",
    when: (p) => p.usesTradeName,
    items: (p) => ({
      title: "Register assumed name / DBA",
      category: "registration",
      jurisdiction: p.entityType === "sole_proprietorship" || p.entityType === "partnership" ? "county" : "state",
      state: p.state,
      authority:
        p.entityType === "sole_proprietorship" || p.entityType === "partnership"
          ? "County clerk (or state, varies by state)"
          : `${stateName(p.state)} Secretary of State`,
      description: "Registration of a fictitious business name used instead of the legal name.",
      frequency: "once",
      reason: "Business operates under a trade name",
      needsVerification: true,
    }),
  },
];
