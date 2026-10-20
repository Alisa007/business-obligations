import type { LaunchPlan } from "business-obligations";
import { Button, Text, XStack, YStack } from "tamagui";
import { WithLocale, useI18n } from "../i18n/context";
import type { Messages } from "../i18n/messages";

export interface PlanSummaryProps {
  plan: LaunchPlan;
  /** Name of the place, shown as the title. */
  place: string;
  /** Known government fees; shown only when there is something to show. */
  costs?: { oneTime: number; annual: number };
  /** Steps done (ids), as in `LaunchList`. */
  done?: ReadonlySet<string>;
  /** Makes "no opening date set" a button that asks the host to let the visitor set one. */
  onSetOpening?: () => void;
  /** See `LaunchListProps.locale`. */
  locale?: string;
  /** See `LaunchListProps.messages`. */
  messages?: Messages;
}

function Milestone({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <YStack flexBasis={150} flexGrow={1} gap="0.5">
      <Text fontSize="xs" color="placeholder-color">
        {label}
      </Text>
      <Text fontSize="lg" fontWeight="600">
        {value}
      </Text>
      {note ? (
        <Text fontSize="xs" color="placeholder-color">
          {note}
        </Text>
      ) : null}
    </YStack>
  );
}

/**
 * The card above the launch plan: when to file and when the business can operate, how it fits an opening date,
 * the known fees and progress. What the obligations are is `ObligationsSummary`'s job.
 */
export function PlanSummary(props: PlanSummaryProps) {
  return (
    <WithLocale locale={props.locale} messages={props.messages}>
      <PlanSummaryBody {...props} />
    </WithLocale>
  );
}

function PlanSummaryBody({ plan, place, costs, done = new Set(), onSetOpening }: PlanSummaryProps) {
  const { m, money, date, relativeDays } = useI18n();
  const s = m.summary.plan;
  const completed = plan.steps.filter((step) => done.has(step.item.id)).length;
  const fees = costs && (costs.oneTime > 0 || costs.annual > 0) ? costs : undefined;
  const muted = { fontSize: "sm", color: "placeholder-color" } as const;
  return (
    <YStack
      render="section"
      aria-label={place}
      width="100%"
      gap="3"
      padding="3"
      borderWidth={1}
      borderColor="border-color"
      borderRadius="lg"
    >
      <XStack columnGap="3" rowGap="1" alignItems="center" justifyContent="space-between" flexWrap="wrap">
        <Text fontSize="lg" fontWeight="700" role="heading" aria-level={2}>
          {place}
        </Text>
        {plan.onTrack === undefined ? (
          onSetOpening ? (
            <Button size="sm" onPress={onSetOpening}>
              {s.openingNotSet}
            </Button>
          ) : (
            <Text {...muted}>{s.openingNotSet}</Text>
          )
        ) : (
          <Text fontSize="sm" color={plan.onTrack ? "green-600" : "red-600"}>
            {s.opening(date(plan.openingDate))} ·{" "}
            {plan.onTrack ? m.onTrack(plan.slackDays ?? 0) : m.tooSoon(-(plan.slackDays ?? 0))}
          </Text>
        )}
      </XStack>
      <XStack gap="3" flexWrap="wrap">
        <Milestone
          label={m.fileFormation}
          value={date(plan.formationDate)}
          note={relativeDays(plan.formationDate, plan.startDate)}
        />
        <Milestone
          label={m.readyToOperate}
          value={date(plan.readyDate)}
          note={relativeDays(plan.readyDate, plan.startDate)}
        />
        {fees ? (
          <Milestone
            label={m.knownFees}
            value={`${money(fees.oneTime)} ${m.oneTime}`}
            note={m.perYear(money(fees.annual))}
          />
        ) : null}
      </XStack>
      <YStack gap="1">
        <XStack justifyContent="space-between" gap="3" flexWrap="wrap">
          <Text fontSize="sm" fontWeight="600">
            {s.stepsDone(completed, plan.steps.length)}
          </Text>
          <Text {...muted}>{m.savedInBrowser}</Text>
        </XStack>
        <YStack
          role="progressbar"
          aria-label={m.progress}
          aria-valuemin={0}
          aria-valuemax={plan.steps.length}
          aria-valuenow={completed}
          height={6}
          backgroundColor="color-3"
          borderRadius="full"
          overflow="hidden"
        >
          <XStack
            height="100%"
            width={`${plan.steps.length ? (completed / plan.steps.length) * 100 : 0}%`}
            backgroundColor="accent-background"
          />
        </YStack>
      </YStack>
    </YStack>
  );
}
