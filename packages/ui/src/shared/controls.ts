import { useMedia } from "tamagui";

/** Touch-sized controls on phones (16px text also stops iOS zooming on focus); compact from the `md` breakpoint up. */
const useCompact = () => useMedia().md;

/** Height and text size of the Tamagui `Input` and `Select`. */
export function useControlProps() {
  const compact = useCompact();
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
