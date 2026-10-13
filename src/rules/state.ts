import type { ItemDraft, Presence, ResolvedProfile, Rule } from "../types";
import { stateInfo as info } from "../data";
import type { ReportRule } from "../data/types";
import { isLlcLike, isLlcSubtype, isProfessionalEntity, isSeparateEntity } from "../entity";

/** Employees or property in the state. */
const physical = (x: Presence) => x.home || x.employeeCount > 0 || x.hasProperty;

/** States where the entity physically operates, home state first. */
const operating = (p: ResolvedProfile) => p.presence.filter(physical);

/** States where the entity must be registered: formation state plus every operating state. */
const registeredIn = (p: ResolvedProfile): string[] => [
  ...new Set([p.formationState, ...operating(p).map((x) => x.state)]),
];

const reportFor = (p: ResolvedProfile, state: string): ReportRule | null => {
  const s = info(state);
  if (isLlcLike(p)) {
    if (
      s.llcReport === null &&
      s.llcReportAppliesWhenTaxedAsCorp &&
      p.taxTreatment !== "sole_prop" &&
      p.taxTreatment !== "partnership"
    )
      return s.corpReport;
    return s.llcReport;
  }
  return s.corpReport;
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
    url: s.filing.url,
  };
};

function employerItems(x: Presence, p: ResolvedProfile): ItemDraft[] {
  const s = info(x.state);
  const n = x.employeeCount;
  const reason = `${n} employee${n === 1 ? "" : "s"} in ${s.name}`;
  const items: ItemDraft[] = [
    {
      title: `Register for unemployment insurance (${s.name})`,
      category: "registration",
      jurisdiction: "state",
      state: x.state,
      authority: s.labor.name,
      description: "Employer account for state unemployment insurance contributions.",
      frequency: "once",
      reason,
      url: s.labor.url,
    },
    {
      title: `File wage reports and pay unemployment insurance contributions (${s.name})`,
      category: "payment",
      jurisdiction: "state",
      state: x.state,
      authority: s.labor.name,
      description: "Quarterly wage report and contribution payment.",
      frequency: "quarterly",
      reason,
      url: s.labor.url,
    },
    {
      title: `Report new hires to the ${s.name} new hire directory`,
      category: "filing",
      jurisdiction: "state",
      state: x.state,
      authority: `${s.name} new hire reporting center`,
      description:
        "Federal law requires reporting each new hire within 20 days of hire (some states require sooner).",
      frequency: "per_event",
      reason,
      url: "https://www.acf.hhs.gov/css/employers",
    },
  ];
  if (s.wageWithholding) {
    items.splice(1, 0, {
      title: `Register for state income tax withholding (${s.name})`,
      category: "registration",
      jurisdiction: "state",
      state: x.state,
      authority: s.revenue.name,
      description:
        "Withhold state income tax from wages and remit on the assigned deposit schedule; file annual reconciliation and W-2s.",
      frequency: "once",
      reason: `${s.name} levies income tax on wages; ${reason}`,
      url: s.revenue.url,
    });
  }

  const wc = s.workersComp.trigger;
  const payroll = x.home ? p.annualPayroll : 0;
  const minEmployees =
    p.industry === "construction" && wc.constructionMinEmployees
      ? wc.constructionMinEmployees
      : wc.minEmployees;
  const wcRequired =
    (n >= minEmployees && (wc.andAnnualPayrollOver === undefined || payroll > wc.andAnnualPayrollOver)) ||
    (wc.orAnnualPayroll !== undefined && x.home && payroll >= wc.orAnnualPayroll);
  if (wcRequired) {
    items.push({
      title: wc.elective
        ? `Decide whether to subscribe to workers' compensation insurance (${s.name}; elective)`
        : `Carry workers' compensation insurance (${s.name})`,
      category: "insurance",
      jurisdiction: "state",
      state: x.state,
      authority: s.workersComp.agency,
      description: wc.elective
        ? `Coverage is optional for most private employers; non-subscribers lose common-law defenses in injury suits. Rule: ${s.workersComp.threshold}.`
        : s.workersComp.stateFund
          ? `Coverage must be purchased from the exclusive state fund. Required at: ${s.workersComp.threshold}.`
          : `Required at: ${s.workersComp.threshold}.`,
      frequency: "ongoing",
      reason: `${reason} meets the ${s.name} threshold (${s.workersComp.threshold})`,
    });
  }

  if (s.paidLeave && n >= s.paidLeave.minEmployees) {
    items.push({
      title: s.paidLeave.title,
      category: "payment",
      jurisdiction: "state",
      state: x.state,
      authority: s.paidLeave.agency,
      description: s.paidLeave.description,
      frequency: "quarterly",
      reason: `${s.name} has a mandatory paid leave/disability program; ${reason}`,
    });
  }
  return items;
}

