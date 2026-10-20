import type { ItemDraft, ResolvedProfile, Rule } from "../types";
import { stateInfo as info } from "../data";
import { isSeparateEntity, isCorpLike } from "../entity";
import { salesStates } from "./state";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const label = (iso: string) =>
  `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8))}, ${iso.slice(0, 4)}`;

/** ISO date `months` months after the month of `iso`, on `day` (or the last day of that month). */
function plusMonths(iso: string, months: number, day: number | "end"): string {
  const idx = Number(iso.slice(0, 4)) * 12 + (Number(iso.slice(5, 7)) - 1) + months;
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${pad(m)}-${pad(day === "end" ? lastDay(y, m) : Math.min(day, lastDay(y, m)))}`;
}

function plusDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const dated = (date: string) => ({ due: { type: "date" as const, date }, deadline: label(date) });

const when = (p: ResolvedProfile) => p.dissolutionDate !== undefined;
const dissolving = (p: ResolvedProfile) => p.dissolutionDate!;

/** Where the entity is registered to do business besides its formation state. */
const foreignStates = (p: ResolvedProfile): string[] => [
  ...new Set(
    p.presence
      .filter((x) => !x.home && (x.employeeCount > 0 || x.hasProperty))
      .map((x) => x.state)
      .filter((s) => s !== p.formationState),
  ),
];

export const dissolutionRules: Rule[] = [
  {
    id: "dissolution.state-filing",
    description: "Dissolution or cancellation filing in the formation state",
    inputs: ["dissolutionDate", "entityType", "formationState"],
    when: (p) => when(p) && isSeparateEntity(p),
    items: (p) => {
      const s = info(p.formationState);
      const what =
        p.entityType === "lp"
          ? "certificate of cancellation of the limited partnership"
          : p.entityType === "llp"
            ? "statement of withdrawal or cancellation of the LLP registration"
            : isCorpLike(p)
              ? "articles of dissolution (after board and shareholder approval)"
              : "certificate or articles of dissolution (or cancellation) of the entity";
      return {
        title: `File ${what} in ${s.name}`,
        category: "filing",
        jurisdiction: "state",
        state: p.formationState,
        authority: s.filing.name,
        description: `Ends the entity's existence in ${s.name}. Settle debts and distribute remaining assets in the order the statute requires; some states require tax clearance or final reports first.`,
        frequency: "once",
        reason: `Business is being dissolved (${dissolving(p)})`,
        url: s.filing.url,
      };
    },
  },
  {
    id: "dissolution.foreign-withdrawal",
    description: "Withdraw foreign registrations in other states",
    inputs: ["dissolutionDate", "multistate", "formationState"],
    when: (p) => when(p) && isSeparateEntity(p) && foreignStates(p).length > 0,
    items: (p) =>
      foreignStates(p).map((code) => {
        const s = info(code);
        return {
          title: `Withdraw the foreign registration in ${s.name}`,
          category: "filing" as const,
          jurisdiction: "state" as const,
          state: code,
          authority: s.filing.name,
          description: `File a certificate or application of withdrawal so ${s.name} stops expecting annual reports and fees; final returns for the state's tax accounts come first.`,
          frequency: "once" as const,
          reason: `Entity is registered in ${code} and is being dissolved`,
          url: s.filing.url,
        };
      }),
  },
  {
    id: "dissolution.state-tax-closeout",
    description: "Final state returns and closing state tax accounts in each operating state",
    inputs: ["dissolutionDate", "employeeCount", "sellsTaxableGoods", "multistate"],
    when: when,
    items: (p) => {
      const salesIn = new Set(salesStates(p).map(({ x }) => x.state));
      const states = p.presence.filter((x) => x.home || x.employeeCount > 0 || x.hasProperty);
      return states.map((x): ItemDraft => {
        const s = info(x.state);
        const parts = ["file the final entity-level tax return"];
        if (salesIn.has(x.state)) parts.push("file a final sales tax return and cancel the sales tax permit");
        if (x.employeeCount > 0 || (x.home && p.hasEmployees)) {
          parts.push(`file the final unemployment wage report with ${s.labor.name} and close the account`);
          if (s.wageWithholding) parts.push("file the final withholding return and annual reconciliation");
        }
        return {
          title: `Close ${s.name} state tax accounts`,
          category: "filing",
          jurisdiction: "state",
          state: x.state,
          authority: s.revenue.name,
          description: `With ${s.revenue.name}: ${parts.join("; ")}. Closing an account before final returns are filed can leave the owners liable for later notices.`,
          frequency: "once",
          reason: `Business is being dissolved (${dissolving(p)}) and has ${x.home ? "its principal place of business" : "employees or property"} in ${x.state}`,
          url: s.revenue.url,
        };
      });
    },
  },
  {
    id: "dissolution.local-closeout",
    description: "Cancel local licenses, home occupation permit and trade name",
    inputs: ["dissolutionDate", "usesTradeName", "city", "county"],
    when: when,
    items: (p) => {
      const s = info(p.state);
      const items: ItemDraft[] = [
        {
          title: `Close the local business license and permits in ${p.city}`,
          category: "filing",
          jurisdiction: "city",
          state: p.state,
          authority: `${s.local.authority}: ${p.city} / ${p.county} County`,
          description:
            "Notify the licensing authority that the business has closed and cancel licenses and permits so renewals and local tax filings stop.",
          frequency: "once",
          reason: `Business is being dissolved (${dissolving(p)})`,
          url: s.local.url,
        },
      ];
      if (p.usesTradeName && s.dbaFiling !== "none") {
        items.push({
          title: `Cancel the trade name (DBA) registration in ${s.name}`,
          category: "filing",
          jurisdiction: s.dbaFiling === "state" ? "state" : "county",
          state: p.state,
          authority: s.dbaFiling === "state" ? s.filing.name : (s.dbaOffice ?? `${p.county} County clerk`),
          description:
            "Withdraw or abandon the assumed name so it is available and no longer attached to the entity.",
          frequency: "once",
          reason: "Business operates under a trade name and is being dissolved",
          url: s.links.dba,
        });
      }
      return items;
    },
  },
  {
    id: "dissolution.fed-final-return",
    description: "Final federal income tax return",
    inputs: ["dissolutionDate", "entityType", "llcTaxClassification"],
    when: when,
    items: (p) => {
      const end = dissolving(p);
      const treatment = p.taxTreatment;
      const [form, date] =
        treatment === "sole_prop"
          ? ["Form 1040 with Schedule C (mark the business closed)", `${Number(end.slice(0, 4)) + 1}-04-15`]
          : treatment === "partnership"
            ? ["Form 1065 (mark as final return and final K-1s)", plusMonths(end, 3, 15)]
            : treatment === "s_corp"
              ? ["Form 1120-S (mark as final return and final K-1s)", plusMonths(end, 3, 15)]
              : treatment === "nonprofit"
                ? ["Form 990 (mark as final return)", plusMonths(end, 5, 15)]
                : ["Form 1120 (mark as final return)", plusMonths(end, 4, 15)];
      return {
        title: `File the final federal income tax return (${form})`,
        category: "filing",
        jurisdiction: "federal",
        authority: "IRS",
        description:
          "The tax year ends on the date the business is dissolved or ceases operations. Report the final year, dispose of assets (Form 8594 or 4797 where applicable) and mark the return as final.",
        frequency: "once",
        ...dated(date),
        reason: `Business is being dissolved (${end})`,
        url: ["https://www.irs.gov/businesses/small-businesses-self-employed/closing-a-business"],
      };
    },
  },
  {
    id: "dissolution.fed-form-966",
    description: "Form 966 for corporations adopting a plan to dissolve",
    inputs: ["dissolutionDate", "entityType", "llcTaxClassification"],
    when: (p) =>
      when(p) && (p.taxTreatment === "c_corp" || p.taxTreatment === "s_corp") && isSeparateEntity(p),
    items: (p) => ({
      title: "File IRS Form 966 (corporate dissolution or liquidation)",
      category: "filing",
      jurisdiction: "federal",
      authority: "IRS",
      description:
        "A corporation files Form 966 within 30 days after its board or shareholders adopt the resolution or plan to dissolve; the date input is treated as the adoption date.",
      frequency: "once",
      ...dated(plusDays(dissolving(p), 30)),
      reason: `Business taxed as a corporation is being dissolved (${dissolving(p)})`,
      url: ["https://www.irs.gov/forms-pubs/about-form-966"],
    }),
  },
  {
    id: "dissolution.fed-final-payroll",
    description: "Final payroll returns, W-2s and Form 940/941",
    inputs: ["dissolutionDate", "employeeCount"],
    when: (p) => when(p) && p.hasEmployees,
    items: (p) => {
      const end = dissolving(p);
      const reason = `Business has employees and is being dissolved (${end})`;
      const quarterEnd = plusMonths(end, (3 - (((Number(end.slice(5, 7)) - 1) % 3) + 1)) % 3, "end");
      return [
        {
          title: "File final Form 941 (employment tax) and deposit remaining payroll taxes",
          category: "filing" as const,
          jurisdiction: "federal" as const,
          authority: "IRS",
          description:
            "Mark the final-return box and give the date final wages were paid; deposit any remaining payroll taxes on the usual schedule.",
          frequency: "once" as const,
          ...dated(plusMonths(quarterEnd, 1, "end")),
          reason,
          url: ["https://www.irs.gov/businesses/small-businesses-self-employed/employment-tax-due-dates"],
        },
        {
          title: "File final Form 940 (federal unemployment tax)",
          category: "filing" as const,
          jurisdiction: "federal" as const,
          authority: "IRS",
          description: "Due by the last day of the month after the month final wages are paid.",
          frequency: "once" as const,
          ...dated(plusMonths(end, 1, "end")),
          reason,
          url: ["https://www.irs.gov/forms-pubs/about-form-940"],
        },
        {
          title: "Give employees final W-2s and file Forms W-2 and W-3",
          category: "filing" as const,
          jurisdiction: "federal" as const,
          authority: "IRS / Social Security Administration",
          description:
            "Furnish W-2s to employees within 30 days after final wages (or by the usual January 31 deadline if sooner) and file with the SSA.",
          frequency: "once" as const,
          ...dated(plusDays(end, 30)),
          reason,
          url: ["https://www.irs.gov/forms-pubs/about-form-w-2"],
        },
      ];
    },
  },
  {
    id: "dissolution.fed-close-account",
    description: "Close the IRS business account and keep records",
    inputs: ["dissolutionDate"],
    when: when,
    items: (p) => [
      {
        title: "Close the IRS business account",
        category: "filing" as const,
        jurisdiction: "federal" as const,
        authority: "IRS",
        description:
          "After the final returns are filed and taxes paid, send the IRS a letter with the legal name, EIN and address asking to close the business account. The EIN itself is never reused.",
        frequency: "once" as const,
        reason: `Business is being dissolved (${dissolving(p)})`,
        url: ["https://www.irs.gov/businesses/small-businesses-self-employed/closing-a-business"],
      },
      {
        title: "Keep business and employment tax records after closing",
        category: "recordkeeping" as const,
        jurisdiction: "federal" as const,
        authority: "IRS",
        description:
          "Keep employment tax records at least 4 years after the tax is due or paid, and other business tax records for at least 3 years after the final return (7 years where losses or bad debt were claimed).",
        frequency: "ongoing" as const,
        reason: `Business is being dissolved (${dissolving(p)})`,
        url: ["https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records"],
      },
    ],
  },
];
