import { useEffect, useId, useState } from "react";
import { ENTITY_TYPES, INDUSTRIES, type EntityType, type Industry } from "business-obligations";
import { Label, Text, XStack, YStack } from "tamagui";
import { nativeControl } from "./controls";
import { WithLocale, useI18n } from "./i18n";
import type { Messages } from "./messages";
import { DETAIL_FIELDS, MAX_EMPLOYEES, useProfileChoices, type DetailField } from "./profileQuery";

/** Props every business-details input takes. The value itself lives in the URL, so there is no `value` or `onChange`. */
export interface ProfileInputProps {
  /** See `LaunchListProps.locale`. */
  locale?: string;
  /** See `LaunchListProps.messages`. */
  messages?: Messages;
  /** `id` of the control. Generated when left out. */
  id?: string;
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <YStack gap="0.5" flexGrow={1}>
      <Label htmlFor={id} fontSize="sm" color="placeholder-color">
        {label}
      </Label>
      {children}
    </YStack>
  );
}

function TypeSelect({ id }: { id: string }) {
  const { m } = useI18n();
  const [choices, set] = useProfileChoices();
  return (
    <Field id={id} label={m.profile.entityType}>
      <select
        id={id}
        style={nativeControl}
        value={choices.entityType}
        onChange={(event) => set({ entityType: event.target.value as EntityType })}
      >
        {ENTITY_TYPES.map((type) => (
          <option key={type} value={type}>
            {m.profile.entityTypes[type]}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** The type of business (LLC, S corporation, ...), from the engine's `ENTITY_TYPES`. Reads and writes `?type=`. */
export function TypeInput({ locale, messages, id }: ProfileInputProps) {
  const generated = useId();
  return (
    <WithLocale locale={locale} messages={messages}>
      <TypeSelect id={id ?? generated} />
    </WithLocale>
  );
}

function IndustrySelect({ id }: { id: string }) {
  const { m } = useI18n();
  const [choices, set] = useProfileChoices();
  return (
    <Field id={id} label={m.profile.industry}>
      <select
        id={id}
        style={nativeControl}
        value={choices.industry}
        onChange={(event) => set({ industry: event.target.value as Industry })}
      >
        {INDUSTRIES.map((industry) => (
          <option key={industry} value={industry}>
            {m.profile.industries[industry]}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** The industry, from the engine's `INDUSTRIES`. Reads and writes `?industry=`. */
export function IndustryInput({ locale, messages, id }: ProfileInputProps) {
  const generated = useId();
  return (
    <WithLocale locale={locale} messages={messages}>
      <IndustrySelect id={id ?? generated} />
    </WithLocale>
  );
}

function EmployeesField({ id }: { id: string }) {
  const { m } = useI18n();
  const [choices, set] = useProfileChoices();
  // The text is kept apart from the number, so that clearing the box to type a new count does not snap back to 0.
  const [draft, setDraft] = useState(String(choices.employeeCount));
  useEffect(
    () =>
      setDraft((current) =>
        Number(current) === choices.employeeCount && current !== "" ? current : String(choices.employeeCount),
      ),
    [choices.employeeCount],
  );
  return (
    <Field id={id} label={m.profile.employees}>
      <input
        id={id}
        style={nativeControl}
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_EMPLOYEES}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (event.target.value !== "") set({ employeeCount: Number(event.target.value) });
        }}
        onBlur={() => setDraft(String(choices.employeeCount))}
      />
    </Field>
  );
}

/** The number of W-2 employees, a whole number from 0 to 10,000. Reads and writes `?employees=`. */
export function EmployeesInput({ locale, messages, id }: ProfileInputProps) {
  const generated = useId();
  return (
    <WithLocale locale={locale} messages={messages}>
      <EmployeesField id={id ?? generated} />
    </WithLocale>
  );
}

export interface DetailsInputProps extends Omit<ProfileInputProps, "id"> {
  /** Which checkboxes to show, in this order. Defaults to every yes/no detail (`DETAIL_FIELDS`). */
  fields?: readonly DetailField[];
}

const checkboxStyle = {
  width: 16,
  height: 16,
  margin: 0,
  accentColor: "var(--accent-background)",
  cursor: "pointer",
} as const;

/** The S election only exists for corporations that can make one. */
const S_ELECTION_TYPES: readonly EntityType[] = ["pc", "benefit_corp"];

function DetailChecks({ fields }: { fields: readonly DetailField[] }) {
  const { m } = useI18n();
  const prefix = useId();
  const [choices, set] = useProfileChoices();
  const shown = fields.filter(
    (field) => field !== "sCorpElection" || S_ELECTION_TYPES.includes(choices.entityType),
  );
  return (
    <YStack render="fieldset" gap="2" margin={0} padding={0} borderWidth={0} minWidth={0}>
      <Text render="legend" fontSize="sm" color="placeholder-color" padding={0}>
        {m.profile.details}
      </Text>
      <XStack gap="4" rowGap="2" flexWrap="wrap">
        {shown.map((field) => {
          const id = `${prefix}-${field}`;
          return (
            <XStack key={field} gap="2" alignItems="center">
              {/* A native checkbox: small by nature, and it renders the same on the server and the client. */}
              <input
                type="checkbox"
                id={id}
                checked={choices[field]}
                onChange={(event) => set({ [field]: event.target.checked })}
                style={checkboxStyle}
              />
              <Label htmlFor={id} cursor="pointer" fontSize="sm">
                {m.profile.detailLabels[field]}
              </Label>
            </XStack>
          );
        })}
      </XStack>
    </YStack>
  );
}

/**
 * Every yes/no detail about the business as checkboxes: sells taxable goods, run from home, trade name, tax-exempt
 * status, exterior signage, food service, and (for corporations that can have one) the S election. Each reads and
 * writes its own URL parameter (`?sells=1`, `?home=1`, ...).
 */
export function DetailsInput({ locale, messages, fields = DETAIL_FIELDS }: DetailsInputProps) {
  return (
    <WithLocale locale={locale} messages={messages}>
      <DetailChecks fields={fields} />
    </WithLocale>
  );
}
