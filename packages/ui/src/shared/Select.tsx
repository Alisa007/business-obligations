import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Select as TamaguiSelect, Text, type TamaguiElement } from "tamagui";
import { ClearButton } from "./ClearButton";
import { useControlMetrics, useControlProps } from "./controls";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  /** `id` of the trigger, for a `<label htmlFor>`. */
  id: string;
  /** The chosen option's `value`, or "" for none. */
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** Shown while nothing is chosen. */
  placeholder?: string;
  /** Adds a ✕ that calls `onClear` while something is chosen; `clearLabel` is its accessible name. */
  onClear?: () => void;
  clearLabel?: string;
  /** Red border while true. */
  invalid?: boolean;
  /** `id` of the text that says what is wrong. */
  describedBy?: string;
}

const COARSE = "(pointer: coarse)";
const onCoarseChange = (notify: () => void) => {
  const query = window.matchMedia(COARSE);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

/** Whether the main pointer is a finger. False on the server and while hydrating, so the markup matches. */
const useCoarsePointer = () =>
  useSyncExternalStore(
    onCoarseChange,
    () => window.matchMedia(COARSE).matches,
    () => false,
  );

/**
 * A dropdown that looks like the package's inputs: the field's border, a chevron at the end and an optional ✕ to put it
 * back to "none". Options are `{ value, label }`. The chosen text is rendered by the component itself, so it is also in the
 * server's HTML before the list has been opened.
 *
 * On a touch screen it is the browser's own `<select>` instead: the phone's picker is what people expect there, and the
 * custom list opens under the finger that tapped it, which picks (or dismisses) an option before it can be read.
 */
export function Select({
  id,
  value,
  options,
  onChange,
  placeholder = "",
  onClear,
  clearLabel = "",
  invalid = false,
  describedBy,
}: SelectProps) {
  const controlProps = useControlProps();
  const metrics = useControlMetrics();
  const touch = useCoarsePointer();
  // The list is as wide as the control at least: it would otherwise be only as wide as its longest option.
  const [controlWidth, setControlWidth] = useState(0);
  const triggerRef = useRef<TamaguiElement | null>(null);
  const chosen = options.find((option) => option.value === value);
  const clearable = Boolean(onClear && chosen);
  useEffect(() => {
    if (touch) return;
    // The button itself (by its id), not the element the ref points at: that one is a little wider than what is seen.
    const trigger = document.getElementById(id) ?? (triggerRef.current as HTMLElement | null);
    if (!trigger) return;
    const update = () => setControlWidth(trigger.getBoundingClientRect().width);
    update();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update);
      observer.observe(trigger);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [touch, id]);
  if (touch) {
    return (
      // WebKit (iOS) reports the width of the longest option as the select's minimum size to every ancestor, even with
      // `width: 100%`, so a long option pushed the field past the screen. `contain: inline-size` makes this box ignore
      // what is inside it when its ancestors work out their own width, and the box then takes the width it is given.
      <div
        style={{
          position: "relative",
          width: "100%",
          minWidth: 120,
          maxWidth: "100%",
          contain: "inline-size",
        }}
      >
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          style={{
            display: "block",
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            boxSizing: "border-box",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
            height: metrics.height,
            appearance: "none",
            WebkitAppearance: "none",
            borderRadius: 8,
            border: `1px solid ${invalid ? "var(--red-600, #dc2626)" : "var(--border-color)"}`,
            backgroundColor: "var(--background)",
            color: chosen ? "var(--color)" : "var(--placeholder-color)",
            // 16px stops iOS zooming on focus; the end padding leaves room for the chevron and the ✕
            fontSize: Math.max(16, metrics.fontSize),
            padding: `0 ${clearable ? 56 : 32}px 0 12px`,
          }}
        >
          {/* "none" is a choice only when the field can be emptied; otherwise it is just the placeholder */}
          <option value="" disabled={!onClear} hidden={!onClear}>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="var(--placeholder-color)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: "absolute", right: 12, top: "50%", marginTop: -6, pointerEvents: "none" }}
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
        {clearable ? <ClearButton label={clearLabel} right={26} onClear={onClear as () => void} /> : null}
      </div>
    );
  }
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <TamaguiSelect value={value} onValueChange={onChange}>
        <TamaguiSelect.Trigger
          id={id}
          width="100%"
          height={controlProps.height}
          borderWidth={1}
          borderColor={invalid ? "red-600" : "border-color"}
          backgroundColor="background"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          paddingRight={8}
          ref={triggerRef}
        >
          <TamaguiSelect.Value
            fontSize={controlProps.fontSize}
            color={chosen ? "color" : "placeholder-color"}
            placeholder={placeholder}
            // keeps a long name from running under the ✕
            paddingRight={clearable ? 28 : 0}
          >
            {chosen ? chosen.label : placeholder}
          </TamaguiSelect.Value>
          <svg
            aria-hidden
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="var(--placeholder-color)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginLeft: "auto", flexShrink: 0 }}
          >
            <path d="M2.5 4.5 6 8l3.5-3.5" />
          </svg>
        </TamaguiSelect.Trigger>
        <TamaguiSelect.Content>
          {/* As wide as the control (more only for a longer option), never wider than the screen. */}
          {/* Tamagui sets this list's min-width inline to the control's plus 8px, which is why it came out wider. */}
          <style
            href="bo-select-list"
            precedence="default"
          >{`.bo-select-list{min-width:0 !important}`}</style>
          <TamaguiSelect.Viewport
            // Until the toggle has been measured, Tamagui's own min-width (the toggle's, plus 8px) stays in force
            className={controlWidth ? "bo-select-list" : undefined}
            borderWidth={1}
            borderColor="border-color"
            backgroundColor="background"
            padding={0}
            // Tamagui places the list 4px to the left, for the padding this does not have
            marginLeft={4}
            minWidth={controlWidth || 240}
            width={controlWidth || undefined}
            maxWidth="calc(100vw - 24px)"
          >
            <TamaguiSelect.Group>
              {options.map((option) => (
                <TamaguiSelect.Item key={option.value} value={option.value}>
                  <TamaguiSelect.ItemText fontSize={controlProps.fontSize}>
                    {option.label}
                  </TamaguiSelect.ItemText>
                  <TamaguiSelect.ItemIndicator marginLeft="auto">
                    <Text fontSize="xs">✓</Text>
                  </TamaguiSelect.ItemIndicator>
                </TamaguiSelect.Item>
              ))}
            </TamaguiSelect.Group>
          </TamaguiSelect.Viewport>
        </TamaguiSelect.Content>
      </TamaguiSelect>
      {clearable ? <ClearButton label={clearLabel} right={22} onClear={onClear as () => void} /> : null}
    </div>
  );
}
