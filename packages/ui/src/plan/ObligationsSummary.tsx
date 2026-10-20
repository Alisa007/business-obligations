import type { ComplianceItem } from "business-obligations";
import { Text, XStack, YStack } from "tamagui";
import { WithLocale, useI18n } from "../i18n/context";
import type { Messages } from "../i18n/messages";
import { LocationSummary } from "../summary/LocationSummary";
import { Chip } from "../shared/primitives";
import { JURISDICTIONS } from "./filters";

export interface ObligationsSummaryProps {
  items: ComplianceItem[];
  /** Where the business is; the smallest place given is summarized (see `LocationSummary`). Left out for federal items only. */
  state?: string;
  county?: string;
  city?: string;
  /** The nearest dated deadline, if any, and today's date to count from. */
  next?: { title: string; date: string };
  asOf?: string;
  /** Obligations due in the next 30 days. */
  dueSoon?: number;
  /** How many of the obligations were checked against official pages. */
  checked?: number;
  /** See `LaunchListProps.locale`. */
  locale?: string;
  /** See `LaunchListProps.messages`. */
  messages?: Messages;
}

/**
 * The card above the list of obligations: how many there are and at which level, the next deadline, how much was
 * checked against official pages, and what is specific to the place. Dates and progress are `PlanSummary`'s job.
 */
export function ObligationsSummary(props: ObligationsSummaryProps) {
  return (
    <WithLocale locale={props.locale} messages={props.messages}>
      <ObligationsSummaryBody {...props} />
    </WithLocale>
  );
}

function ObligationsSummaryBody({
  items,
  state,
  county,
  city,
  next,
  asOf,
  dueSoon = 0,
  checked,
}: ObligationsSummaryProps) {
  const { m, date, relativeDays } = useI18n();
  const s = m.summary.obligations;
  const muted = { fontSize: "sm", color: "placeholder-color" } as const;
  return (
    <YStack
      render="section"
      width="100%"
      gap="3"
      padding="3"
      borderWidth={1}
      borderColor="border-color"
      borderRadius="lg"
    >
      {state ? <LocationSummary state={state} county={county} city={city} compact bare /> : null}
      <XStack columnGap="3" rowGap="1.5" alignItems="center" flexWrap="wrap">
        <Text fontSize="xl" fontWeight="700">
          {s.count(items.length)}
        </Text>
        {JURISDICTIONS.map((level) => {
          const count = items.filter((item) => item.jurisdiction === level).length;
          return count ? (
            <Chip key={level} outline>
              {m.jurisdictions[level]} {count}
            </Chip>
          ) : null;
        })}
      </XStack>
      <YStack gap="1">
        <Text>
          <Text fontWeight="600">{s.next}: </Text>
          {next ? (
            <>
              {date(next.date)} · {next.title}
              <Text {...muted}> · {relativeDays(next.date, asOf)}</Text>
            </>
          ) : (
            <Text {...muted}>{s.noneDated}</Text>
          )}
        </Text>
        {dueSoon > 0 ? <Text {...muted}>{s.dueSoon(dueSoon)}</Text> : null}
        {checked !== undefined ? <Text {...muted}>{s.checked(checked, items.length)}</Text> : null}
      </YStack>
    </YStack>
  );
}
