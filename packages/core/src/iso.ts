const SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written as YYYY-MM-DD (so `2026-02-30` and `2026-13-01` are rejected). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !SHAPE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
