import type { Due } from "./data/types";

/**
 * Schedules are stored in the data files as one iCalendar recurrence rule (RFC 5545 `RRULE` value) and read back
 * from it, so the frequency, the machine-readable due rule and the display text cannot disagree. Supported:
 *
 * - `FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=15`: every May 15 (`BYMONTHDAY=-1` is the last day of the month);
 * - `INTERVAL=2` (biennial) and `INTERVAL=5` (every five years), anchored by an `anchor`;
 * - several months with one day, for quarterly and monthly cycles: `BYMONTH=1,4,7,10;BYMONTHDAY=-1`;
 * - no `BYMONTH`: relative to the entity's formation date (`BYMONTHDAY=1` or `-1` for the first or last day of
 *   the anniversary month), the way iCalendar anchors a rule on `DTSTART`.
 *
 * A recurrence that only repeats every second year needs a starting point. The `anchor` is an ISO date (the
 * cycle starts there, e.g. an even or odd year) or, for cycles that follow the entity's own formation,
 * `formation_year` or `year_after_formation`.
 */
export type ScheduleAnchor = "formation_year" | "year_after_formation" | (string & {});

export type ScheduleFrequency = "annual" | "biennial" | "every_five_years" | "quarterly" | "monthly";

export interface Schedule {
  due: Due;
  frequency: ScheduleFrequency;
}

