import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { PROFILE_DEFAULTS, readProfileQuery, writeProfileQuery, type ProfileChoices } from "./choices";
import { lookupPlace, type Place } from "./place";

/** What a host can tell the form: any of the choices, and where the business is, as a ZIP code or as city, county and state. */
export type ProfileValues = Partial<ProfileChoices> & Partial<Place>;

const PLACE_KEYS = ["city", "county", "state"] as const;

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
  /** Parts of the place the host has settled. */
  place: Partial<Place>;
}

const Context = /* @__PURE__ */ createContext<ProfileContext>({
  defaults: PROFILE_DEFAULTS,
  fixed: {},
  place: {},
});

/**
 * `defaults` is what the inputs show, and what the URL leaves out, when the address has no query (otherwise
 * `PROFILE_DEFAULTS`). `values` are choices the host already knows, for example a ZIP code on a page for one city:
 * they replace whatever the address says, `useProfileChoices` returns them, and `ProfileForm` hides their fields.
 * A place can be given as `zip`, or as `city`, `county` and `state` (the ZIP field is then hidden too, even for only one of the three); see
 * `useProfilePlace`.
 */
export function ProfileQueryProvider({
  defaults,
  values,
  children,
}: {
  defaults?: Partial<ProfileChoices>;
  values?: ProfileValues;
  children: ReactNode;
}) {
  // a provider inside another one adds to it
  const parent = useContext(Context);
  const merged = useMemo(() => ({ ...parent.defaults, ...defaults }), [parent.defaults, defaults]);
  const given = useMemo(
    () => Object.entries(values ?? {}).filter(([, value]) => value !== undefined),
    [values],
  );
  const fixed = useMemo(
    () => ({
      ...parent.fixed,
      ...Object.fromEntries(given.filter(([key]) => !(PLACE_KEYS as readonly string[]).includes(key))),
    }),
    [parent.fixed, given],
  ) as Partial<ProfileChoices>;
  const place = useMemo(
    () => ({
      ...parent.place,
      ...Object.fromEntries(given.filter(([key]) => (PLACE_KEYS as readonly string[]).includes(key))),
    }),
    [parent.place, given],
  ) as Partial<Place>;
  const context = useMemo(() => ({ defaults: merged, fixed, place }), [merged, fixed, place]);
  return <Context.Provider value={context}>{children}</Context.Provider>;
}

const hasPlace = (place: Partial<Place>) => PLACE_KEYS.every((key) => place[key]);

/** The keys of the choices the host has passed as `values`; `zip` is among them when any of the place is given. */
export function useFixedChoices(): ReadonlySet<keyof ProfileChoices> {
  const { fixed, place } = useContext(Context);
  return useMemo(() => {
    const keys = new Set(Object.keys(fixed) as (keyof ProfileChoices)[]);
    if (PLACE_KEYS.some((key) => place[key])) keys.add("zip");
    return keys;
  }, [fixed, place]);
}

/**
 * Where the business is, as the engine wants it: `city`, `county` and `state` the host passed, filled in from the ZIP
 * code (given or typed) for what it did not. `undefined` while it is not known yet (no complete ZIP, or the lookup is
 * running), and `null` for a ZIP code that does not exist and no place that makes up for it.
 */
export function useProfilePlace(): Place | undefined | null {
  const { place: fixedPlace } = useContext(Context);
  const [{ zip }] = useProfileChoices();
  const [found, setFound] = useState<Place | undefined | null>();
  const complete = hasPlace(fixedPlace);
  useEffect(() => {
    if (complete || !/^\d{5}$/.test(zip)) {
      setFound(undefined);
      return;
    }
    let current = true;
    void lookupPlace(zip).then((place) => current && setFound(place ?? null));
    return () => {
      current = false;
    };
  }, [zip, complete]);
  return useMemo(() => {
    if (complete) return fixedPlace as Place;
    if (!found) return found;
    return { ...found, ...fixedPlace };
  }, [complete, fixedPlace, found]);
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
