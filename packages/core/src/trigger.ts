import type { WcTrigger } from "./data/types";

const employees = (n: number) => `${n} employee${n === 1 ? "" : "s"}`;

/**
 * Display text for a workers' compensation trigger that is only an employee count (optionally lower in construction),
 * or undefined when it needs words of its own (payroll alternatives, elective coverage). The data stores
 * `threshold` text only for those.
 */
export function describeTrigger(t: WcTrigger): string | undefined {
  const keys = Object.keys(t).filter((k) => k !== "minEmployees" && k !== "constructionMinEmployees");
  if (keys.length) return undefined;
  return t.constructionMinEmployees === undefined
    ? employees(t.minEmployees)
    : `${employees(t.minEmployees)} (${t.constructionMinEmployees} in construction)`;
}
