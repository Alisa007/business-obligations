import type { Due, RelativeDue } from "./data/types";

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

/** The date of a quarterly set that falls in the calendar quarter containing the formation month. */
function quarterDate(
  due: Extract<Due, { type: "multi" }>,
  formationDate: string | undefined,
): { month: number; day: number } | undefined {
  if (!formationDate) return undefined;
  const month = Math.ceil(Number(formationDate.slice(5, 7)) / 3) * 3;
  return due.dates.find((d) => d.month === month);
}

export interface DueContext {
  asOf: string;
  /** ISO date of formation, when known. */
  formationDate?: string;
  /** ISO date the license or permit was issued (or last renewed), when known; the data cannot know it. */
  licenseIssuedOn?: string;
  /** The month the fiscal year ends, 1 to 12; the calendar year (12) when omitted. */
  fiscalYearEndMonth?: number;
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
      if (due.quarterOf) {
        const d = quarterDate(due, ctx.formationDate);
        if (!d) return undefined;
        // Annual reports are first due in the year after formation.
        const fy = Number(ctx.formationDate!.slice(0, 4));
        for (let y = fy + 1; y <= Number(ctx.asOf.slice(0, 4)) + 2; y++) {
          const out = iso(y, d.month, Math.min(d.day, lastDay(y, d.month)));
          if (out >= ctx.asOf) return out;
        }
        return undefined;
      }
      const all = due.dates
        .map((d) => firstOccurrence(ctx.asOf, d.month, d.day, () => true))
        .filter((d): d is string => !!d)
        .sort();
      return all[0];
    }
    case "relative": {
      const year = Number(ctx.asOf.slice(0, 4));
      const reach = (ctx.intervalYears ?? (ctx.biennial ? 2 : 1)) + 3;
      return relativeDates(due, ctx, year, year + reach)
        .filter((d) => d >= ctx.asOf)
        .sort()[0];
    }
    case "anniversary": {
      if (!ctx.formationDate) return undefined;
      const fm = Number(ctx.formationDate.slice(5, 7));
      const fd = Number(ctx.formationDate.slice(8, 10));
      const fy = Number(ctx.formationDate.slice(0, 4));
      const day = (y: number) =>
        due.point === "start_of_month" ? 1 : due.point === "end_of_month" ? lastDay(y, fm) : fd;
      // Annual reports are first due in the year after formation. A cycle of N years (biennial statements,
      // five-year statements) is first due on the Nth anniversary and every N years after.
      const long = ctx.intervalYears !== undefined && ctx.intervalYears > 2;
      const step = long ? ctx.intervalYears! : ctx.biennial ? 2 : 1;
      const startYear = Number(ctx.asOf.slice(0, 4));
      for (let y = fy + step; y <= startYear + step + 2; y += step) {
        const d = iso(y, fm, Math.min(day(y), lastDay(y, fm)));
        if (d >= ctx.asOf) return d;
      }
      return undefined;
    }
  }
}

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * The dates of a due date counted from a reference date, for the years `from` to `to`; empty when the reference is
 * not known (a license date, a date the agency has not set) or the cycle cannot be placed. The occurrences of the
 * business's own anniversaries start the year after the reference date, like the formation anniversary.
 */
function relativeDates(due: RelativeDue, ctx: Partial<DueContext>, from: number, to: number): string[] {
  if (due.from === "announced" || due.from === "assigned") return [];
  const monthsAfter = due.monthsAfter ?? 0;
  const out: string[] = [];
  const emit = (year: number, month: number, dayOfReference: number) => {
    const total = month - 1 + monthsAfter;
    const y = year + Math.floor(total / 12);
    const m = (total % 12) + 1;
    const day = due.day === -1 ? lastDay(y, m) : Math.min(due.day ?? dayOfReference, lastDay(y, m));
    const date = iso(y, m, day);
    out.push(due.daysAfter ? addDays(date, due.daysAfter) : date);
  };
  if (due.from === "fiscal_year_start" || due.from === "fiscal_year_end") {
    if (ctx.biennial || (ctx.intervalYears ?? 0) > 2) return [];
    const end = ctx.fiscalYearEndMonth ?? 12;
    const month = due.from === "fiscal_year_end" ? end : (end % 12) + 1;
    for (let y = from - 2; y <= to; y++) emit(y, month, 1);
    return out;
  }
  const reference = due.from === "formation" ? ctx.formationDate : ctx.licenseIssuedOn;
  if (!reference) return [];
  const step = (ctx.intervalYears ?? 0) > 2 ? ctx.intervalYears! : ctx.biennial ? 2 : 1;
  const month = Number(reference.slice(5, 7));
  const dayOfReference = Number(reference.slice(8, 10));
  for (let y = Number(reference.slice(0, 4)) + step; y <= to; y += step) emit(y, month, dayOfReference);
  return out;
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
      if (due.quarterOf) {
        const d = quarterDate(due, ctx.formationDate);
        if (!d) return [];
        for (let y = Number(ctx.formationDate!.slice(0, 4)) + 1; y <= y1; y++)
          push(iso(y, d.month, Math.min(d.day, lastDay(y, d.month))));
        break;
      }
      for (let y = y0; y <= y1; y++)
        for (const d of due.dates) push(iso(y, d.month, Math.min(d.day, lastDay(y, d.month))));
      break;
    case "relative":
      for (const date of relativeDates(due, ctx, y0, y1)) push(date);
      break;
    case "anniversary": {
      if (!ctx.formationDate) return [];
      const fm = Number(ctx.formationDate.slice(5, 7));
      const fd = Number(ctx.formationDate.slice(8, 10));
      const fy = Number(ctx.formationDate.slice(0, 4));
      const day = (y: number) =>
        due.point === "start_of_month" ? 1 : due.point === "end_of_month" ? lastDay(y, fm) : fd;
      const step = long ? ctx.intervalYears! : ctx.biennial ? 2 : 1;
      for (let y = fy + step; y <= y1; y += step) push(iso(y, fm, Math.min(day(y), lastDay(y, fm))));
      break;
    }
  }
  return out.sort();
}
