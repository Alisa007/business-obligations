import type { Due } from "./data/types";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Returns the earliest date >= `asOf` for a (month, day) occurrence in years accepted by `ok`. */
function firstOccurrence(
  asOf: string,
  month: number,
  day: number,
  ok: (year: number) => boolean,
): string | undefined {
  const startYear = Number(asOf.slice(0, 4));
  for (let y = startYear; y <= startYear + 3; y++) {
    if (!ok(y)) continue;
    const d = iso(y, month, Math.min(day, lastDay(y, month)));
    if (d >= asOf) return d;
  }
  return undefined;
}

export interface DueContext {
  asOf: string;
  /** ISO date of formation, when known. */
  formationDate?: string;
  biennial: boolean;
  /** Repeat interval in years for cycles longer than two (e.g. five-year statements). */
  intervalYears?: number;
}

/** Computes the next due date for a rule, or undefined when it cannot be determined from the inputs. */
export function nextDueDate(due: Due, ctx: DueContext): string | undefined {
  switch (due.type) {
    case "fixed": {
      let ok = (_y: number) => true;
      if (due.parity) ok = (y) => (due.parity === "odd" ? y % 2 === 1 : y % 2 === 0);
      else if (ctx.intervalYears && ctx.intervalYears > 2) return undefined;
      else if (ctx.biennial) {
        if (!due.cycleFrom || !ctx.formationDate) return undefined;
        const base =
          Number(ctx.formationDate.slice(0, 4)) + (due.cycleFrom === "year_after_formation" ? 1 : 0);
        ok = (y) => y >= base && (y - base) % 2 === 0;
      }
      return firstOccurrence(ctx.asOf, due.month, due.day, ok);
    }
    case "date":
      return due.date >= ctx.asOf ? due.date : undefined;
    case "multi": {
      const all = due.dates
        .map((d) => firstOccurrence(ctx.asOf, d.month, d.day, () => true))
        .filter((d): d is string => !!d)
        .sort();
      return all[0];
    }
    case "anniversary": {
      if (!ctx.formationDate) return undefined;
      const fm = Number(ctx.formationDate.slice(5, 7));
      const fd = Number(ctx.formationDate.slice(8, 10));
      const fy = Number(ctx.formationDate.slice(0, 4));
      const day = (y: number) =>
        due.point === "start_of_month" ? 1 : due.point === "end_of_month" ? lastDay(y, fm) : fd;
      // Annual reports are first due in the year after formation; biennial cycles repeat every two years;
      // longer cycles (five-year statements) are first due on the Nth anniversary.
      const long = ctx.intervalYears !== undefined && ctx.intervalYears > 2;
      const step = long ? ctx.intervalYears! : ctx.biennial ? 2 : 1;
      const startYear = Number(ctx.asOf.slice(0, 4));
      for (let y = fy + (long ? step : 1); y <= startYear + step + 2; y += step) {
        const d = iso(y, fm, Math.min(day(y), lastDay(y, fm)));
        if (d >= ctx.asOf) return d;
      }
      return undefined;
    }
  }
}

/**
 * All due dates within [from, to] (inclusive) for a rule. Mirrors `nextDueDate`: returns an empty list when
 * the cycle cannot be determined from the inputs (e.g. biennial filings without a parity or formation date).
 */
export function occurrencesBetween(
  due: Due,
  ctx: Partial<Omit<DueContext, "asOf">>,
  from: string,
  to: string,
): string[] {
  const out: string[] = [];
  const y0 = Number(from.slice(0, 4));
  const y1 = Number(to.slice(0, 4));
  const push = (d: string) => {
    if (d >= from && d <= to) out.push(d);
  };
  const long = ctx.intervalYears !== undefined && ctx.intervalYears > 2;
  switch (due.type) {
    case "fixed": {
      let ok = (_y: number) => true;
      if (due.parity) ok = (y) => (due.parity === "odd" ? y % 2 === 1 : y % 2 === 0);
      else if (long) return [];
      else if (ctx.biennial) {
        if (!due.cycleFrom || !ctx.formationDate) return [];
        const base =
          Number(ctx.formationDate.slice(0, 4)) + (due.cycleFrom === "year_after_formation" ? 1 : 0);
        ok = (y) => y >= base && (y - base) % 2 === 0;
      }
      for (let y = y0; y <= y1; y++)
        if (ok(y)) push(iso(y, due.month, Math.min(due.day, lastDay(y, due.month))));
      break;
    }
    case "date":
      push(due.date);
      break;
    case "multi":
      for (let y = y0; y <= y1; y++)
        for (const d of due.dates) push(iso(y, d.month, Math.min(d.day, lastDay(y, d.month))));
      break;
    case "anniversary": {
      if (!ctx.formationDate) return [];
      const fm = Number(ctx.formationDate.slice(5, 7));
      const fd = Number(ctx.formationDate.slice(8, 10));
      const fy = Number(ctx.formationDate.slice(0, 4));
      const day = (y: number) =>
        due.point === "start_of_month" ? 1 : due.point === "end_of_month" ? lastDay(y, fm) : fd;
      const step = long ? ctx.intervalYears! : ctx.biennial ? 2 : 1;
      for (let y = fy + (long ? step : 1); y <= y1; y += step)
        push(iso(y, fm, Math.min(day(y), lastDay(y, fm))));
      break;
    }
  }
  return out.sort();
}

/** BYMONTHDAY value for a day of a month: -1 (the last day) for days that some years' month does not have. */
const monthDay = (month: number, day: number) => (day > lastDay(2025, month) && day >= 29 ? -1 : day);

/**
 * The due rule as an iCalendar recurrence rule (RFC 5545 `RRULE` value, without the `RRULE:` prefix), for example
 * `FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=15`. Only rules that repeat every year on fixed dates can be written without
 * a start date; biennial, five-year, anniversary and one-off rules return undefined.
 */
export function dueToRRule(due: Due, frequency: string): string | undefined {
  if (frequency !== "annual") return undefined;
  if (due.type === "fixed") {
    if (due.parity || due.cycleFrom) return undefined;
    return `FREQ=YEARLY;BYMONTH=${due.month};BYMONTHDAY=${monthDay(due.month, due.day)}`;
  }
  if (due.type === "multi") {
    const days = new Set(due.dates.map((d) => monthDay(d.month, d.day)));
    if (days.size !== 1) return undefined;
    const months = [...new Set(due.dates.map((d) => d.month))].sort((a, b) => a - b);
    return `FREQ=YEARLY;BYMONTH=${months.join(",")};BYMONTHDAY=${[...days][0]}`;
  }
  return undefined;
}
