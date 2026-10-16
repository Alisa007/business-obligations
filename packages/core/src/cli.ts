#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import {
  analyzeInputs,
  buildCalendar,
  planLaunch,
  estimateCosts,
  evaluate,
  listChanges,
  listRules,
  toICS,
  InvalidProfileError,
  type BusinessProfile,
  type ComplianceItem,
} from "./index";
import pkg from "../package.json";
import { todayIso } from "./iso";
import { withZip } from "./zip-entry";

const HELP = `business-obligations: US business compliance items from a business profile

Usage:
  business-obligations <command> [profile.json | -] [options]

Commands:
  evaluate    List compliance items (default)
  calendar    Dated deadlines in a window (--from, --to, --ics <file>)
  costs       Estimate annual and one-time government fees
  analyze     Show defaulted inputs and what would change the result
  changes     List dated rule changes (--state XX, --upcoming)
  launch      Ordered plan for opening a new business (--start, --opening)
  rules       List rules and the inputs they read

Profile (JSON file, "-" for stdin, or flags):
  --zip 78701 --entity llc [--city X --county Y] [--employees N] [--payroll USD]

Options:
  --as-of YYYY-MM-DD   Evaluation date (default: today)
  --json               Machine-readable output
  --channel online|paper   Fee channel for costs
  -v, --version
  -h, --help
`;

interface Args {
  command: string;
  positional: string[];
  flags: Record<string, string | true>;
}

function parseArgs(argv: string[]): Args {
  const commands = ["evaluate", "calendar", "costs", "analyze", "changes", "launch", "rules"];
  const flags: Args["flags"] = {};
  const positional: string[] = [];
  const boolean = new Set(["json", "help", "h", "version", "v", "upcoming"]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-") positional.push(a);
    else if (a.startsWith("-")) {
      const key = a.replace(/^-+/, "");
      if (boolean.has(key)) flags[key] = true;
      else flags[key] = argv[++i] ?? "";
    } else positional.push(a);
  }
  const command = positional[0] && commands.includes(positional[0]) ? positional.shift()! : "evaluate";
  return { command, positional, flags };
}

function loadProfile(args: Args): BusinessProfile {
  const source = args.positional[0];
  if (source) {
    const text = source === "-" ? readFileSync(0, "utf8") : readFileSync(source, "utf8");
    return JSON.parse(text) as BusinessProfile;
  }
  const f = args.flags;
  if (typeof f.zip !== "string" || typeof f.entity !== "string") {
    throw new Error("Provide a profile file, or --zip and --entity");
  }
  const num = (k: string) => (typeof f[k] === "string" ? Number(f[k]) : undefined);
  const profile: BusinessProfile = {
    entityType: f.entity as BusinessProfile["entityType"],
    zip: f.zip,
    city: typeof f.city === "string" ? f.city : undefined,
    county: typeof f.county === "string" ? f.county : undefined,
    employeeCount: num("employees"),
    annualPayroll: num("payroll"),
  } as BusinessProfile;
  for (const k of Object.keys(profile) as Array<keyof BusinessProfile>)
    if (profile[k] === undefined) delete profile[k];
  return profile;
}

/** Fills city, county and state from the ZIP when the profile omits them. */
const resolveLocation = (p: BusinessProfile): BusinessProfile =>
  p.city && p.county ? p : withZip(p as Parameters<typeof withZip>[0]);

const money = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

function printItems(items: ComplianceItem[]): string {
  const order = ["federal", "state", "county", "city"] as const;
  const out: string[] = [];
  for (const j of order) {
    const group = items.filter((i) => i.jurisdiction === j);
    if (!group.length) continue;
    out.push(`\n${j.toUpperCase()} (${group.length})`);
    for (const i of group) {
      const bits = [i.frequency, i.nextDue ? `next due ${i.nextDue}` : i.deadline].filter(Boolean).join(", ");
      const fee = i.cost?.amount !== undefined ? `, fee ${money(i.cost.amount)}` : "";
      out.push(`  - ${i.title}\n      ${i.authority} [${bits}${fee}]`);
    }
  }
  return out.join("\n");
}

