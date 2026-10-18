import { Select as TamaguiSelect, Text } from "tamagui";
import { ClearButton } from "./ClearButton";
import { useControlProps } from "./controls";

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

/**
 * A dropdown that looks like the package's inputs: the field's border, a chevron at the end and an optional ✕ to put it
 * back to "none". Options are `{ value, label }`. The chosen text is rendered by the component itself, so it is also in the
 * server's HTML before the list has been opened.
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
  const chosen = options.find((option) => option.value === value);
  const clearable = Boolean(onClear && chosen);
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
          <TamaguiSelect.Viewport borderWidth={1} borderColor="border-color" backgroundColor="background">
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
