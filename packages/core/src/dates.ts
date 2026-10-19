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
