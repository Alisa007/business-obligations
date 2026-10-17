import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { ENTITY_TYPES, INDUSTRIES, type EntityType, type Industry } from "business-obligations";

/**
 * The yes/no facts a person can tick about their business, each a `BusinessProfile` field of the same name.
 * (`isFormed`, "not formed yet", is not one of them: it is a stage, not a detail.)
 */
export const DETAIL_FIELDS = [
  "sellsTaxableGoods",
  "homeBased",
  "usesTradeName",
  "hasTaxExemptStatus",
  "hasSignage",
  "foodService",
  "sCorpElection",
] as const;
export type DetailField = (typeof DETAIL_FIELDS)[number];

/** What the inputs edit: the `BusinessProfile` fields behind them, with every one filled in. */
export type ProfileChoices = {
  entityType: EntityType;
  industry: Industry;
  employeeCount: number;
} & Record<DetailField, boolean>;

export const MAX_EMPLOYEES = 10_000;

export const PROFILE_DEFAULTS: ProfileChoices = {
  entityType: "llc",
  industry: "general",
  employeeCount: 0,
  sellsTaxableGoods: false,
  homeBased: false,
  usesTradeName: false,
  hasTaxExemptStatus: false,
  hasSignage: false,
  foodService: false,
  sCorpElection: false,
};

/** The URL parameter each choice lives in. Short, so a shared link stays readable. */
export const PROFILE_PARAMS = {
  entityType: "type",
  industry: "industry",
  employeeCount: "employees",
  sellsTaxableGoods: "sells",
  homeBased: "home",
  usesTradeName: "tradeName",
  hasTaxExemptStatus: "exempt",
  hasSignage: "signage",
  foodService: "food",
  sCorpElection: "sElection",
} as const satisfies Record<keyof ProfileChoices, string>;

const clampEmployees = (value: number) => Math.min(MAX_EMPLOYEES, Math.max(0, Math.floor(value) || 0));

function readBoolean(value: string | null, fallback: boolean) {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return fallback;
}

/** The choices a query string holds. Anything missing or not valid falls back to `defaults`. */
export function readProfileQuery(
  search: string,
  defaults: ProfileChoices = PROFILE_DEFAULTS,
): ProfileChoices {
  const query = new URLSearchParams(search);
  const type = query.get(PROFILE_PARAMS.entityType);
  const industry = query.get(PROFILE_PARAMS.industry);
  const employees = query.get(PROFILE_PARAMS.employeeCount);
  const choices: ProfileChoices = {
    ...defaults,
    entityType: (ENTITY_TYPES as readonly string[]).includes(type ?? "")
      ? (type as EntityType)
      : defaults.entityType,
    industry: (INDUSTRIES as readonly string[]).includes(industry ?? "")
      ? (industry as Industry)
      : defaults.industry,
    employeeCount:
      employees !== null && /^\d+$/.test(employees)
        ? clampEmployees(Number(employees))
        : defaults.employeeCount,
  };
  for (const field of DETAIL_FIELDS)
    choices[field] = readBoolean(query.get(PROFILE_PARAMS[field]), defaults[field]);
  return choices;
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
  for (const key of Object.keys(PROFILE_PARAMS) as (keyof ProfileChoices)[]) {
    const param = PROFILE_PARAMS[key];
    if (choices[key] === defaults[key]) query.delete(param);
    else
      query.set(param, typeof choices[key] === "boolean" ? (choices[key] ? "1" : "0") : String(choices[key]));
  }
  const next = query.toString();
  return next ? `?${next}` : "";
}

const CHANGE_EVENT = "business-obligations:profile-query";

const subscribe = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(CHANGE_EVENT, notify);
  };
};

const currentSearch = () => window.location.search;
// On the server and while hydrating there is no URL to read yet: every input shows its default, then updates.
const serverSearch = () => "";

/**
 * Puts `patch` into the address bar with `history.replaceState` (no new history entry and no page load), then tells
 * every input on the page. Works in any framework, and Next.js keeps `useSearchParams` in step with it.
 */
export function setProfileQuery(patch: Partial<ProfileChoices>, defaults: ProfileChoices = PROFILE_DEFAULTS) {
  if (typeof window === "undefined") return;
  const { pathname, search, hash } = window.location;
  const next = writeProfileQuery(search, { ...readProfileQuery(search, defaults), ...patch }, defaults);
  if (next === search) return;
  window.history.replaceState(window.history.state, "", `${pathname}${next}${hash}`);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const DefaultsContext = createContext<ProfileChoices>(PROFILE_DEFAULTS);

/**
 * Sets what the inputs show, and what the URL leaves out, when the address has no query. Without one, the defaults
 * are `PROFILE_DEFAULTS`.
 */
export function ProfileQueryProvider({
  defaults,
  children,
}: {
  defaults?: Partial<ProfileChoices>;
  children: ReactNode;
}) {
  const merged = useMemo(() => ({ ...PROFILE_DEFAULTS, ...defaults }), [defaults]);
  return <DefaultsContext.Provider value={merged}>{children}</DefaultsContext.Provider>;
}

/**
 * The business details in the address bar, and a function that changes them there. Every input from this package
 * uses it, so a host that wants the same values (to build a plan, say) calls it too.
 */
export function useProfileChoices(): [ProfileChoices, (patch: Partial<ProfileChoices>) => void] {
  const defaults = useContext(DefaultsContext);
  const search = useSyncExternalStore(subscribe, currentSearch, serverSearch);
  const choices = useMemo(() => readProfileQuery(search, defaults), [search, defaults]);
  const set = useCallback((patch: Partial<ProfileChoices>) => setProfileQuery(patch, defaults), [defaults]);
  return [choices, set];
}
