import type { Due, RelativeDue } from "./data/types";
import type { Frequency, RecurringFrequency } from "./types";

/**
 * Schedules are stored in the data files as one iCalendar recurrence rule (RFC 5545 `RRULE` value) and read back
 * from it, so the frequency, the machine-readable due rule and the display text cannot disagree. Supported:
 *
 * - `FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=15`: every May 15 (`BYMONTHDAY=-1` is the last day of the month);
 * - `INTERVAL=2` (biennial) and `INTERVAL=5` (every five years), anchored by an `anchor`;
 * - several months with one day, for quarterly and monthly cycles: `BYMONTH=1,4,7,10;BYMONTHDAY=-1`;
 * - no `BYMONTH`: relative to the entity's formation date (`BYMONTHDAY=1` or `-1` for the first or last day of
 *   the anniversary month; the anniversary itself is `anchor: "formation"`), the way iCalendar anchors a rule on
 *   `DTSTART`;
 * - two months with one day, twice a year: `BYMONTH=1,7;BYMONTHDAY=31`;
 * - four months with `anchor: "formation_quarter"`: once a year, in the calendar quarter that contains the
 *   formation month (`BYMONTH=3,6,9,12;BYMONTHDAY=-1`: the last day of that quarter);
 * - counted from a reference date instead of fixed on the calendar, with `anchor` naming it: `license_issued` (renew
 *   when the license anniversary comes round), `formation`, `fiscal_year_start` or `fiscal_year_end`; the day of the
 *   month in `BYMONTHDAY` (`-1` is the last day), whole months after the reference month in `X-MONTHS`, days after
 *   the resulting date in `X-DAYS` ("the last day of the month after the license expires" is `BYMONTHDAY=-1;X-MONTHS=1`
 *   with `license_issued`; "15th day of the 4th month of the tax year" is `BYMONTHDAY=15;X-MONTHS=3` with
 *   `fiscal_year_start`). A fiscal year reference needs its day, and an offset needs the day it counts to;
 * - a date the agency publishes or sets, which no rule can say: `announced` (the same for everyone, each year: the
 *   EEOC's filing window) or `assigned` (set for each taxpayer: a sales tax filing frequency). No other part is allowed.
 *
 * Every rule gives its exact due date, or the exact way to find it. There is no rule without a date: "annual, date
 * unknown" is not a schedule, so a recurrence whose date the data does not know is not written as one.
 *
 * A recurrence that only repeats every second year needs a starting point. The `anchor` is an ISO date (the
 * cycle starts there, e.g. an even or odd year) or, for cycles that follow the entity's own formation,
 * `formation_year` or `year_after_formation`.
 */
export type ScheduleAnchor =
  | "formation"
  | "formation_quarter"
  | "formation_year"
  | "year_after_formation"
  | RelativeDue["from"]
  | (string & {});

/** The anchors that name what a due date is counted from (see `RelativeDue`). */
const REFERENCES: readonly string[] = [
  "license_issued",
  "fiscal_year_start",
  "fiscal_year_end",
  "announced",
  "assigned",
];

export type ScheduleFrequency =
  "annual" | "biennial" | "every_three_years" | "every_five_years" | "semiannual" | "quarterly" | "monthly";

export interface Schedule {
  /** Undefined for a recurrence whose date the source does not fix. */
  due?: Due;
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
  3: "every_three_years",
  5: "every_five_years",
};

