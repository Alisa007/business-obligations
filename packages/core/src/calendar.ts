import { BUNDLED_CHANGES } from "./changes";
import { isIsoDate } from "./iso";
import { evaluate, InvalidProfileError, type EvaluateOptions } from "./engine";
import { occurrencesBetween } from "./dates";
import type { BusinessProfile, ComplianceItem } from "./types";
import type { ComplianceResult } from "./engine";

export interface CalendarEvent {
  /** Due date, YYYY-MM-DD. */
  date: string;
  itemId: string;
  title: string;
  authority: string;
  state?: string;
  jurisdiction: ComplianceItem["jurisdiction"];
  category: ComplianceItem["category"];
  frequency: ComplianceItem["frequency"];
  /** Human-readable deadline text from the rule. */
  deadline?: string;
  cost?: ComplianceItem["cost"];
  penalty?: ComplianceItem["penalty"];
  url?: string;
}

export interface CalendarOptions extends Omit<EvaluateOptions, "asOf"> {
  /** First day of the window (YYYY-MM-DD). Defaults to today (UTC). */
  from?: string;
  /** Last day of the window (YYYY-MM-DD), inclusive. Defaults to one year after `from`. */
  to?: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function toEvent(item: ComplianceItem, date: string): CalendarEvent {
  return {
    date,
    itemId: item.id,
    title: item.title,
    authority: item.authority,
    ...(item.state ? { state: item.state } : {}),
    jurisdiction: item.jurisdiction,
    category: item.category,
    frequency: item.frequency,
    ...(item.deadline ? { deadline: item.deadline } : {}),
    ...(item.cost ? { cost: item.cost } : {}),
    ...(item.penalty ? { penalty: item.penalty } : {}),
    ...(item.url ? { url: item.url } : {}),
  };
}

/**
 * Expands a profile's items with a machine-readable due date into dated events within a window.
 * Items without a due rule (for example monthly deposits "15th of the following month") are not included.
 * Rules that change inside the window (enacted, patched changes) are re-evaluated at each effective date.
 */
export function buildCalendar(
  input: BusinessProfile,
  options: CalendarOptions = {},
): { events: CalendarEvent[]; result: ComplianceResult } {
  const from = options.from ?? today();
  if (!isIsoDate(from)) throw new InvalidProfileError("`from` must be YYYY-MM-DD");
  const to = options.to ?? addDays(from, 365);
  if (!isIsoDate(to)) throw new InvalidProfileError("`to` must be YYYY-MM-DD");
  if (to < from) throw new InvalidProfileError("`to` must not be before `from`");
  const evalOptions: EvaluateOptions = {
    rules: options.rules,
    changes: options.changes,
    recentDays: options.recentDays,
  };
  const first = evaluate(input, { ...evalOptions, asOf: from });
  const extra = options.changes ?? [];
  // Re-evaluate at each date in the window when an enacted, patched change takes effect.
  const switchDates = [...BUNDLED_CHANGES, ...extra]
    .filter((c) => c.status === "enacted" && c.patches?.length && c.effective > from && c.effective <= to)
    .map((c) => c.effective);
  const snapshots: Array<{ start: string; result: ComplianceResult }> = [{ start: from, result: first }];
  for (const d of [...new Set(switchDates)].sort())
    snapshots.push({ start: d, result: evaluate(input, { ...evalOptions, asOf: d }) });

  const events: CalendarEvent[] = [];
  snapshots.forEach((snap, i) => {
    const end = i + 1 < snapshots.length ? addDays(snapshots[i + 1]!.start, -1) : to;
    for (const item of snap.result.items) {
      if (!item.due) continue;
      const dates = occurrencesBetween(
        item.due,
        {
          formationDate: snap.result.profile.formationDate,
          biennial: item.frequency === "biennial",
          intervalYears: item.frequency === "every_five_years" ? 5 : undefined,
        },
        snap.start,
        end,
      );
      for (const date of dates) events.push(toEvent(item, date));
    }
  });
  events.sort((a, b) => a.date.localeCompare(b.date) || a.itemId.localeCompare(b.itemId));
  return { events, result: first };
}

// ---- iCalendar (RFC 5545) export ----

const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds a content line at 75 octets, as the format requires. */
function fold(line: string): string {
  const bytes = new TextEncoder();
  if (bytes.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes.encode(cur + ch).length > limit) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export interface IcsOptions {
  calendarName?: string;
  /** Product identifier. Defaults to this library. */
  prodId?: string;
  /** DTSTAMP date (YYYY-MM-DD); defaults to the earliest event date, which keeps the output deterministic. */
  stamp?: string;
}

const compact = (iso: string) => iso.replace(/-/g, "");

/** Renders events as an iCalendar (.ics) document with all-day events. */
export function toICS(events: CalendarEvent[], options: IcsOptions = {}): string {
  const stamp = compact(options.stamp ?? events[0]?.date ?? today());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${options.prodId ?? "-//compliance-rules-engine//EN"}`,
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${esc(options.calendarName ?? "Compliance deadlines")}`,
  ];
  for (const e of events) {
    const parts = [e.authority];
    if (e.deadline) parts.push(`Deadline: ${e.deadline}`);
    if (e.cost?.amount !== undefined) parts.push(`Fee: $${e.cost.amount}`);
    if (e.penalty)
      parts.push(
        `Late penalty: $${e.penalty.amount}${e.penalty.percentPerMonth ? ` + ${e.penalty.percentPerMonth}%/month` : ""}`,
      );
    if (e.url) parts.push(e.url);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.itemId}-${e.date}@compliance-rules-engine`,
      `DTSTAMP:${stamp}T000000Z`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${compact(addDays(e.date, 1))}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(parts.join("\n"))}`,
      ...(e.url ? [`URL:${e.url}`] : []),
      `CATEGORIES:${esc(e.category)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