const MONTH_NAMES = [
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
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const INTERVAL_FREQUENCY: Record<number, ScheduleFrequency> = {
  1: "annual",
  2: "biennial",
  5: "every_five_years",
};
const lastDay = (m: number) => [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
/** A due day that falls on the last day of its month in every year (Feb 28 is a literal day, not "the last"). */
const isLast = (m: number, d: number) => d >= lastDay(m) && !(m === 2 && d === 28);

function parts(rrule: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of rrule.split(";")) {
    const [k, v] = part.split("=");
    if (!k || v === undefined || out.has(k)) throw new Error(`Invalid recurrence rule "${rrule}"`);
    out.set(k, v);
  }
  return out;
}

const int = (rrule: string, v: string | undefined, min: number, max: number): number => {
  const n = Number(v);
  if (v === undefined || !/^-?\d+$/.test(v) || n < min || n > max)
    throw new Error(`Invalid recurrence rule "${rrule}"`);
  return n;
};

/** Reads a schedule from a recurrence rule; throws on a rule outside the supported subset. */
export function parseRRule(rrule: string, anchor?: ScheduleAnchor): Schedule {
  const p = parts(rrule);
  for (const k of p.keys())
    if (!["FREQ", "INTERVAL", "BYMONTH", "BYMONTHDAY"].includes(k))
      throw new Error(`Unsupported part ${k} in recurrence rule "${rrule}"`);
  if (p.get("FREQ") !== "YEARLY") throw new Error(`Recurrence rule "${rrule}" must have FREQ=YEARLY`);
  const interval = p.has("INTERVAL") ? int(rrule, p.get("INTERVAL"), 1, 5) : 1;
  const frequency = INTERVAL_FREQUENCY[interval];
  const bad = () => new Error(`Invalid recurrence rule "${rrule}"`);
  if (!p.has("BYMONTH")) {
    if (!frequency) throw bad();
    const day = p.has("BYMONTHDAY") ? int(rrule, p.get("BYMONTHDAY"), -1, 1) : 0;
    if (day !== 0 && day !== 1 && day !== -1) throw bad();
    const point = day === 1 ? "start_of_month" : day === -1 ? "end_of_month" : "date";
    return { due: { type: "anniversary", point }, frequency };
  }
  const months = p
    .get("BYMONTH")!
    .split(",")
    .map((m) => int(rrule, m, 1, 12));
  const rawDay = int(rrule, p.get("BYMONTHDAY"), -1, 31);
  if (rawDay === 0) throw bad();
  if (months.length > 1) {
    if (interval !== 1 || new Set(months).size !== months.length) throw bad();
    const sorted = [...months].sort((a, b) => a - b);
    const cycle = sorted.length === 4 ? "quarterly" : sorted.length === 12 ? "monthly" : undefined;
    if (!cycle) throw bad();
    return {
      due: {
        type: "multi",
        dates: sorted.map((month) => ({ month, day: rawDay === -1 ? lastDay(month) : rawDay })),
      },
      frequency: cycle,
    };
  }
  const month = months[0]!;
  const due: Extract<Due, { type: "fixed" }> = { type: "fixed", month, day: rawDay === -1 ? 31 : rawDay };
  if (!frequency) throw bad();
  if (interval > 1 && anchor) {
    if (anchor === "formation_year" || anchor === "year_after_formation")
      due.cycleFrom = anchor as "formation_year" | "year_after_formation";
    else if (interval === 2 && ISO.test(anchor))
      due.parity = Number(anchor.slice(0, 4)) % 2 === 1 ? "odd" : "even";
    else throw new Error(`Invalid anchor "${anchor}" for recurrence rule "${rrule}"`);
  }
  return { due, frequency };
}

/** Writes a schedule as a recurrence rule and anchor; undefined for schedules the data format cannot express. */
export function toRRule(due: Due, frequency: string): { rrule: string; anchor?: ScheduleAnchor } | undefined {
  const interval = Object.entries(INTERVAL_FREQUENCY).find(([, f]) => f === frequency)?.[0];
  const every = interval && interval !== "1" ? `;INTERVAL=${interval}` : "";
  if (due.type === "anniversary") {
    if (!interval) return undefined;
    const day =
      due.point === "start_of_month" ? ";BYMONTHDAY=1" : due.point === "end_of_month" ? ";BYMONTHDAY=-1" : "";
    return { rrule: `FREQ=YEARLY${every}${day}` };
  }
  if (due.type === "fixed") {
    if (!interval) return undefined;
    const day = due.day > lastDay(due.month) ? -1 : due.day;
    const rrule = `FREQ=YEARLY${every};BYMONTH=${due.month};BYMONTHDAY=${day}`;
    if (due.parity) {
      const year = due.parity === "odd" ? 2027 : 2026;
      const mm = String(due.month).padStart(2, "0");
      return { rrule, anchor: `${year}-${mm}-${String(due.day).padStart(2, "0")}` };
    }
    return due.cycleFrom ? { rrule, anchor: due.cycleFrom } : { rrule };
  }
  if (due.type === "multi") {
    const cycle = frequency === "quarterly" ? 4 : frequency === "monthly" ? 12 : 0;
    if (due.dates.length !== cycle) return undefined;
    const months = due.dates.map((d) => d.month).sort((a, b) => a - b);
    const day = due.dates.every((d) => isLast(d.month, d.day))
      ? -1
      : due.dates.every((d) => d.day === due.dates[0]!.day)
        ? due.dates[0]!.day
        : undefined;
    return day === undefined
      ? undefined
      : { rrule: `FREQ=YEARLY;BYMONTH=${months.join(",")};BYMONTHDAY=${day}` };
  }
  return undefined;
}

/** A month and day, for a date without a year. */
export interface MonthDay {
  month: number;
  day: number;
}

const dayText = (month: number, day: number) =>
  day > lastDay(month) ? `Last day of ${MONTH_NAMES[month - 1]}` : `${MONTH_NAMES[month - 1]} ${day}`;
const listText = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/**
 * Display text for a schedule, for the common shapes; undefined when the data should say it in its own words.
 * `opens` is the day a filing window opens, giving "January 1 – May 1".
 */
export function describeSchedule({ due, frequency }: Schedule, opens?: MonthDay): string | undefined {
  if (due.type === "anniversary" && frequency === "biennial" && due.point !== "date")
    return `${describeSchedule({ due, frequency: "annual" })}, every second year`;
  if (due.type === "anniversary" && frequency === "annual")
    return due.point === "date"
      ? "On the anniversary of formation"
      : due.point === "end_of_month"
        ? "Last day of the anniversary month"
        : "First day of the anniversary month";
  if (due.type === "multi" && (frequency === "quarterly" || frequency === "monthly") && !opens)
    return frequency === "monthly"
      ? undefined
      : listText(due.dates.map((d) => `${MONTH_NAMES[d.month - 1]} ${d.day}`));
  if (due.type !== "fixed") return undefined;
  const date = dayText(due.month, due.day);
  if (opens)
    return frequency === "annual" && !due.cycleFrom
      ? `${dayText(opens.month, opens.day)} – ${date}`
      : undefined;
  if (due.cycleFrom && frequency === "biennial")
    return due.cycleFrom === "year_after_formation"
      ? `${date} of every second year after formation`
      : `${date} of every second year, starting with the formation year`;
  if (due.cycleFrom) return undefined;
  if (frequency === "annual") return date;
  if (frequency === "biennial" && due.parity) return `${date} of ${due.parity}-numbered years`;
  return undefined;
}

/** The recurrence rule to hand to a calendar app: only rules that stand alone, without a start date. */
export function dueToRRule(due: Due, frequency: string): string | undefined {
  const out = toRRule(due, frequency);
  if (!out || out.anchor || due.type === "anniversary" || /INTERVAL/.test(out.rrule)) return undefined;
  return out.rrule;
}

/** The schedule fields a data file may carry: `rrule` is the source; the others are legacy or overrides. */
export interface ScheduleFields {
  rrule?: string;
  anchor?: ScheduleAnchor;
  frequency?: string;
  deadline?: string;
  /** A qualifier appended in parentheses to the generated deadline text ("calendar-year filers"). */
  deadlineNote?: string;
  /** The day a filing window opens; the closing day is the rule's date. */
  opens?: MonthDay;
  due?: Due;
}

/**
 * The frequency, due rule and display deadline of a data entry. With an `rrule` they are derived from it
 * (`deadlineNote` adds a qualifier to the generated text; a full `deadline` in the data replaces it when the rule
 * cannot say it, such as "Before the first day of the anniversary month"); without
 * one, the entry's own `frequency`, `deadline` and `due` are used, which keeps hand-written data working.
 */
export function resolveSchedule<F extends string>(
  it: ScheduleFields & { frequency?: F },
): { frequency: F | ScheduleFrequency; deadline?: string; due?: Due } {
  if (!it.rrule) return { frequency: it.frequency as F, deadline: it.deadline, due: it.due };
  const s = parseRRule(it.rrule, it.anchor);
  const generated = describeSchedule(s, it.opens);
  const text = generated && it.deadlineNote ? `${generated} (${it.deadlineNote})` : generated;
  return { frequency: s.frequency, due: s.due, deadline: it.deadline ?? text };
}
