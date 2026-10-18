import { useEffect, useId, useState } from "react";
import type { EntityType } from "business-obligations";
import { Checkbox, Label, Text, XStack, YStack } from "tamagui";
import { WithLocale, useI18n } from "../../i18n/context";
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
  label,
  answer,
  onAnswer,
}: {
  id: string;
  label: string;
  answer: boolean | undefined;
  onAnswer: (answer: boolean | undefined) => void;
}) {
  const { m } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Tamagui renders a box that starts checked differently on the server and the client, so a "yes" shows as
  // not answered until the page is hydrated.
  const shown = answer === true && !mounted ? undefined : answer;
  const next = answer === undefined ? true : answer ? false : undefined;
  const status =
    answer === undefined
      ? m.profile.answers.unanswered
      : answer
        ? m.profile.answers.yes
        : m.profile.answers.no;
  return (
    <XStack gap="3" alignItems="flex-start" paddingVertical="1">
      <Checkbox
        id={id}
        size="md"
        marginTop="0.5"
        checked={shown === undefined ? "indeterminate" : shown}
        onCheckedChange={() => onAnswer(next)}
        borderStyle={shown === undefined ? "dashed" : "solid"}
        borderColor={shown === undefined ? "placeholder-color" : "border-color"}
        aria-describedby={`${id}-answer`}
      >
        <Checkbox.Indicator forceMount>
          <Text fontSize="xs" color={shown === undefined ? "placeholder-color" : "color"}>
            {shown === undefined ? "–" : shown ? "✓" : "✕"}
          </Text>
        </Checkbox.Indicator>
      </Checkbox>
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <XStack gap="3" alignItems="flex-start" paddingVertical="1">
      <Checkbox
        id={id}
        size="md"
        marginTop="0.5"
        // Tamagui renders a box that starts checked differently on the server and the client.
        checked={mounted && !choices.isFormed}
        onCheckedChange={(value) => set({ isFormed: value !== true })}
      >
        <Checkbox.Indicator>
          <Text fontSize="xs">✓</Text>
        </Checkbox.Indicator>
      </Checkbox>
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