function run(argv: string[]): number {
  const args = parseArgs(argv);
  if (args.flags.help || args.flags.h) {
    console.log(HELP);
    return 0;
  }
  if (args.flags.version || args.flags.v) {
    console.log(pkg.version);
    return 0;
  }
  const asOf = typeof args.flags["as-of"] === "string" ? args.flags["as-of"] : undefined;
  const json = args.flags.json === true;
  const emit = (value: unknown, text: () => string) =>
    console.log(json ? JSON.stringify(value, null, 2) : text());

  if (args.command === "rules") {
    const rules = listRules();
    emit(rules, () =>
      rules.map((r) => `${r.id}\n  ${r.description}\n  inputs: ${r.inputs.join(", ")}`).join("\n"),
    );
    return 0;
  }
  if (args.command === "changes") {
    const state = typeof args.flags.state === "string" ? args.flags.state.toUpperCase() : undefined;
    const from = args.flags.upcoming ? (asOf ?? todayIso()) : undefined;
    const changes = listChanges({ state, from });
    emit(
      changes,
      () =>
        changes
          .map((c) => `${c.effective} [${c.status}] ${c.scope.state ?? "US"}: ${c.summary}`)
          .join("\n") || "No changes.",
    );
    return 0;
  }

  const profile = resolveLocation(loadProfile(args));
  switch (args.command) {
    case "launch": {
      const opening = typeof args.flags.opening === "string" ? args.flags.opening : undefined;
      const start = typeof args.flags.start === "string" ? args.flags.start : asOf;
      const plan = planLaunch(profile, { startDate: start, openingDate: opening });
      emit(plan, () => {
        const lines: string[] = [
          `Plan from ${plan.startDate}: formation filing ${plan.formationDate}, ready to operate ${plan.readyDate}`,
        ];
        if (plan.onTrack !== undefined)
          lines.push(
            plan.onTrack
              ? `Opening ${plan.openingDate}: on track (${plan.slackDays} days of slack)`
              : `Opening ${plan.openingDate}: ${-plan.slackDays!} days too late at these allowances`,
          );
        for (const ph of plan.phases) {
          lines.push(`\n${ph.title.toUpperCase()}  ${ph.start}${ph.end ? ` -> ${ph.end}` : " onward"}`);
          for (const s of ph.steps) {
            const due = s.legalDeadline ? `  [legal due ${s.legalDeadline}]` : "";
            const when = ph.id === "operate" ? (s.target ? ` (first due ${s.target})` : "") : "";
            lines.push(`  ${String(s.order).padStart(2)}. ${s.item.title}${when}${due}`);
          }
        }
        lines.push(
          `\nGovernment fees: ${money(plan.costs.oneTime)} one-time, ${money(plan.costs.annual)} per year (known amounts only)`,
        );
        return lines.join("\n");
      });
      return 0;
    }
    case "calendar": {
      const from = typeof args.flags.from === "string" ? args.flags.from : asOf;
      const to = typeof args.flags.to === "string" ? args.flags.to : undefined;
      const { events } = buildCalendar(profile, { from, to });
      if (typeof args.flags.ics === "string") {
        writeFileSync(args.flags.ics, toICS(events));
        console.error(`Wrote ${events.length} events to ${args.flags.ics}`);
        return 0;
      }
      emit(
        events,
        () => events.map((e) => `${e.date}  ${e.title} (${e.authority})`).join("\n") || "No events.",
      );
      return 0;
    }
    case "costs": {
      const result = evaluate(profile, { asOf });
      const channel =
        args.flags.channel === "online" || args.flags.channel === "paper" ? args.flags.channel : undefined;
      const est = estimateCosts(result.items, {
        profile: result.profile,
        ownerCount: result.profile.ownerCount,
        channel,
      });
      emit(est, () =>
        [
          ...est.lines.map(
            (l) =>
              `${money(l.perYear || l.amount).padStart(10)}  ${l.title}${l.estimate ? " (estimate)" : ""}`,
          ),
          `\nAnnual: ${money(est.annual)}   One-time: ${money(est.oneTime)}`,
          ...(est.unknown.length ? [`${est.unknown.length} item(s) with fees that cannot be totalled`] : []),
        ].join("\n"),
      );
      return 0;
    }
    case "analyze": {
      const a = analyzeInputs(profile, { asOf });
      emit(a, () =>
        [
          "Defaulted inputs:",
          ...a.defaultsUsed.map(
            (d) =>
              `  ${d.field} = ${JSON.stringify(d.value)}${d.affectsResult ? "  (changes the result)" : ""}`,
          ),
          "\nWhat would change the result:",
          ...a.sensitivity.map(
            (s) =>
              `  ${s.field} (now ${JSON.stringify(s.current)}): ` +
              s.changes
                .map((c) => `${JSON.stringify(c.value)} -> +${c.added.length}/-${c.removed.length}`)
                .join(", "),
          ),
        ].join("\n"),
      );
      return 0;
    }
    default: {
      const result = evaluate(profile, { asOf });
      emit(result, () => `${printItems(result.items)}\n\n${result.disclaimer}`);
      return 0;
    }
  }
}

try {
  process.exitCode = run(process.argv.slice(2));
} catch (e) {
  const message = e instanceof InvalidProfileError || e instanceof Error ? e.message : String(e);
  console.error(`error: ${message}`);
  process.exitCode = 1;
}
