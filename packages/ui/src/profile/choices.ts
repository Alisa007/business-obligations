import { ENTITY_TYPES, LLC_TAX_CLASSIFICATIONS, PROFESSIONS } from "business-obligations";

export const MAX_EMPLOYEES = 10_000;

// ---- How one choice is kept in the address ----

/**
 * One choice of the profile: the URL parameter it lives in, what "not answered" is, and how to read and write its
 * value. Everything else (the type of `ProfileChoices`, the defaults, the parameter names, reading and writing the
 * address) is derived from the table of these below, so a choice is described once.
 */
interface Spec<T, Kind extends string = string> {
  param: string;
  /** The value of a choice that has not been given. */
  initial: T;
  /** The value of a parameter that is there but empty ("not given", told apart from a default that says otherwise). */
  cleared: T;
  /** The value a non-empty parameter stands for, or `undefined` when it is not valid. */
  parse: (raw: string) => { value: T } | undefined;
  write: (value: T) => string;
  /** An empty value is left out of the address instead of being written as an empty parameter. */
  dropEmpty?: boolean;
  /** What sort of choice it is; the lists of details and of numbers are made from it. */
  kind: Kind;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT = /^\d{1,12}(\.\d{1,2})?$/;
const WHOLE = /^\d{1,9}$/;

/** One of `options`, or "not chosen". */
const oneOf = <T extends string>(param: string, options: readonly T[]): Spec<T | undefined, "choice"> => ({
  param,
  kind: "choice",
  initial: undefined,
  cleared: undefined,
  parse: (raw) => ((options as readonly string[]).includes(raw) ? { value: raw as T } : undefined),
  write: (value) => value ?? "",
});

/** An amount (`12`, `12.5`) or, with `whole`, a count (`12`), possibly limited to `range`; "not given" when empty. */
const number = (
  param: string,
  { whole = false, range }: { whole?: boolean; range?: [number, number] } = {},
): Spec<number | undefined, "number"> => ({
  param,
  initial: undefined,
  cleared: undefined,
  kind: "number",
  parse: (raw) => {
    if (!(whole ? WHOLE : AMOUNT).test(raw)) return undefined;
    const value = Number(raw);
    if (!range) return { value };
    return value >= range[0] && value <= range[1] ? { value } : undefined;
  },
  write: (value) => (value === undefined ? "" : String(value)),
});

/** A count that is capped, not refused, when it is too big (head counts). */
const capped = (param: string, max: number): Spec<number | undefined, "number"> => {
  const base = number(param, { whole: true });
  return {
    ...base,
    parse: (raw) => ((parsed) => parsed && { value: Math.min(max, parsed.value as number) })(base.parse(raw)),
  };
};

/** Yes (`1`), no (`0`) or not answered yet. */
const answer = (param: string): Spec<boolean | undefined, "detail"> => ({
  param,
  initial: undefined,
  cleared: undefined,
  kind: "detail",
  parse: (raw) =>
    raw === "1" || raw === "true"
      ? { value: true }
      : raw === "0" || raw === "false"
        ? { value: false }
        : undefined,
  write: (value) => (value === undefined ? "" : value ? "1" : "0"),
});

/** Text that matches `pattern`, or `clean`ed into it; "" when there is none. */
const text = (
  param: string,
  accept: (raw: string) => string | undefined,
  dropEmpty = false,
): Spec<string, "text"> => ({
  param,
  kind: "text",
  initial: "",
  cleared: "",
  dropEmpty,
  parse: (raw) => ((value) => (value === undefined ? undefined : { value }))(accept(raw)),
  write: (value) => value,
});

/** A date that exists (`2020-02-30` does not, and the engine refuses it). */
const isRealDate = (raw: string) => {
  const date = new Date(`${raw}T00:00:00Z`);
  return ISO_DATE.test(raw) && !Number.isNaN(date.getTime()) && date.toISOString().startsWith(raw);
};

const isoDate = (param: string): Spec<string, "text"> =>
  text(param, (raw) => (isRealDate(raw) ? raw : undefined), true);

/** Only the first five digits of what is given: a ZIP code that is being typed is still a ZIP code. */
const zipCode = (param: string): Spec<string, "text"> =>
  text(param, (raw) => raw.replace(/\D/g, "").slice(0, 5), true);

/** Whether something is so: `1` or `0`. */
const flag = (param: string, initial: boolean): Spec<boolean, "flag"> => ({
  param,
  kind: "flag",
  initial,
  cleared: false,
  parse: (raw) => ({ value: raw === "1" }),
  write: (value) => (value ? "1" : "0"),
});

// ---- The table: every choice, in the order the form asks for them ----

const SPECS = {
  zip: zipCode("zip"),
  /** `undefined` means none chosen. */
  entityType: oneOf("type", ENTITY_TYPES),
  /** NAICS code of the business, 2 to 6 digits (fewer while it is being typed), or "" for none. */
  naics: text("naics", (raw) => (/^\d{1,6}$/.test(raw) ? raw : undefined)),
  profession: oneOf("profession", PROFESSIONS),
  llcTaxClassification: oneOf("llcTax", LLC_TAX_CLASSIFICATIONS),
  /** False for a business that has not been formed yet (the default). */
  isFormed: flag("formed", false),
  /** ISO date, or "". Only meaningful for a business that is formed. */
  formationDate: isoDate("formedOn"),
  /** ISO date the plan starts from, or "" for today. */
  asOf: isoDate("start"),
  /** ISO date the business wants to open, or "". */
  openingDate: isoDate("opening"),
  employeeCount: capped("employees", MAX_EMPLOYEES),
  fullTimeEmployeeCount: capped("fullTime", MAX_EMPLOYEES),
  ownerCount: number("owners", { whole: true }),
  annualPayroll: number("payroll"),
  annualRevenue: number("revenue"),
  annualNetIncome: number("netIncome"),
  largestContractorPaymentUsd: number("contractor"),
  priorYearPayrollTaxLiability: number("priorTax"),
  /** 1 to 12. */
  fiscalYearEndMonth: number("fiscalMonth", { whole: true, range: [1, 12] }),
  /** Each yes/no detail is `true` (yes), `false` (no) or `undefined` (not answered yet). */
  sellsTaxableGoods: answer("sells"),
  homeBased: answer("home"),
  usesTradeName: answer("tradeName"),
  hasTaxExemptStatus: answer("exempt"),
  hasSignage: answer("signage"),
  foodService: answer("food"),
  sCorpElection: answer("sElection"),
} as const;

type Specs = typeof SPECS;
type ProfileKey = keyof Specs;
type ValueOf<S> = S extends Spec<infer T> ? T : never;
type KeysOf<Kind extends string> = {
  [K in ProfileKey]: Specs[K] extends { kind: Kind } ? K : never;
}[ProfileKey];

/**
 * What the form edits: the `BusinessProfile` fields behind it, plus the two dates of a plan. `undefined` (or "")
 * means the question is not answered yet, which the engine treats as unknown.
 */
export type ProfileChoices = { [K in ProfileKey]: ValueOf<Specs[K]> };

/** The yes/no facts a person can tick, each a `BusinessProfile` field of the same name. */
export type DetailField = KeysOf<"detail">;
/** The optional amounts and counts, each a `BusinessProfile` field of the same name. */
export type NumberField = KeysOf<"number">;

const KEYS = Object.keys(SPECS) as ProfileKey[];
const spec = (key: ProfileKey): Spec<unknown> => SPECS[key] as Spec<unknown>;
const keysIn = <Kind extends string>(kind: Kind) =>
  KEYS.filter((key) => spec(key).kind === kind) as KeysOf<Kind>[];

export const DETAIL_FIELDS: readonly DetailField[] = keysIn("detail");
export const NUMBER_FIELDS: readonly NumberField[] = keysIn("number");

const derive = <T>(pick: (spec: Spec<unknown>) => T) =>
  Object.fromEntries(KEYS.map((key) => [key, pick(spec(key))])) as { [K in ProfileKey]: T };

export const PROFILE_DEFAULTS = derive((s) => s.initial) as unknown as ProfileChoices;

/** The URL parameter each choice lives in. Short, so a shared link stays readable. */
export const PROFILE_PARAMS: { readonly [K in ProfileKey]: string } = derive((s) => s.param);

// ---- Links made before the form came from this package ----

/** Names that links used before; they are read, and removed when the form writes. */
const LEGACY_PARAMS: Record<string, string> = { entity: "type", goods: "sells", dba: "tradeName" };
/** Links made when the form had an industry list carry `industry=restaurant`; these are the codes that mean the same. */
const LEGACY_INDUSTRY: Record<string, string> = {
  retail: "44",
  restaurant: "722",
  construction: "23",
  healthcare: "621",
  real_estate: "531",
  professional_services: "5411",
  childcare: "6244",
};

/** Whether a query string uses a name that is no longer written (so the address should be rewritten). */
export const hasLegacyParams = (search: string): boolean => {
  const query = new URLSearchParams(search);
  return query.has("industry") || Object.keys(LEGACY_PARAMS).some((name) => query.has(name));
};

/** The query with the old names changed to the current ones (a current name wins over an old one). */
function withCurrentNames(query: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(query);
  for (const [old, current] of Object.entries(LEGACY_PARAMS))
    if (next.has(old)) {
      if (!next.has(current)) next.set(current, next.get(old) as string);
      next.delete(old);
    }
  const industry = LEGACY_INDUSTRY[next.get("industry") ?? ""];
  if (!next.has(PROFILE_PARAMS.naics) && industry) next.set(PROFILE_PARAMS.naics, industry);
  next.delete("industry");
  return next;
}

// ---- Reading and writing the address ----

/** The choices a query string holds. Anything missing or not valid falls back to `defaults`. */
export function readProfileQuery(
  search: string,
  defaults: ProfileChoices = PROFILE_DEFAULTS,
): ProfileChoices {
  const query = withCurrentNames(new URLSearchParams(search));
  const choices: Record<string, unknown> = {};
  for (const key of KEYS) {
    const { param, cleared, parse } = spec(key);
    const raw = query.get(param);
    choices[key] = raw === null ? defaults[key] : raw === "" ? cleared : (parse(raw)?.value ?? defaults[key]);
  }
  return choices as ProfileChoices;
}

/**
 * The query string with `choices` written into it. Other parameters are kept, and a choice equal to its default is
 * left out, so the URL of an untouched page stays clean. Returns "" or a string that starts with "?".
 */
export function writeProfileQuery(
  search: string,
  choices: ProfileChoices,
  defaults: ProfileChoices = PROFILE_DEFAULTS,
): string {
  const query = new URLSearchParams(search);
  // the old names would be read again if the current one is left out for being the default
  for (const old of [...Object.keys(LEGACY_PARAMS), "industry"]) query.delete(old);
  for (const key of KEYS) {
    const { param, write, dropEmpty } = spec(key);
    const value = choices[key];
    if (value === defaults[key] || (dropEmpty && value === "")) query.delete(param);
    // "Not given" is an empty value, so it can be told apart from a default that says otherwise.
    else query.set(param, write(value));
  }
  const next = query.toString();
  return next ? `?${next}` : "";
}
