import { useMedia } from "tamagui";

/**
 * Height and text size of the Tamagui `Input`, `Select` and date button: touch-sized on phones (16px text also stops
 * iOS zooming on focus), compact from the `md` breakpoint up. These are media rules in the stylesheet, not a check
 * made after hydration, so the server's HTML already has the final size and nothing moves when the page starts.
 */
// (Tamagui takes `{ default, md }` for any style prop at run time, but types `Input`'s as a plain number.)
const CONTROL_PROPS = {
  height: { default: 44, md: 36 },
  fontSize: { default: 16, md: 14 },
} as unknown as { height: number; fontSize: number };
export const useControlProps = () => CONTROL_PROPS;

/** The same sizes as numbers, for the browser's own `<select>` (touch screens only, so after hydration anyway). */
export function useControlMetrics() {
  const compact = useMedia().md;
  return { height: compact ? 36 : 44, fontSize: compact ? 14 : 16 } as const;
}

/** Hides an element from sight but not from screen readers. */
export const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;
