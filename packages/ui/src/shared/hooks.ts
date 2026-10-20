import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server (where a layout effect only warns). For a change that
 * has to be made before the browser paints, such as applying a saved theme: an effect would let one frame show the
 * default first.
 */
export const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

const noSubscription = () => () => {};

/**
 * False on the server and while hydrating, true once the page is running. For what depends on the address, the
 * browser's storage or its settings, none of which the server's HTML can know: keep the space, hide it until this is
 * true, and it appears already right instead of showing a default and changing.
 */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
