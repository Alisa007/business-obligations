import { ENTITY_TYPES, PROFESSIONS, type FormValues } from "./plan";

/** Everything in the left sidebar. The URL query string is the single source of truth for these values. */
export interface SidebarState {
  form: FormValues;
  /** "Start / today". Empty means today. */
  asOf: string;
  openingDate: string;
}

export const EMPTY_FORM: FormValues = {
  // Only the two most common answers are pre-selected; everything the user alone knows starts empty, and the
  // engine treats an empty number as "unknown" and lists what would change.
  zip: "",
  entityType: "llc",
  naics: "",
  profession: "",
  employees: "",
  payroll: "",
  revenue: "",
  owners: "",
  sellsGoods: false,
  homeBased: false,
  tradeName: false,
  isNew: true,
  formationDate: "",
};

export const EMPTY_STATE: SidebarState = { form: EMPTY_FORM, asOf: "", openingDate: "" };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Lenient on purpose: the URL holds what is being typed, so "12." and "" must survive a round trip.
const NUMBER = /^\d{0,12}\.?\d{0,2}$/;
const oneOf = (value: string | null, options: Array<[string, string]>, fallback: string): string =>
  value !== null && options.some(([k]) => k === value) ? value : fallback;

/** Links made before NAICS codes took over the industry list carry `industry=restaurant`; these are the codes that mean the same. */
const LEGACY_INDUSTRY: Record<string, string> = {
  retail: "44",
  restaurant: "722",
  construction: "23",
  healthcare: "621",
  real_estate: "531",
  professional_services: "5411",
  childcare: "6244",
};
const naicsFromQuery = (naics: string | null, legacyIndustry: string | null): string =>
  naics !== null && /^\d{2,6}$/.test(naics)
    ? naics
    : naics === null
      ? (LEGACY_INDUSTRY[legacyIndustry ?? ""] ?? "")
      : "";

/** Query parameter for each sidebar field, in the order they are written. */
const TEXT = [
  ["zip", "zip"],
  ["entityType", "entity"],
  ["naics", "naics"],
  ["profession", "profession"],
  ["employees", "employees"],
  ["owners", "owners"],
  ["payroll", "payroll"],
  ["revenue", "revenue"],
] as const;
const FLAGS = [
  ["sellsGoods", "goods"],
  ["homeBased", "home"],
  ["tradeName", "dba"],
] as const;

/**
 * Reads the sidebar state from a query string. Every value is validated, so a hand-edited or stale link falls
 * back to the default for that field instead of breaking the page.
 */
export function parseQuery(search: string): SidebarState {
  const q = new URLSearchParams(search);
  const text = (name: string) => q.get(name)?.trim() ?? null;
  const num = (name: string) => {
    const v = text(name);
    return v !== null && NUMBER.test(v) ? v : "";
  };
  const date = (name: string) => {
    const v = text(name);
    return v !== null && ISO_DATE.test(v) ? v : "";
  };
  const formed = q.get("formed") === "1";
  return {
    form: {
      zip: (text("zip") ?? "").replace(/\D/g, "").slice(0, 5),
      entityType: oneOf(text("entity"), ENTITY_TYPES, EMPTY_FORM.entityType),
      naics: naicsFromQuery(text("naics"), text("industry")),
      profession: oneOf(text("profession"), PROFESSIONS, ""),
      employees: num("employees"),
      owners: num("owners"),
      payroll: num("payroll"),
      revenue: num("revenue"),
      sellsGoods: q.get("goods") === "1",
      homeBased: q.get("home") === "1",
      tradeName: q.get("dba") === "1",
      isNew: !formed,
      formationDate: formed ? date("formedOn") : "",
    },
    asOf: date("start"),
    openingDate: date("opening"),
  };
}

/** Writes the sidebar state as a query string (without the leading "?"), leaving out defaults and empty values. */
export function toQuery({ form, asOf, openingDate }: SidebarState): string {
  const q = new URLSearchParams();
  for (const [field, name] of TEXT) {
    const value = form[field].trim();
    if (value !== "" && value !== EMPTY_FORM[field]) q.set(name, value);
  }
  for (const [field, name] of FLAGS) if (form[field]) q.set(name, "1");
  if (!form.isNew) {
    q.set("formed", "1");
    if (form.formationDate) q.set("formedOn", form.formationDate);
  }
  if (asOf) q.set("start", asOf);
  if (openingDate) q.set("opening", openingDate);
  return q.toString();
}

/** Whether the state has enough to run an analysis straight away (used to open shared links with results). */
export const isRunnable = (s: SidebarState): boolean => /^\d{5}$/.test(s.form.zip);
