import type { CSSProperties, ReactNode } from "react";

export interface CheckBoxProps {
  /** `id` of the box, for a `<label htmlFor>`. */
  id: string;
  /** Checked, not checked, or "mixed": not answered yet. */
  checked: boolean | "mixed";
  onChange: () => void;
  /** What is drawn in the box. By default a ✓ when checked and nothing otherwise. */
  mark?: ReactNode;
  /** A CSS color for the mark; by default the accent's text color when checked and the text color otherwise. */
  markColor?: string;
  /** A dashed border: the question is still open. */
  dashed?: boolean;
  "aria-describedby"?: string;
}

const BOX_CSS = `.bo-checkbox:hover{border-color:var(--accent-background) !important}.bo-checkbox:focus-visible{outline:2px solid var(--accent-background);outline-offset:2px}`;

/**
 * A checkbox in the page's own colors: the accent color when checked, and like the inputs when not. It is a plain
 * `<button role="checkbox">`, so a `<label htmlFor>` and the keyboard work as they do for a native box. It is not made
 * of Tamagui components on purpose: Tamagui puts an element that has `aria-checked` set to true or mixed (and its
 * `Checkbox`) in a sub-theme, and the colors inside it then come from that theme, so on a dark page a checked box was
 * light and on a light page dark, with a mark that hardly showed. Here the colors are the page's CSS variables.
 */
export function CheckBox({
  id,
  checked,
  onChange,
  mark,
  markColor,
  dashed = false,
  "aria-describedby": describedBy,
}: CheckBoxProps) {
  const on = checked === true;
  const style: CSSProperties = {
    flexShrink: 0,
    boxSizing: "border-box",
    width: 22,
    height: 22,
    marginTop: 2,
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    border: `1px ${dashed ? "dashed" : "solid"} ${
      on ? "var(--accent-background)" : dashed ? "var(--placeholder-color)" : "var(--border-color)"
    }`,
    backgroundColor: on ? "var(--accent-background)" : "var(--background)",
    color: markColor ?? (on ? "var(--accent-color)" : "var(--color)"),
    font: "inherit",
    fontSize: 12,
    lineHeight: 1,
    cursor: "pointer",
  };
  return (
    <>
      <style href="bo-checkbox" precedence="default">
        {BOX_CSS}
      </style>
      <button
        type="button"
        role="checkbox"
        id={id}
        className="bo-checkbox"
        aria-checked={checked === "mixed" ? "mixed" : checked}
        aria-describedby={describedBy}
        onClick={onChange}
        style={style}
      >
        <span aria-hidden>{mark ?? (on ? "✓" : "")}</span>
      </button>
    </>
  );
}
