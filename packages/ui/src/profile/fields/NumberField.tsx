import { useEffect, useId, useState } from "react";
import { Input } from "tamagui";
import { WithLocale, useI18n } from "../../i18n/context";
import { useControlProps } from "../../shared/controls";
import { MAX_EMPLOYEES, type NumberField } from "../choices";
import { useFixedChoices, useProfileChoices } from "../store";
import {
  amountTextSchema,
  employeesTextSchema,
  firstError,
  ownersTextSchema,
  wholeTextSchema,
  type FieldError,
} from "../validation";
import { ClearButton, ErrorText, Labeled, borderOf, type ProfileFieldProps } from "./controls";

/** What a numeric box accepts: a head count (whole, up to `MAX_EMPLOYEES`), another whole number, or an amount. */
export type NumberKind = "employees" | "owners" | "whole" | "amount";

// A function, not a table: a table made when the module loads would keep the zod schemas in every bundle.
const kindSpec = (kind: NumberKind) =>
  kind === "employees"
    ? { schema: employeesTextSchema, strip: /\D/g, length: String(MAX_EMPLOYEES).length }
    : kind === "owners"
      ? { schema: ownersTextSchema, strip: /\D/g, length: 9 }
      : kind === "whole"
        ? { schema: wholeTextSchema, strip: /\D/g, length: 9 }
        : { schema: amountTextSchema, strip: /[^\d.]/g, length: 15 };

/**
 * A box for one number of the profile (`field`). The text is kept apart from the number, so that clearing the box to
 * type a new one does not snap back, and what is typed is checked with zod: a bad value stays in the box, in red, and
 * is not written to the address. An empty box means "not given", not 0 and not the previous number.
 */
export function NumberControl({
  id,
  field,
  label,
  placeholder,
  kind,
  prefix,
}: {
  id: string;
  field: NumberField;
  label: string;
  placeholder?: string;
  kind: NumberKind;
  /** A short mark before the number, such as "$", so that the unit is not in the label. */
  prefix?: string;
}) {
  const { m } = useI18n();
  const [choices, set] = useProfileChoices();
  const controlProps = useControlProps();
  const { schema, strip, length } = kindSpec(kind);
  const value = choices[field];
  const shown = value === undefined ? "" : String(value);
  const [draft, setDraft] = useState(shown);
  useEffect(
    // Keep what is being typed ("012", "12.") while it means the same number; otherwise follow the address.
    () => setDraft((current) => (current !== "" && Number(current) === value ? current : shown)),
    [value, shown],
  );
  // The engine refuses more full-time than all employees (when the employees are given), so that is shown here.
  const exceeds =
    field === "fullTimeEmployeeCount" &&
    value !== undefined &&
    choices.employeeCount !== undefined &&
    value > choices.employeeCount;
  const error: FieldError | undefined =
    firstError(schema, draft) ?? (exceeds ? "fullTimeExceeds" : undefined);
  const errorId = `${id}-error`;
  return (
    <Labeled id={id} label={label}>
      <div style={{ position: "relative", width: "100%" }}>
        <Input
          width="100%"
          paddingLeft={prefix ? 24 : 10}
          paddingRight={draft !== "" ? 36 : 10}
          borderColor={borderOf(error)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          id={id}
          {...controlProps}
          autoComplete="off"
          inputMode={kind === "amount" ? "decimal" : "numeric"}
          maxLength={length}
          placeholder={placeholder}
          value={draft}
          onChangeText={(text) => {
            const typed = text.replace(strip, "");
            setDraft(typed);
            if (firstError(schema, typed)) return;
            set({ [field]: typed === "" ? undefined : Number(typed) });
          }}
          onBlur={() => error || setDraft(shown)}
        />
        {prefix ? (
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 10,
              top: 0,
              height: controlProps.height,
              display: "flex",
              alignItems: "center",
              fontSize: controlProps.fontSize,
              color: "var(--placeholder-color)",
              pointerEvents: "none",
            }}
          >
            {prefix}
          </div>
        ) : null}
        {draft !== "" ? (
          <ClearButton
            label={m.profile.clear}
            onClear={() => {
              setDraft("");
              set({ [field]: undefined });
            }}
          />
        ) : null}
      </div>
      {error ? <ErrorText id={errorId} error={error} /> : null}
    </Labeled>
  );
}

function EmployeesControl({ id, placeholder }: { id: string; placeholder?: string }) {
  const { m } = useI18n();
  return (
    <NumberControl
      id={id}
      field="employeeCount"
      label={m.profile.employees}
      placeholder={placeholder}
      kind="employees"
    />
  );
}

/**
 * The number of W-2 employees, a whole number from 0 to 10,000, or empty for "not given" (with defaults that leave
 * `employeeCount` out). Reads and writes `?employees=`.
 */
export function EmployeesField({
  locale,
  messages,
  id,
  placeholder,
}: ProfileFieldProps & { placeholder?: string }) {
  const generated = useId();
  if (useFixedChoices().has("employeeCount")) return null;
  return (
    <WithLocale locale={locale} messages={messages}>
      <EmployeesControl id={id ?? generated} placeholder={placeholder} />
    </WithLocale>
  );
}