export const stateRules: Rule[] = [
  {
    id: "state.formation",
    description: "Formation filing for entities not yet formed",
    inputs: ["isFormed", "entityType", "formationState"],
    when: (p) => !p.isFormed && isSeparateEntity(p),
    items: (p) => {
      const s = info(p.formationState);
      return {
        title: `File formation documents with the ${s.filing.name}`,
        category: "filing",
        jurisdiction: "state",
        state: p.formationState,
        authority: s.filing.name,
        description: isLlcSubtype(p)
          ? "Articles of Organization (Certificate of Formation/Organization in some states)."
          : p.entityType === "lp"
            ? "Certificate of Limited Partnership."
            : p.entityType === "llp"
              ? "Statement/Certificate of Limited Liability Partnership registration."
              : p.entityType === "nonprofit"
                ? "Articles of Incorporation for a nonprofit corporation."
                : p.entityType === "benefit_corp"
                  ? "Articles of Incorporation stating benefit corporation status."
                  : p.entityType === "pc"
                    ? "Articles of Incorporation for a professional corporation."
                    : "Articles of Incorporation (Certificate of Incorporation in some states).",
        frequency: "once",
        reason: "Entity has not been formed yet",
        url: s.filing.url,
      };
    },
  },
  {
    id: "state.registered-agent",
    description: "Registered agent in the formation state and each operating state",
    inputs: ["entityType", "formationState", "multistate"],
    when: isSeparateEntity,
    items: (p) =>
      registeredIn(p).map((code) =>
        registeredAgent(
          code,
          code === p.formationState
            ? `${p.entityType} formed in ${code}`
            : `Foreign registration in ${code} requires a local registered agent`,
        ),
      ),
  },
  {
    id: "state.foreign-qualification",
    description: "Foreign registration where the entity operates outside its formation state",
    inputs: ["entityType", "formationState", "multistate"],
    when: (p) => isSeparateEntity(p) && registeredIn(p).some((c) => c !== p.formationState),
    items: (p) =>
      registeredIn(p)
        .filter((c) => c !== p.formationState)
        .map((code) => {
          const s = info(code);
          return {
            title: `Register as a foreign ${isLlcLike(p) ? "LLC" : "entity"} in ${s.name}`,
            category: "registration" as const,
            jurisdiction: "state" as const,
            state: code,
            authority: s.filing.name,
            description:
              "Certificate of Authority / Foreign Registration, with a certificate of good standing from the formation state, required to do business here.",
            frequency: "once" as const,
            reason: `Formed in ${p.formationState} with employees or property in ${code}`,
            url: s.filing.url,
          };
        }),
  },
  {
    id: "state.llc-publication",
    description: "Post-formation newspaper publication for LLCs",
    inputs: ["entityType", "formationState"],
    when: (p) => isLlcSubtype(p) && !!info(p.formationState).llcPublication,
    items: (p) => ({
      title: `LLC publication requirement (${info(p.formationState).name})`,
      category: "filing",
      jurisdiction: "state",
      state: p.formationState,
      authority: info(p.formationState).filing.name,
      description: info(p.formationState).llcPublication!,
      frequency: "once",
      reason: `LLC formed in ${p.formationState}`,
    }),
  },
  {
    id: "state.annual-report",
    description: "Annual or biennial entity report with fee and deadline",
    inputs: ["entityType", "formationState", "isFormed", "multistate", "formationDate"],
    when: (p) => isSeparateEntity(p) && p.isFormed && registeredIn(p).some((c) => reportFor(p, c) !== null),
    items: (p) =>
      registeredIn(p)
        .filter((c) => reportFor(p, c) !== null)
        .map((code) => {
          const s = info(code);
          const r = reportFor(p, code)!;
          const foreign = code !== p.formationState;
          return {
            title: `${r.title ?? (r.frequency === "annual" ? "File Annual Report" : "File Biennial Report")} (${s.name}${foreign ? ", foreign entity" : ""})`,
            category: "filing" as const,
            jurisdiction: "state" as const,
            state: code,
            authority: s.filing.name,
            description: `Fee: ${r.fee}. Required to keep the entity in good standing.`,
            frequency: r.frequency,
            deadline: r.deadline,
            due: r.due,
            reason: foreign
              ? `Registered as a foreign ${p.entityType} in ${code}`
              : `${p.entityType} formed in ${code}`,
            url: s.filing.url,
          };
        }),
  },
  {
    id: "state.entity-tax",
    description: "Entity-level income, franchise or gross-receipts taxes",
    inputs: ["entityType", "isFormed", "multistate"],
    when: (p) => p.isFormed && p.entityType !== "sole_proprietorship",
    items: (p) =>
      operating(p).map((x) => {
        const s = info(x.state);
        return {
          title: `Register for and file ${s.name} entity-level taxes`,
          category: "filing" as const,
          jurisdiction: "state" as const,
          state: x.state,
          authority: s.revenue.name,
          description: `${s.entityTax}.`,
          frequency: "annual" as const,
          reason: `${p.entityType} with ${x.home ? "its principal place of business" : "employees or property"} in ${x.state}`,
          url: s.revenue.url,
        };
      }),
  },
  {
    id: "state.ca-franchise-tax",
    description: "California minimum franchise tax and LLC fee",
    inputs: ["entityType", "state", "annualRevenue"],
    when: (p) =>
      p.isFormed &&
      operating(p).some((x) => x.state === "CA") &&
      (isLlcSubtype(p) ||
        p.entityType === "c_corp" ||
        p.entityType === "s_corp" ||
        p.entityType === "pc" ||
        p.entityType === "benefit_corp" ||
        p.entityType === "pllc"),
    items: (p) => {
      const out: ItemDraft[] = [
        {
          title: "Pay California minimum franchise tax ($800)",
          category: "payment",
          jurisdiction: "state",
          state: "CA",
          authority: "California Franchise Tax Board",
          description:
            p.taxTreatment === "c_corp"
              ? "Minimum $800 franchise tax; S corporations pay the greater of $800 or 1.5% of net income."
              : "Annual $800 minimum tax for LLCs (Form 3522), plus Form 568 / 100 / 100S return.",
          frequency: "annual",
          deadline:
            "15th day of the 4th month of the tax year (estimated); return due 15th day of 3rd/4th month after year end",
          reason: "Entity is doing business in California",
          url: "https://www.ftb.ca.gov",
        },
      ];
      if (isLlcSubtype(p) && p.annualRevenue >= 250_000) {
        out.push({
          title: "Pay California LLC fee on gross receipts (Form 3536)",
          category: "payment",
          jurisdiction: "state",
          state: "CA",
          authority: "California Franchise Tax Board",
          description:
            "Tiered annual fee for LLCs with California-source gross receipts of $250,000 or more.",
          frequency: "annual",
          deadline: "15th day of the 6th month of the tax year",
          reason: `Annual revenue is ${p.annualRevenue}`,
          url: "https://www.ftb.ca.gov",
        });
      }
      return out;
    },
  },
  {
    id: "state.business-license",
    description: "General state business license",
    inputs: ["state", "multistate"],
    when: (p) => operating(p).some((x) => !!info(x.state).businessLicense),
    items: (p) =>
      operating(p)
        .filter((x) => !!info(x.state).businessLicense)
        .map((x) => {
          const s = info(x.state);
          const l = s.businessLicense!;
          return {
            title: l.title,
            category: "license" as const,
            jurisdiction: "state" as const,
            state: x.state,
            authority: l.authority,
            description: `Fee: ${l.fee}. General state license required to operate in ${s.name}.`,
            frequency: l.renewal,
            reason: `${s.name} requires a general state business license`,
            url: s.revenue.url,
          };
        }),
  },
  {
    id: "state.sales-tax",
    description: "Sales tax registration and returns, including economic nexus",
    inputs: ["sellsTaxableGoods", "industry", "multistate"],
    when: (p) => salesStates(p).length > 0,
    items: (p) =>
      salesStates(p).flatMap(({ x, reason }): ItemDraft[] => {
        const s = info(x.state);
        const agency = s.salesTax.agency ?? s.revenue;
        if (!s.salesTax.statewide) {
          return [
            {
              title: `${s.salesTax.permit} (${s.name})`,
              category: "registration" as const,
              jurisdiction: "state" as const,
              state: x.state,
              authority: agency.name,
              description: s.salesTax.alternative ?? "",
              frequency: "once" as const,
              reason,
              url: agency.url,
            },
          ];
        }
        return [
          {
            title: `${s.salesTax.permit} (${s.name})`,
            category: "permit" as const,
            jurisdiction: "state" as const,
            state: x.state,
            authority: agency.name,
            description: "Required before making taxable sales; register with the state tax agency.",
            frequency: "once" as const,
            reason,
            url: agency.url,
          },
          {
            title: `File sales tax returns and remit tax (${s.name})`,
            category: "payment" as const,
            jurisdiction: "state" as const,
            state: x.state,
            authority: agency.name,
            description:
              "Collect sales tax from customers and remit on the filing frequency assigned by the state.",
            frequency: "monthly" as const,
            deadline: "Monthly, quarterly or annually as assigned by the state",
            reason,
            url: agency.url,
          },
        ];
      }),
  },
  {
    id: "state.employer",
    description: "Unemployment insurance, withholding, new hires, workers' comp and paid leave",
    inputs: ["employeeCount", "annualPayroll", "industry", "multistate"],
    when: (p) => p.presence.some((x) => x.employeeCount > 0),
    items: (p) => p.presence.filter((x) => x.employeeCount > 0).flatMap((x) => employerItems(x, p)),
  },
  {
    id: "state.trade-name",
    description: "Assumed name / DBA registration",
    inputs: ["usesTradeName", "state", "county", "city"],
    when: (p) => p.usesTradeName && info(p.state).dbaFiling !== "none",
    items: (p) => {
      const s = info(p.state);
      const where = info(p.state).dbaFiling;
      const authority =
        where === "state"
          ? s.filing.name
          : where === "county"
            ? `${p.county} County clerk (${s.name})`
            : `${p.city} town/city clerk (${s.name})`;
      return {
        title: `Register assumed name / DBA with the ${authority}`,
        category: "registration",
        jurisdiction: where === "state" ? "state" : where === "county" ? "county" : "city",
        state: p.state,
        authority,
        description: `${s.name} registers assumed names at the ${where} level.`,
        frequency: "once",
        reason: "Business operates under a trade name",
        url: where === "state" ? s.filing.url : undefined,
      };
    },
  },
];

