import {
  ALCOHOL_ACTIVITIES,
  CANNABIS_ACTIVITIES,
  ENTITY_TYPES,
  INDUSTRIES,
  LLC_TAX_CLASSIFICATIONS,
  PROFESSIONS,
} from "./enums";
import { isIsoDate } from "./iso";

/** One problem found in a business profile. */
export interface ProfileIssue {
  /** Dotted path of the field, e.g. `multistate[0].state`. */
  field: string;
  message: string;
  /** A likely intended value or field name, when there is one. */
  suggestion?: string;
}

const ENUMS: Record<string, readonly string[]> = {
  entityType: ENTITY_TYPES,
  llcTaxClassification: LLC_TAX_CLASSIFICATIONS,
  industry: INDUSTRIES,
  alcoholActivity: ALCOHOL_ACTIVITIES,
  cannabisActivity: CANNABIS_ACTIVITIES,
  profession: PROFESSIONS,
};

type Kind =
  "string" | "stringArray" | "boolean" | "number" | "integer" | "date" | "enum" | "multistate" | "vehicles";

const FIELDS: Record<string, Kind> = {
  country: "string",
  entityType: "enum",
  zip: "string",
  city: "string",
  county: "string",
  state: "string",
  formationState: "string",
  multistate: "multistate",
  llcTaxClassification: "enum",
  sCorpElection: "boolean",
  formationDate: "date",
  dissolutionDate: "date",
  fiscalYearEndMonth: "integer",
  isFormed: "boolean",
  industry: "enum",
  alcoholActivity: "enum",
  cannabisActivity: "enum",
  commercialVehicles: "vehicles",
  ownerCount: "integer",
  employeeCount: "integer",
  fullTimeEmployeeCount: "integer",
  annualPayroll: "number",
  priorYearPayrollTaxLiability: "number",
  largestContractorPaymentUsd: "number",
  sellsTaxableGoods: "boolean",
  homeBased: "boolean",
  usesTradeName: "boolean",
  profession: "enum",
  hasTaxExemptStatus: "boolean",
  annualRevenue: "number",
  annualNetIncome: "number",
  naics: "string",
  activities: "stringArray",
  projectValueUsd: "number",
  disturbedAcres: "number",
  licenseClass: "string",
  floorAreaSqFt: "number",
  hasSignage: "boolean",
  foodService: "boolean",
};

/** Profile field names, for tooling and tests. */
export const PROFILE_FIELDS: readonly string[] = Object.keys(FIELDS);
/** Allowed values of the enumerated fields. */
export const PROFILE_ENUMS: Readonly<Record<string, readonly string[]>> = ENUMS;

const STATE = /^[A-Za-z]{2}$/;

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

/** The closest candidate to `value`, when it is close enough to be a likely typo. */
function closest(value: string, candidates: readonly string[]): string | undefined {
  const v = value.toLowerCase().replace(/[\s-]+/g, "_");
  let best: { c: string; d: number } | undefined;
  for (const c of candidates) {
    const lc = c.toLowerCase();
    // A truncated name ("employes") is close to the start of the real one.
    const d = Math.min(distance(v, lc), distance(v, lc.slice(0, v.length)) + 1);
    if (!best || d < best.d) best = { c, d };
  }
  return best && best.d <= Math.max(2, Math.floor(v.length / 4)) ? best.c : undefined;
}

const typeName = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

