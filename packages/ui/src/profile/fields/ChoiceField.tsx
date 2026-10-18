import { useI18n } from "../../i18n/context";
import { Select } from "../../shared/Select";
import { Labeled } from "./controls";

export function ChoiceField({
  id,
  label,
  value,
  options,
  blank,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<[string, string]>;
  /** Text shown while nothing is chosen. */
  blank: string;
  onChange: (value: string) => void;
  /** What the field is for, in a tooltip next to the label. */
  hint?: string;
}) {
  const { m } = useI18n();
  return (
    <Labeled id={id} label={label} hint={hint}>
      <Select
        id={id}
        value={value}
        options={options.map(([key, text]) => ({ value: key, label: text }))}
        placeholder={blank}
        clearLabel={m.profile.clear}
        onChange={onChange}
        onClear={() => onChange("")}
      />
    </Labeled>
  );
}
