import type { CalendarEvent, ComplianceItem } from "business-obligations";
import { Separator, Text, XStack, YStack } from "tamagui";
import { WithLocale, useI18n } from "../i18n/context";
import type { Messages } from "../i18n/messages";
import { ExternalLink } from "../shared/primitives";

export interface CalendarListProps {
  /** Dated deadlines, from `buildCalendar`. */
  events: CalendarEvent[];
  /**
   * The items of the plan. Those with no machine-readable due date (a one-time setup, or a rule stated only as
   * text) cannot be placed in the calendar and are listed below it.
   */
  items?: ComplianceItem[];
  /** See `LaunchListProps.locale`. */
  locale?: string;
  /** See `LaunchListProps.messages`. */
  messages?: Messages;
}

function Row({
  when,
  title,
  url,
  note,
}: {
  when: string;
  title: string;
  url?: string | string[];
  note?: string;
}) {
  return (
    <>
      <Separator />
      <XStack gap="3" columnGap="4" paddingVertical="2" flexWrap="wrap">
        <Text fontWeight="600" width={120}>
          {when}
        </Text>
        <YStack flex={1} flexBasis={220} minWidth={0}>
          <Text>
            <ExternalLink url={url}>{title}</ExternalLink>
          </Text>
          {note ? (
            <Text fontSize="sm" color="placeholder-color">
              {note}
            </Text>
          ) : null}
        </YStack>
      </XStack>
    </>
  );
}

/** The dated deadlines of a plan in order, then the items that have no date. */
export function CalendarList(props: CalendarListProps) {
  return (
    <WithLocale locale={props.locale} messages={props.messages}>
      <CalendarListBody {...props} />
    </WithLocale>
  );
}

function CalendarListBody({ events, items = [] }: CalendarListProps) {
  const { m, date } = useI18n();
  const undated = items.filter(
    (item) => !item.due && item.frequency !== "ongoing" && item.frequency !== "per_event",
  );
  return (
    <YStack gap="3">
      {events.length === 0 ? (
        <Text fontSize="sm" color="placeholder-color">
          {m.calendar.none}
        </Text>
      ) : (
        <YStack width="100%">
          {events.map((event) => (
            <Row
              key={`${event.itemId}-${event.date}`}
              when={date(event.date)}
              title={event.title}
              url={event.url}
              note={event.authority}
            />
          ))}
        </YStack>
      )}
      {undated.length > 0 && (
        <YStack width="100%" gap="1">
          <Text fontSize="sm" color="placeholder-color">
            {m.calendar.undated}
          </Text>
          {undated.map((item) => (
            <Row
              key={item.id}
              when={item.frequency === "once" ? m.calendar.oneTime : m.calendar.seeRule}
              title={item.title}
              url={item.url}
              note={item.deadline}
            />
          ))}
        </YStack>
      )}
    </YStack>
  );
}
