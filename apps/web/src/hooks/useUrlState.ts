"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { parseQuery, toQuery, type SidebarState } from "../lib/query";

const CHANGE = "sidebar-url-change";

const subscribe = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  window.addEventListener(CHANGE, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(CHANGE, notify);
  };
};

/**
 * The sidebar inputs, read from and written to the URL query string. The URL is the single source of truth:
 * there is no separate form state, links reproduce the form, and Back/Forward move between edits that were
 * pushed (typing replaces the entry so the history is not flooded).
 */
export function useUrlState(): [SidebarState, (next: SidebarState) => void] {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  const state = useMemo(() => parseQuery(search), [search]);
  const setState = useCallback((next: SidebarState) => {
    const query = toQuery(next);
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(CHANGE));
  }, []);
  return [state, setState];
}
