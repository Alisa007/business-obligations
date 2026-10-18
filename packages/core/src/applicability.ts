import type { Applicability, ResolvedProfile } from "./types";
import { PROFILE_ENUMS, PROFILE_FIELDS } from "./validate";

const same = (a: unknown, b: unknown) => (typeof a === "string" && typeof b === "string" ? a === b : a === b);

const NUMBER_FIELDS = new Set([
  "ownerCount",
  "employeeCount",
  "fullTimeEmployeeCount",
  "annualPayroll",
  "businessPropertyValueUsd",
  "quarterlyPayrollUsd",
  "businessAgeYears",
  "priorYearPayrollTaxLiability",
  "largestContractorPaymentUsd",
  "annualRevenue",
  "annualNetIncome",
  "fiscalYearEndMonth",
  "projectValueUsd",
  "disturbedAcres",
  "floorAreaSqFt",
]);
const BOOLEAN_FIELDS = new Set([
  "sCorpElection",
  "isFormed",
  "sellsTaxableGoods",
  "homeBased",
  "usesTradeName",
  "hasTaxExemptStatus",
  "hasSignage",
  "foodService",
  "hasAutomatedPayrollSystem",
  "hasQualifiedRetirementPlan",
]);
const ARRAY_FIELDS = new Set(["activities"]);
const UNSUPPORTED_FIELDS = new Set(["multistate", "commercialVehicles"]);
const SCALAR_COMPARISONS = new Set([">=", ">", "<=", "<", "==", "!="]);
const INTEGER_FIELDS = new Set([
  "ownerCount",
  "employeeCount",
  "fullTimeEmployeeCount",
  "fiscalYearEndMonth",
]);

/** Returns a data-authoring error when a condition cannot be evaluated from a profile field. */
export function validateApplicability(c: Applicability): string | undefined {
  if (!PROFILE_FIELDS.includes(c.field)) return `unknown profile field "${c.field}"`;
  if (UNSUPPORTED_FIELDS.has(c.field)) return `field "${c.field}" cannot be used in a condition`;
  if (c.op === "in") {
    if (!Array.isArray(c.value) || c.value.length === 0 || c.value.some((v) => typeof v !== "string"))
      return `"in" requires a non-empty string array`;
  } else if (Array.isArray(c.value)) {
    return `operator "${c.op}" requires a scalar value`;
  }
  if (NUMBER_FIELDS.has(c.field)) {
    if (!SCALAR_COMPARISONS.has(c.op) || typeof c.value !== "number")
      return `field "${c.field}" requires a scalar numeric comparison`;
    if (INTEGER_FIELDS.has(c.field) && !Number.isInteger(c.value))
      return `field "${c.field}" requires an integer value`;
  } else if (BOOLEAN_FIELDS.has(c.field)) {
    if (!["==", "!="].includes(c.op) || typeof c.value !== "boolean")
      return `field "${c.field}" only supports ==/!= with a boolean value`;
  } else if (ARRAY_FIELDS.has(c.field)) {
    if (c.op !== "in" && typeof c.value !== "string")
      return `field "${c.field}" requires a string or string array`;
  } else if (c.op !== "in" && typeof c.value !== "string") {
    return `field "${c.field}" requires a string value`;
  }
  const enumValues = PROFILE_ENUMS[c.field];
  if (enumValues) {
    const values = Array.isArray(c.value) ? c.value : [c.value];
    if (values.some((v) => typeof v !== "string" || !enumValues.includes(v)))
      return `condition value is not valid for enum field "${c.field}"`;
  }
  return undefined;
}

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

/** True when at least one alternative condition holds, or when no alternatives were supplied. */
export function anyHold(conditions: Applicability[] | undefined, p: ResolvedProfile): boolean {
  return !conditions?.length || conditions.some((c) => holds(c, p));
}
