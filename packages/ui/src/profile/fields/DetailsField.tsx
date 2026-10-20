import { useId } from "react";
import type { EntityType } from "business-obligations";
import { Label, Text, XStack, YStack } from "tamagui";
import { WithLocale, useI18n } from "../../i18n/context";
import { CheckBox } from "../../shared/CheckBox";
import { visuallyHidden } from "../../shared/controls";
import { DETAIL_FIELDS } from "../choices";
import { useFixedChoices, useProfileChoices } from "../store";
import type { ProfileFieldProps } from "./controls";

export interface DetailsFieldProps extends Omit<ProfileFieldProps, "id"> {
  /** Set to `false` when the host already has a heading for the group; the legend stays for screen readers. */
  legend?: boolean;
}

/** The S election only exists for corporations that can make one. */
const S_ELECTION_TYPES: readonly EntityType[] = ["pc", "benefit_corp"];

/**
 * A checkbox with three states: yes (✓), no (✕) and not answered yet (a dash, which is the "indeterminate" state).
 * Pressing it goes round: not answered, yes, no, not answered. The dashed border says the question is still open.
 */
function AnswerBox({
  id,
  field,
  label,
  answer,
  onAnswer,
}: {
  id: string;
  /** The choice this row answers, for `focusProfileField`. */
  field: string;
  label: string;
  answer: boolean | undefined;
  onAnswer: (answer: boolean | undefined) => void;
}) {
  const { m } = useI18n();
  const shown = answer;
  const next = answer === undefined ? true : answer ? false : undefined;
  const status =
    answer === undefined
      ? m.profile.answers.unanswered
      : answer
        ? m.profile.answers.yes
        : m.profile.answers.no;
  return (
    <XStack gap="3" alignItems="flex-start" paddingVertical="1" data-bo-field={field}>
      <CheckBox
        id={id}
        checked={shown === undefined ? "mixed" : shown}
        onChange={() => onAnswer(next)}
        dashed={shown === undefined}
        // "no" is a box with a mark, not an answer to be won: only "yes" takes the accent color
        mark={shown === undefined ? "–" : shown ? "✓" : "✕"}
        markColor={
          shown === undefined ? "var(--placeholder-color)" : shown ? "var(--accent-color)" : "var(--color)"
        }
        aria-describedby={`${id}-answer`}
      />
      <Label htmlFor={id} flex={1} cursor="pointer" fontSize="base">
        {label}
      </Label>
      {/* "Not answered yet" is the dashed box's job; screen readers still get it. */}
      <Text
        id={`${id}-answer`}
        fontSize="xs"
        color="placeholder-color"
        marginTop="1"
        {...(answer === undefined ? { style: visuallyHidden } : {})}
      >
        {status}
      </Text>
    </XStack>
  );
}

/** "Not formed yet": checked until the business exists. A plain two-state box, in the same row style as the others. */
function NotFormedBox({ id }: { id: string }) {
  const { m } = useI18n();
  const [choices, set] = useProfileChoices();
  return (
    <XStack gap="3" alignItems="flex-start" paddingVertical="1" data-bo-field="isFormed">
      <CheckBox id={id} checked={!choices.isFormed} onChange={() => set({ isFormed: !choices.isFormed })} />
      <Label htmlFor={id} flex={1} cursor="pointer" fontSize="base">
        {m.profileForm.notFormed}
      </Label>
    </XStack>
  );
}

function DetailChecks({ legend }: { legend: boolean }) {
  const { m } = useI18n();
  const prefix = useId();
  const [choices, set] = useProfileChoices();
  const fixed = useFixedChoices();
  const shown = DETAIL_FIELDS.filter(
    (field) =>
      !fixed.has(field) &&
      (field !== "sCorpElection" ||
        (choices.entityType !== undefined && S_ELECTION_TYPES.includes(choices.entityType))),
  );
  const askFormed = !fixed.has("isFormed");
  if (shown.length === 0 && !askFormed) return null;
  return (
    <YStack render="fieldset" margin={0} padding={0} borderWidth={0} minWidth={0}>
      <Text
        render="legend"
        fontSize="sm"
        color="placeholder-color"
        padding={0}
        marginBottom="1"
        {...(legend ? {} : { style: visuallyHidden })}
      >
        {m.profile.details}
      </Text>
      {/* Columns of at least 230px, as many as fit in the width this is given. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 230px), 1fr))",
          columnGap: 20,
        }}
      >
        {shown.map((field) => (
          <AnswerBox
            key={field}
            id={`${prefix}-${field}`}
            field={field}
            label={m.profile.detailLabels[field]}
            answer={choices[field]}
            onAnswer={(answer) => set({ [field]: answer })}
          />
        ))}
        {askFormed && <NotFormedBox id={`${prefix}-isNew`} />}
      </div>
    </YStack>
  );
}

/**
 * Every yes/no detail about the business as a three-state checkbox: sells taxable goods, run from home, trade name,
 * tax-exempt status, exterior signage, food service, and (for corporations that can have one) the S election. Each
 * is yes (`?sells=1`), no (`?sells=0`) or not answered yet (no parameter), and reads and writes its own parameter.
 * Ends with "Not formed yet" (`?formed=`), which is hidden when `isFormed` is fixed.
 */
export function DetailsField({ locale, messages, legend = true }: DetailsFieldProps) {
  return (
    <WithLocale locale={locale} messages={messages}>
      <DetailChecks legend={legend} />
    </WithLocale>
  );
}
