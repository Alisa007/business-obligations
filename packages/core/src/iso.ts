const SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written as YYYY-MM-DD (so `2026-02-30` and `2026-13-01` are rejected). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !SHAPE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Today's calendar date (YYYY-MM-DD) in the local time zone. `toISOString()` would give the UTC date, which is
 * already "tomorrow" on a US evening and would shift every default start date and "days until" figure by one.
 */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The calendar date `days` after `iso` (YYYY-MM-DD); negative values go back. Works in UTC so DST cannot shift it. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