/** The length in years of a cycle longer than two (three or five); undefined for the others. */
export const intervalYearsOf = (frequency: string): 3 | 5 | undefined =>
  frequency === "every_three_years" ? 3 : frequency === "every_five_years" ? 5 : undefined;
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
    if (!["FREQ", "INTERVAL", "BYMONTH", "BYMONTHDAY", "X-MONTHS", "X-DAYS"].includes(k))
      throw new Error(`Unsupported part ${k} in recurrence rule "${rrule}"`);
  const bad = () => new Error(`Invalid recurrence rule "${rrule}"`);
  const freq = p.get("FREQ");
  if (freq === "MONTHLY")
    throw new Error(
      `Recurrence rule "${rrule}": a monthly or quarterly deadline gives its day, as FREQ=YEARLY with all twelve or four months in BYMONTH`,
    );
  if (freq !== "YEARLY") throw new Error(`Recurrence rule "${rrule}" must have FREQ=YEARLY`);
  const interval = p.has("INTERVAL") ? int(rrule, p.get("INTERVAL"), 1, 5) : 1;
  const frequency = INTERVAL_FREQUENCY[interval];
  const offsets = p.has("X-MONTHS") || p.has("X-DAYS");
  if (!p.has("BYMONTH")) {
    if (!frequency) throw bad();
    const day = p.has("BYMONTHDAY") ? int(rrule, p.get("BYMONTHDAY"), -1, 31) : undefined;
    if (day === 0) throw bad();
    const reference = anchor !== undefined && (REFERENCES.includes(anchor) || anchor === "formation");
    if (anchor !== undefined && !reference)
      throw new Error(`Invalid anchor "${anchor}" for recurrence rule "${rrule}"`);
    if (reference && !(anchor === "formation" && day === undefined && !offsets)) {
      // Counted from a reference date: the anniversary itself, or a day of a month counted from it.
      const from = anchor as RelativeDue["from"];
      if (from === "announced" || from === "assigned") {
        if (day !== undefined || offsets) throw bad();
        return { due: { type: "relative", from }, frequency };
      }
      const monthsAfter = p.has("X-MONTHS") ? int(rrule, p.get("X-MONTHS"), 1, 11) : undefined;
      const daysAfter = p.has("X-DAYS") ? int(rrule, p.get("X-DAYS"), 1, 90) : undefined;
      // A fiscal year is a span of months: its date needs the day. Months after anything need the day they count to.
      if (
        (from === "fiscal_year_start" || from === "fiscal_year_end" || monthsAfter !== undefined) &&
        day === undefined
      )
        throw bad();
      if (
        from === "fiscal_year_end" &&
        monthsAfter === undefined &&
        daysAfter === undefined &&
        day === undefined
      )
        throw bad();
      if (interval > 1 && (from === "fiscal_year_start" || from === "fiscal_year_end")) throw bad();
      return {
        due: {
          type: "relative",
          from,
          ...(monthsAfter !== undefined ? { monthsAfter } : {}),
          ...(day !== undefined ? { day } : {}),
          ...(daysAfter !== undefined ? { daysAfter } : {}),
        },
        frequency,
      };
    }
    // The formation anniversary itself (anchor "formation"), or the first or last day of its month.
    if (offsets) throw bad();
    if (day !== undefined && day !== 1 && day !== -1) throw bad();
    if (day === undefined && !anchor) throw bad();
    const point = day === 1 ? "start_of_month" : day === -1 ? "end_of_month" : "date";
    return { due: { type: "anniversary", point }, frequency };
  }
  if (offsets) throw bad();
  const months = p
    .get("BYMONTH")!
    .split(",")
    .map((m) => int(rrule, m, 1, 12));
  if (!p.has("BYMONTHDAY")) {
    // The months of a cycle whose day the agency sets: monthly or quarterly returns on a due date it assigns.
    const from = anchor === "assigned" ? "assigned" : anchor === "announced" ? "announced" : undefined;
    if (!from) throw bad();
    const cycle = ({ 2: "semiannual", 4: "quarterly", 12: "monthly" } as Record<number, ScheduleFrequency>)[
      months.length
    ];
    if (!cycle || interval !== 1 || new Set(months).size !== months.length) throw bad();
    return { due: { type: "relative", from }, frequency: cycle };
  }
  const rawDay = int(rrule, p.get("BYMONTHDAY"), -1, 31);
  if (rawDay === 0) throw bad();
  if (months.length > 1) {
    if (interval !== 1 || new Set(months).size !== months.length) throw bad();
    const sorted = [...months].sort((a, b) => a - b);
    const cycle =
      sorted.length === 2
        ? "semiannual"
        : sorted.length === 4
          ? "quarterly"
          : sorted.length === 12
            ? "monthly"
            : undefined;
    if (!cycle) throw bad();
    const dates = sorted.map((month) => ({
      month,
      day: rawDay === -1 ? (month === 2 ? 31 : lastDay(month)) : rawDay,
    }));
    if (anchor === "formation_quarter") {
      // One date a year: the one in the quarter that contains the formation month.
      if (cycle !== "quarterly" || sorted.join() !== "3,6,9,12") throw bad();
      return { due: { type: "multi", dates, quarterOf: "formation" }, frequency: "annual" };
    }
    if (anchor) throw new Error(`Invalid anchor "${anchor}" for recurrence rule "${rrule}"`);
    return { due: { type: "multi", dates }, frequency: cycle };
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
export function toRRule(
  due: Due | undefined,
  frequency: string,
): { rrule: string; anchor?: ScheduleAnchor } | undefined {
  // A schedule without a due date has no rule: a rule always says when.
  if (!due) return undefined;
  const interval = Object.entries(INTERVAL_FREQUENCY).find(([, f]) => f === frequency)?.[0];
  const every = interval && interval !== "1" ? `;INTERVAL=${interval}` : "";
  if (due.type === "relative") {
    if (due.from === "assigned" || due.from === "announced") {
      // A cycle shorter than a year names its months (the usual ones); a longer one is the interval.
      const months = { semiannual: "1,7", quarterly: "1,4,7,10", monthly: "1,2,3,4,5,6,7,8,9,10,11,12" }[
        frequency as "semiannual" | "quarterly" | "monthly"
      ];
      if (months) return { rrule: `FREQ=YEARLY;BYMONTH=${months}`, anchor: due.from };
    }
    if (!interval) return undefined;
    const day = due.day !== undefined ? `;BYMONTHDAY=${due.day}` : "";
    const months = due.monthsAfter ? `;X-MONTHS=${due.monthsAfter}` : "";
    const days = due.daysAfter ? `;X-DAYS=${due.daysAfter}` : "";
    return { rrule: `FREQ=YEARLY${every}${day}${months}${days}`, anchor: due.from };
  }
  if (due.type === "anniversary") {
    if (!interval) return undefined;
    if (due.point === "date") return { rrule: `FREQ=YEARLY${every}`, anchor: "formation" };
    return { rrule: `FREQ=YEARLY${every};BYMONTHDAY=${due.point === "start_of_month" ? 1 : -1}` };
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
    const cycle =
      due.quarterOf === "formation"
        ? 4
        : frequency === "semiannual"
          ? 2
          : frequency === "quarterly"
            ? 4
            : frequency === "monthly"
              ? 12
              : 0;
    if (due.dates.length !== cycle || (due.quarterOf && frequency !== "annual")) return undefined;
    const months = due.dates.map((d) => d.month).sort((a, b) => a - b);
    const day = due.dates.every((d) => isLast(d.month, d.day))
      ? -1
      : due.dates.every((d) => d.day === due.dates[0]!.day)
        ? due.dates[0]!.day
        : undefined;
    return day === undefined
      ? undefined
      : {
          rrule: `FREQ=YEARLY;BYMONTH=${months.join(",")};BYMONTHDAY=${day}`,
          ...(due.quarterOf ? { anchor: "formation_quarter" as const } : {}),
        };
  }
  return undefined;
}

/** What a due date counted from a reference date says, in words: the same words in every item that has it. */
function describeRelative(due: RelativeDue): string {
  if (due.from === "announced") return "Date the agency announces each year";
  if (due.from === "assigned") return "Date the agency sets for you";
  const months = due.monthsAfter ?? 0;
  const day = due.day === undefined ? undefined : due.day === -1 ? "Last day" : `Day ${due.day}`;
  let text: string;
  if (due.from === "fiscal_year_start") text = `${day} of month ${months + 1} of the tax year`;
  else if (due.from === "fiscal_year_end")
    text =
      months === 0
        ? `${day} of the month the fiscal year ends`
        : months === 1
          ? `${day} of the month after the fiscal year ends`
          : `${day} of month ${months} after the fiscal year ends`;
  else {
    const reference = due.from === "formation" ? "anniversary" : "license anniversary";
    text =
      day === undefined
        ? due.from === "formation"
          ? "On the anniversary of formation"
          : "On the anniversary of the license date"
        : months === 0
          ? `${day} of the ${reference} month`
          : months === 1
            ? `${day} of the month after the ${reference} month`
            : `${day} of month ${months} after the ${reference} month`;
  }
  return due.daysAfter
    ? `${due.daysAfter} days after: ${text.charAt(0).toLowerCase()}${text.slice(1)}`
    : text;
}

/** A month and day, for a date without a year. */
export interface MonthDay {
  month: number;
  day: number;
}

const dayText = (month: number, day: number) =>
  day > lastDay(month) ? `Last day of ${MONTH_NAMES[month - 1]}` : `${MONTH_NAMES[month - 1]} ${day}`;
const ordinal = (n: number) => {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${n % 10 > 3 ? "th" : suffix}`;
};
const listText = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/**
 * Display text for a schedule, for the common shapes; undefined when the data should say it in its own words.
 * `opens` is the day a filing window opens, giving "January 1 – May 1".
 */
export function describeSchedule({ due, frequency }: Schedule, opens?: MonthDay): string | undefined {
  if (!due) return undefined;
  if (due.type === "relative") {
    const base = describeRelative(due);
    const every = { biennial: "second", every_three_years: "third", every_five_years: "fifth" }[
      frequency as "biennial" | "every_three_years" | "every_five_years"
    ];
    return every ? `${base}, every ${every} year` : base;
  }
  if (due.type === "anniversary" && frequency === "biennial" && due.point !== "date")
    return `${describeSchedule({ due, frequency: "annual" })}, every second year`;
  if (due.type === "anniversary" && frequency === "annual")
    return due.point === "date"
      ? "On the anniversary of formation"
      : due.point === "end_of_month"
        ? "Last day of the anniversary month"
        : "First day of the anniversary month";
  if (due.type === "multi" && due.quarterOf)
    return due.dates.every((d) => d.day > lastDay(d.month) || d.day === lastDay(d.month))
      ? "Last day of the quarter that contains the anniversary month"
      : undefined;
  if (due.type === "multi" && (frequency === "semiannual" || frequency === "quarterly") && !opens)
    return listText(due.dates.map((d) => dayText(d.month, d.day)));
  if (due.type === "multi" && frequency === "monthly" && !opens) {
    if (due.dates.every((d) => isLast(d.month, d.day))) return "Last day of each month";
    const day = due.dates[0]!.day;
    return due.dates.every((d) => d.day === day) ? `${ordinal(day)} of each month` : undefined;
  }
  if (due.type === "multi") return undefined;
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
export function dueToRRule(due: Due | undefined, frequency: string): string | undefined {
  const out = toRRule(due, frequency);
  if (!out || out.anchor || due?.type === "anniversary" || /INTERVAL/.test(out.rrule)) return undefined;
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

/** What a data entry contributes to an item draft: its rule when it recurs, otherwise its non-recurring frequency. */
export type DraftSchedule =
  | { rrule: string; anchor?: ScheduleAnchor; deadline?: string }
  | { frequency: Exclude<Frequency, RecurringFrequency>; deadline?: string; due?: Due };

export function draftSchedule(it: ScheduleFields): DraftSchedule {
  if (it.rrule) {
    const s = parseRRule(it.rrule, it.anchor);
    const generated = describeSchedule(s, it.opens);
    const text = generated && it.deadlineNote ? `${generated} (${it.deadlineNote})` : generated;
    return {
      rrule: it.rrule,
      ...(it.anchor ? { anchor: it.anchor } : {}),
      ...((it.deadline ?? text) ? { deadline: it.deadline ?? text } : {}),
    };
  }
  const frequency = it.frequency === "periodic" ? "ongoing" : it.frequency;
  if (frequency !== "once" && frequency !== "per_event" && frequency !== "ongoing")
    throw new Error(`Data entry has neither an rrule nor a non-recurring frequency (${it.frequency})`);
  return { frequency, deadline: it.deadline, due: it.due };
}
