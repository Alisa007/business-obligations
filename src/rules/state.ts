import type { ItemDraft, Rule, ResolvedProfile } from "../types.js";
import { STATES } from "../data/states.js";
import type { ReportRule } from "../data/types.js";

const isSeparateEntity = (p: ResolvedProfile) =>
  p.entityType !== "sole_proprietorship" && p.entityType !== "partnership";

const info = (code: string) => {
  const s = STATES[code];
  if (!s) throw new Error(`No state data for ${code}`);
  return s;
};

const registeredAgent = (state: string, reason: string): ItemDraft => {
  const s = info(state);
  return {
    title: `Maintain a registered agent in ${s.name}`,
    category: "registration",
    jurisdiction: "state",
    state,
    authority: s.filing.name,
    description: `A person or service with a physical ${s.name} address to receive legal notices and service of process; listed with ${s.filing.name}.`,
    frequency: "ongoing",
    reason,
    needsVerification: false,
    url: s.filing.url,
  };
};

function reportFor(p: ResolvedProfile): ReportRule | null {
  const s = info(p.formationState);
  return p.entityType === "llc" ? s.llcReport : s.corpReport;
}

export const stateRules: Rule[] = [
  {
    id: "state.formation",
    when: (p) => !p.isFormed && isSeparateEntity(p),
    items: (p) => {
      const s = info(p.formationState);
      return {
        title: `File formation documents with the ${s.filing.name}`,
        category: "filing",
        jurisdiction: "state",
        state: p.formationState,
        authority: s.filing.name,
        description:
          p.entityType === "llc"
            ? "Articles of Organization (Certificate of Formation/Organization in some states)."
            : p.entityType === "nonprofit"
              ? "Articles of Incorporation for a nonprofit corporation."
              : "Articles of Incorporation (Certificate of Incorporation in some states).",
        frequency: "once",
        reason: "Entity has not been formed yet",
        needsVerification: false,
        url: s.filing.url,
      };
    },
  },
  {
    id: "state.registered-agent",
    when: isSeparateEntity,
    items: (p) => registeredAgent(p.formationState, `${p.entityType} formed in ${p.formationState}`),
  },
  {
    id: "state.llc-publication",
    when: (p) => p.entityType === "llc" && !!info(p.formationState).llcPublication,
    items: (p) => ({
      title: `LLC publication requirement (${info(p.formationState).name})`,
      category: "filing",
      jurisdiction: "state",
      state: p.formationState,
      authority: info(p.formationState).filing.name,
      description: info(p.formationState).llcPublication!,
      frequency: "once",
      reason: `LLC formed in ${p.formationState}`,
      needsVerification: false,
    }),
  },
  {
    id: "state.foreign-qualification",
    when: (p) => isSeparateEntity(p) && p.state !== p.formationState,
    items: (p) => {
      const s = info(p.state);
      return [
        {
          title: `Register as a foreign ${p.entityType === "llc" ? "LLC" : "entity"} in ${s.name}`,
          category: "registration",
          jurisdiction: "state",
          state: p.state,
          authority: s.filing.name,
          description: "Certificate of Authority / Foreign Registration, with a certificate of good standing from the formation state, required to do business here.",
          frequency: "once",
          reason: `Formed in ${p.formationState} but operating in ${p.state}`,
          needsVerification: false,
          url: s.filing.url,
        },
        registeredAgent(p.state, `Foreign registration in ${p.state} requires a local registered agent`),
      ];
    },
  },
  {
    id: "state.other-states",
    when: (p) => p.otherStates.length > 0,
    items: (p) =>
      p.otherStates.map((code) => {
        const s = info(code);
        return {
          title: `Evaluate nexus and registration in ${s.name}`,
          category: "registration" as const,
          jurisdiction: "state" as const,
          state: code,
          authority: `${s.revenue.name} / ${s.filing.name}`,
          description: `Employees, property or sales in ${s.name} can trigger foreign qualification (${s.filing.name}), ${s.entityTax.toLowerCase()}, payroll registration and sales tax collection there.`,
          frequency: "once" as const,
          reason: `Business has activity in ${code}`,
          needsVerification: true,
          url: s.revenue.url,
        };
      }),
  },
  {
    id: "state.annual-report",
    when: (p) => isSeparateEntity(p) && p.isFormed && reportFor(p) !== null,
    items: (p) => {
      const s = info(p.formationState);
      const r = reportFor(p)!;
      return {
        title: `${r.title ?? (r.frequency === "annual" ? "File Annual Report" : "File Biennial Report")} (${s.name})`,
        category: "filing",
        jurisdiction: "state",
        state: p.formationState,
        authority: s.filing.name,
        description: `Fee: ${r.fee}. Required to keep the entity in good standing.`,
        frequency: r.frequency,
        deadline: r.deadline,
        reason: `${p.entityType} formed in ${p.formationState}`,
        needsVerification: false,
        url: s.filing.url,
      };
    },
  },
  {
    id: "state.entity-tax",
    when: (p) => p.isFormed && p.entityType !== "sole_proprietorship",
    items: (p) => {
      const s = info(p.state);
      return {
        title: `Register for and file ${s.name} entity-level taxes`,
        category: "filing",
        jurisdiction: "state",
        state: p.state,
        authority: s.revenue.name,
        description: `${s.entityTax}.`,
        frequency: "annual",
        reason: `${p.entityType} operating in ${p.state}`,
        needsVerification: false,
        url: s.revenue.url,
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
    id: "state.business-license",
    when: (p) => !!info(p.state).businessLicense,
    items: (p) => {
      const s = info(p.state);
      const l = s.businessLicense!;
      return {
        title: l.title,
        category: "license",
        jurisdiction: "state",
        state: p.state,
        authority: l.authority,
        description: `Fee: ${l.fee}. General state license required to operate in ${s.name}.`,
        frequency: l.renewal === "once" ? "once" : l.renewal,
        reason: `${s.name} requires a general state business license`,
        needsVerification: false,
        url: s.revenue.url,
      };
    },
  },
  {
    id: "state.sales-tax",
    when: (p) => p.sellsTaxableGoods || p.industry === "retail" || p.industry === "restaurant",
    items: (p) => {
      const s = info(p.state);
      const agency = s.salesTax.agency ?? s.revenue;
      if (!s.salesTax.statewide) {
        return {
          title: `${s.salesTax.permit} (${s.name})`,
          category: "registration",
          jurisdiction: "state",
          state: p.state,
          authority: agency.name,
          description: s.salesTax.alternative ?? "",
          frequency: "once",
          reason: "Business sells goods",
          needsVerification: false,
          url: agency.url,
        };
      }
      return [
        {
          title: `${s.salesTax.permit} (${s.name})`,
          category: "permit",
          jurisdiction: "state",
          state: p.state,
          authority: agency.name,
          description: "Required before making taxable sales; register with the state tax agency.",
          frequency: "once",
          reason: "Business sells taxable goods",
          needsVerification: false,
          url: agency.url,
        },
        {
          title: `File sales tax returns and remit tax (${s.name})`,
          category: "payment",
          jurisdiction: "state",
          state: p.state,
          authority: agency.name,
          description: "Collect sales tax from customers and remit on the filing frequency assigned by the state.",
          frequency: "monthly",
          deadline: "Monthly, quarterly or annually as assigned",
          reason: "Business sells taxable goods",
          needsVerification: false,
          url: agency.url,
        },
      ];
    },
  },
  {
    id: "state.employer",
    when: (p) => p.hasEmployees,
    items: (p) => {
      const s = info(p.state);
      const items: ItemDraft[] = [
        {
          title: `Register for unemployment insurance (${s.name})`,
          category: "registration",
          jurisdiction: "state",
          state: p.state,
          authority: s.labor.name,
          description: "Employer account for state unemployment insurance contributions.",
          frequency: "once",
          reason: "Business has employees",
          needsVerification: false,
          url: s.labor.url,
        },
        {
          title: `File wage reports and pay unemployment insurance contributions (${s.name})`,
          category: "payment",
          jurisdiction: "state",
          state: p.state,
          authority: s.labor.name,
          description: "Quarterly wage report and contribution payment.",
          frequency: "quarterly",
          reason: "Business has employees",
          needsVerification: false,
          url: s.labor.url,
        },
        {
          title: `Report new hires to the ${s.name} new hire directory`,
          category: "filing",
          jurisdiction: "state",
          state: p.state,
          authority: `${s.name} new hire reporting center`,
          description: "Federal law requires reporting each new hire within 20 days of hire (some states require sooner).",
          frequency: "per_event",
          reason: "Business has employees",
          needsVerification: false,
          url: "https://www.acf.hhs.gov/css/employers",
        },
        {
          title: `Carry workers' compensation insurance (${s.name})`,
          category: "insurance",
          jurisdiction: "state",
          state: p.state,
          authority: s.workersComp.agency,
          description: s.workersComp.stateFund
            ? `Coverage must be purchased from the exclusive state fund. Required at: ${s.workersComp.threshold}.`
            : `Required at: ${s.workersComp.threshold}.`,
          frequency: "ongoing",
          reason: "Business has employees",
          needsVerification: p.state === "TX",
        },
      ];
      if (s.wageWithholding) {
        items.splice(1, 0, {
          title: `Register for state income tax withholding (${s.name})`,
          category: "registration",
          jurisdiction: "state",
          state: p.state,
          authority: s.revenue.name,
          description: "Withhold state income tax from wages and remit on the assigned deposit schedule; file annual reconciliation and W-2s.",
          frequency: "once",
          reason: `${s.name} levies income tax on wages`,
          needsVerification: false,
          url: s.revenue.url,
        });
      }
      if (s.paidLeave) {
        items.push({
          title: s.paidLeave.title,
          category: "payment",
          jurisdiction: "state",
          state: p.state,
          authority: s.paidLeave.agency,
          description: s.paidLeave.description,
          frequency: "quarterly",
          reason: `${s.name} has a mandatory paid leave/disability program`,
          needsVerification: false,
        });
      }
      return items;
    },
  },
  {
    id: "state.trade-name",
    when: (p) => p.usesTradeName,
    items: (p) => {
      const s = info(p.state);
      const personal = p.entityType === "sole_proprietorship" || p.entityType === "partnership";
      return {
        title: "Register assumed name / DBA",
        category: "registration",
        jurisdiction: personal ? "county" : "state",
        state: p.state,
        authority: personal ? `County clerk (or ${s.filing.name}, depending on ${s.name} rules)` : s.filing.name,
        description: "Registration of a fictitious business name used instead of the legal name.",
        frequency: "once",
        reason: "Business operates under a trade name",
        needsVerification: personal,
        url: s.filing.url,
      };
    },
  },
];
