import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { PROFILE_DEFAULTS, readProfileQuery, writeProfileQuery, type ProfileChoices } from "./choices";

/** Dispatched on `window` after the inputs change the address, for a host that keeps other state in the same URL. */
export const PROFILE_QUERY_EVENT = "business-obligations:profile-query";
const CHANGE_EVENT = PROFILE_QUERY_EVENT;

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

interface ProfileContext {
  defaults: ProfileChoices;
  /** Choices the host has settled: they override the address, and their fields are not shown. */
  fixed: Partial<ProfileChoices>;
}

const Context = /* @__PURE__ */ createContext<ProfileContext>({ defaults: PROFILE_DEFAULTS, fixed: {} });

/**
 * `defaults` is what the inputs show, and what the URL leaves out, when the address has no query (otherwise
 * `PROFILE_DEFAULTS`). `values` are choices the host already knows, for example a ZIP code on a page for one city:
 * they replace whatever the address says, `useProfileChoices` returns them, and `ProfileForm` hides their fields.
 */
export function ProfileQueryProvider({
  defaults,
  values,
  children,
}: {
  defaults?: Partial<ProfileChoices>;
  values?: Partial<ProfileChoices>;
  children: ReactNode;
}) {
  // a provider inside another one adds to it
  const parent = useContext(Context);
  const merged = useMemo(() => ({ ...parent.defaults, ...defaults }), [parent.defaults, defaults]);
  const fixed = useMemo(
    () => ({
      ...parent.fixed,
      ...Object.fromEntries(Object.entries(values ?? {}).filter(([, value]) => value !== undefined)),
    }),
    [parent.fixed, values],
  ) as Partial<ProfileChoices>;
  const context = useMemo(() => ({ defaults: merged, fixed }), [merged, fixed]);
  return <Context.Provider value={context}>{children}</Context.Provider>;
}

/** The keys of the choices the host has passed as `values`. */
export function useFixedChoices(): ReadonlySet<keyof ProfileChoices> {
  const { fixed } = useContext(Context);
  return useMemo(() => new Set(Object.keys(fixed) as (keyof ProfileChoices)[]), [fixed]);
}

/**
 * The business details in the address bar, and a function that changes them there. Every input from this package
 * uses it, so a host that wants the same values (to build a plan, say) calls it too. Values the host passed to
 * `ProfileQueryProvider` take the place of the address's, and cannot be changed.
 */
export function useProfileChoices(): [ProfileChoices, (patch: Partial<ProfileChoices>) => void] {
  const { defaults, fixed } = useContext(Context);
  const search = useSyncExternalStore(subscribe, currentSearch, serverSearch);
  const choices = useMemo(
    () => ({ ...readProfileQuery(search, defaults), ...fixed }),
    [search, defaults, fixed],
  );
  const set = useCallback(
    (patch: Partial<ProfileChoices>) => {
      const open = Object.fromEntries(Object.entries(patch).filter(([key]) => !(key in fixed)));
      setProfileQuery(open as Partial<ProfileChoices>, defaults);
    },
    [defaults, fixed],
  );
  return [choices, set];
}
