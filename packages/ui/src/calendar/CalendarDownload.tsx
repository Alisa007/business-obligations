import { useState } from "react";
import { toICS, type CalendarEvent } from "business-obligations";
import { Button, Text, XStack } from "tamagui";
import { WithLocale, useI18n } from "../i18n/context";
import type { Messages } from "../i18n/messages";

export interface CalendarDownloadProps {
  events: CalendarEvent[];
  /** Name the calendar app shows; the language's default when omitted. */
  calendarName?: string;
  /** Name of the downloaded file. */
  fileName?: string;
  /** Called after the file is handed to the browser, with the number of events in it. */
  onDownload?: (count: number) => void;
  /** See `LaunchListProps.locale`. */
  locale?: string;
  /** See `LaunchListProps.messages`. */
  messages?: Messages;
}

/** A button that saves the events as an iCalendar (.ics) file. With no events it says so instead. */
export function CalendarDownload(props: CalendarDownloadProps) {
  return (
    <WithLocale locale={props.locale} messages={props.messages}>
      <CalendarDownloadBody {...props} />
    </WithLocale>
  );
}

function CalendarDownloadBody({
  events,
  calendarName,
  fileName = "business-deadlines.ics",
  onDownload,
}: CalendarDownloadProps) {
  const { m } = useI18n();
  const [empty, setEmpty] = useState(false);
  const download = () => {
    setEmpty(events.length === 0);
    if (events.length === 0) return;
    const url = URL.createObjectURL(
      new Blob([toICS(events, { calendarName: calendarName ?? m.calendar.name })], { type: "text/calendar" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    onDownload?.(events.length);
  };
  return (
    <XStack gap="3" alignItems="center" flexWrap="wrap">
      <Button size="sm" onPress={download}>
        {m.calendar.download}
      </Button>
      {empty ? (
        <Text role="status" fontSize="sm" color="placeholder-color">
          {m.calendar.nothingToDownload}
        </Text>
      ) : null}
    </XStack>
  );
}