/** Presence entries that must register to collect sales tax, with the reason. */
function salesStates(p: ResolvedProfile): Array<{ x: Presence; reason: string }> {
  const out: Array<{ x: Presence; reason: string }> = [];
  for (const x of p.presence) {
    if (x.home) {
      if (p.sellsTaxableGoods || p.industry === "retail" || p.industry === "restaurant")
        out.push({ x, reason: "Business sells taxable goods" });
      continue;
    }
    const threshold = info(x.state).economicNexusUsd;
    const sales = x.salesUsd ?? 0;
    if (physical(x) && p.sellsTaxableGoods) {
      out.push({ x, reason: `Physical presence in ${x.state} and the business sells taxable goods` });
    } else if (threshold !== null && sales >= threshold) {
      out.push({
        x,
        reason: `Sales of ${sales} into ${x.state} meet its economic nexus threshold of ${threshold}`,
      });
    } else if (threshold === null && sales > 0) {
      // No statewide sales tax; nothing to register for.
    }
  }
  return out;
}

export const extraStateRules: Rule[] = [
  {
    id: "state.paid-sick-leave",
    description: "Statewide paid sick leave mandates",
    inputs: ["employeeCount", "multistate"],
    when: (p) => p.presence.some((x) => x.employeeCount > 0 && info(x.state).paidSickLeave !== null),
    items: (p) =>
      p.presence
        .filter(
          (x) =>
            x.employeeCount > 0 &&
            info(x.state).paidSickLeave &&
            x.employeeCount >= info(x.state).paidSickLeave!.minEmployees,
        )
        .map((x) => ({
          title: `Provide paid sick leave (${info(x.state).name})`,
          category: "recordkeeping" as const,
          jurisdiction: "state" as const,
          state: x.state,
          authority: info(x.state).labor.name,
          description: `${info(x.state).name} requires employers with ${info(x.state).paidSickLeave!.minEmployees}+ employees to provide paid sick leave, post notice and keep records.`,
          frequency: "ongoing" as const,
          reason: `${x.employeeCount} employees in ${x.state}, at or above the state's ${info(x.state).paidSickLeave!.minEmployees}-employee threshold`,
        })),
  },
  {
    id: "state.labor-posters",
    description: "State workplace notices",
    inputs: ["employeeCount", "multistate"],
    when: (p) => p.presence.some((x) => x.employeeCount > 0),
    items: (p) =>
      p.presence
        .filter((x) => x.employeeCount > 0)
        .map((x) => ({
          title: `Display required ${info(x.state).name} workplace notices`,
          category: "recordkeeping" as const,
          jurisdiction: "state" as const,
          state: x.state,
          authority: info(x.state).labor.name,
          description:
            "State minimum wage, unemployment insurance, workers' compensation and anti-discrimination notices must be posted where employees can see them.",
          frequency: "ongoing" as const,
          reason: `${x.employeeCount} employees in ${x.state}`,
          url: info(x.state).labor.url,
        })),
  },
  {
    id: "state.professional-entity",
    description: "Professional entity licensing and board registration",
    inputs: ["entityType", "profession", "formationState"],
    when: (p) => isProfessionalEntity(p) && p.isFormed,
    items: (p) => {
      const s = info(p.formationState);
      return {
        title: `Register the ${p.entityType === "pc" ? "professional corporation" : p.entityType === "llp" ? "LLP" : "PLLC"} with its licensing board${p.profession ? ` (${p.profession})` : ""}`,
        category: "license",
        jurisdiction: "state",
        state: p.formationState,
        authority: `${s.name} licensing board for the profession (certificate of registration or authority) and ${s.filing.name}`,
        description:
          "Professional entities must be owned by licensees and generally need a board-issued certificate of authorization, renewed periodically, in addition to the state filing.",
        frequency: "biennial",
        reason: `Entity type ${p.entityType} is a professional entity`,
        url: s.filing.url,
      };
    },
  },
  {
    id: "state.benefit-report",
    description: "Annual benefit report for benefit corporations",
    inputs: ["entityType"],
    when: (p) => p.entityType === "benefit_corp" && p.isFormed,
    items: (p) => ({
      title: "Prepare and distribute annual benefit report",
      category: "filing",
      jurisdiction: "state",
      state: p.formationState,
      authority: info(p.formationState).filing.name,
      description:
        "Benefit corporations deliver an annual report assessing their public benefit performance against a third-party standard to shareholders and, in many states, file it with the state.",
      frequency: "annual",
      reason: "Entity is a benefit corporation",
      url: info(p.formationState).filing.url,
    }),
  },
];
