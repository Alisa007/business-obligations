import type { Applicability, ResolvedProfile } from "./types";

const same = (a: unknown, b: unknown) => (typeof a === "string" && typeof b === "string" ? a === b : a === b);

/** True when a profile field satisfies one condition. A list-valued field (such as `activities`) matches when any of its entries does. */
export function holds(c: Applicability, p: ResolvedProfile): boolean {
  const actual = (p as unknown as Record<string, unknown>)[c.field];
  if (actual === undefined || actual === null) return c.op === "!=";
  const values = Array.isArray(actual) ? actual : [actual];
  switch (c.op) {
    case "==":
      return values.some((v) => same(v, c.value));
    case "!=":
      return !values.some((v) => same(v, c.value));
    case "in":
      return Array.isArray(c.value) && values.some((v) => (c.value as unknown[]).includes(v));
    case ">=":
      return typeof actual === "number" && typeof c.value === "number" && actual >= c.value;
    case ">":
      return typeof actual === "number" && typeof c.value === "number" && actual > c.value;
    case "<=":
      return typeof actual === "number" && typeof c.value === "number" && actual <= c.value;
    case "<":
      return typeof actual === "number" && typeof c.value === "number" && actual < c.value;
  }
}

/** All conditions hold (an item without conditions always applies). */
export function allHold(conditions: Applicability[] | undefined, p: ResolvedProfile): boolean {
  return (conditions ?? []).every((c) => holds(c, p));
}