function checkValue(field: string, kind: Kind, value: unknown, issues: ProfileIssue[]): void {
  const add = (message: string, suggestion?: string) =>
    issues.push({ field, message, ...(suggestion ? { suggestion } : {}) });
  switch (kind) {
    case "string":
      if (typeof value !== "string") add(`\`${field}\` must be a string, got ${typeName(value)}`);
      else if (/(^|\.)(state|formationState)$/.test(field)) {
        if (!STATE.test(value)) add(`\`${field}\` must be a two-letter state code, got "${value}"`);
      }
      break;
    case "boolean":
      if (typeof value !== "boolean") {
        const hint = value === "true" || value === "false" ? String(value === "true") : undefined;
        add(`\`${field}\` must be true or false, got ${typeName(value)}`, hint);
      }
      break;
    case "number":
    case "integer":
      if (typeof value !== "number" || Number.isNaN(value)) {
        const parsed = typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
        add(
          `\`${field}\` must be a number, got ${typeName(value)}`,
          Number.isNaN(parsed) ? undefined : String(parsed),
        );
      } else if (value < 0) add(`\`${field}\` must not be negative`);
      else if (kind === "integer" && !Number.isInteger(value)) add(`\`${field}\` must be a whole number`);
      break;
    case "date":
      if (!isIsoDate(value)) add(`\`${field}\` must be a date in YYYY-MM-DD form`);
      break;
    case "enum": {
      const allowed = ENUMS[field.split(".").pop()!]!;
      if (typeof value !== "string" || !allowed.includes(value)) {
        const s = typeof value === "string" ? closest(value, allowed) : undefined;
        add(`\`${field}\` must be one of ${allowed.join(", ")}; got ${JSON.stringify(value)}`, s);
      }
      break;
    }
    case "stringArray":
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string"))
        add(`\`${field}\` must be an array of strings`);
      break;
    case "multistate":
      if (!Array.isArray(value)) {
        add("`multistate` must be an array");
        break;
      }
      value.forEach((entry, i) => {
        const p = `${field}[${i}]`;
        if (typeof entry !== "object" || entry === null) return add(`\`${p}\` must be an object`);
        const e = entry as Record<string, unknown>;
        if (typeof e.state !== "string" || !STATE.test(e.state))
          issues.push({ field: `${p}.state`, message: `\`${p}.state\` must be a two-letter state code` });
        for (const k of ["employeeCount", "salesUsd"]) {
          if (e[k] !== undefined)
            checkValue(`${p}.${k}`, k === "employeeCount" ? "integer" : "number", e[k], issues);
        }
        if (e.hasProperty !== undefined) checkValue(`${p}.hasProperty`, "boolean", e.hasProperty, issues);
        for (const k of Object.keys(e)) {
          if (!["state", "employeeCount", "salesUsd", "hasProperty"].includes(k))
            issues.push({
              field: `${p}.${k}`,
              message: `Unknown field \`${p}.${k}\``,
              ...(closest(k, ["state", "employeeCount", "salesUsd", "hasProperty"])
                ? { suggestion: closest(k, ["state", "employeeCount", "salesUsd", "hasProperty"]) }
                : {}),
            });
        }
      });
      break;
    case "vehicles": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        add("`commercialVehicles` must be an object");
        break;
      }
      const v = value as Record<string, unknown>;
      if (typeof v.interstate !== "boolean")
        issues.push({
          field: `${field}.interstate`,
          message: `\`${field}.interstate\` is required and must be true or false`,
        });
      for (const k of ["grossWeightLbs", "passengerCapacity"])
        if (v[k] !== undefined) checkValue(`${field}.${k}`, "number", v[k], issues);
      for (const k of ["carriesHazmat", "forHire"])
        if (v[k] !== undefined) checkValue(`${field}.${k}`, "boolean", v[k], issues);
      break;
    }
  }
}

/**
 * Checks a profile's shape and values without evaluating it, and returns every problem found (an empty array
 * means the profile is well formed). Useful in plain JavaScript, where nothing else catches `employes: 5` or
 * `entityType: "LLC"`. Unknown fields are reported with a suggestion when one is close.
 */
export function validateProfile(input: unknown): ProfileIssue[] {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return [{ field: "", message: "A business profile must be an object" }];
  const issues: ProfileIssue[] = [];
  const profile = input as Record<string, unknown>;
  for (const required of ["entityType", "zip", "city", "county"]) {
    if (profile[required] === undefined || profile[required] === "")
      issues.push({ field: required, message: `\`${required}\` is required` });
  }
  for (const [key, value] of Object.entries(profile)) {
    if (value === undefined) continue;
    const kind = FIELDS[key];
    if (!kind) {
      const s = closest(key, PROFILE_FIELDS);
      issues.push({
        field: key,
        message: `Unknown field \`${key}\`${s ? `; did you mean \`${s}\`?` : ""}`,
        ...(s ? { suggestion: s } : {}),
      });
      continue;
    }
    checkValue(key, kind, value, issues);
  }
  return issues;
}
