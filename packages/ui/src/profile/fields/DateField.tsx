import { useState } from "react";
import { Button, Popover, Text, XStack, YStack } from "tamagui";
import { useI18n } from "../../i18n/context";
import { todayIso } from "../../i18n/format";
import { useControlProps } from "../../shared/controls";
import { Labeled } from "./controls";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Weeks of a month as rows of 7 cells (ISO dates, or undefined for padding), Sunday first. */
function monthGrid(year: number, month: number): Array<Array<string | undefined>> {
  const lead = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<string | undefined> = [
    ...Array<undefined>(lead).fill(undefined),
    ...Array.from({ length: days }, (_, i) => iso(year, month, i + 1)),
  ];
  while (cells.length % 7) cells.push(undefined);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

function Calendar({
  value,
  min,
  max,
  onPick,
}: {
  value: string;
  min?: string;
  max?: string;
  onPick: (iso: string) => void;
}) {
  const { m, tag, date } = useI18n();
  const start = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : (min ?? todayIso());
  const [view, setView] = useState({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) - 1 });
  const shift = (by: number) =>
    setView(({ year, month }) => {
      const d = new Date(Date.UTC(year, month + by, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  const monthLabel = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(tag, { weekday: "narrow", timeZone: "UTC" }).format(
      new Date(Date.UTC(2023, 0, 1 + i)),
    ),
  );
  return (
    <YStack gap="2" width={280}>
      <XStack alignItems="center" justifyContent="space-between">
        <Button size="sm" aria-label={m.profileForm.previousMonth} onPress={() => shift(-1)}>
          ‹
        </Button>
        <Text fontWeight="600">{monthLabel.format(new Date(Date.UTC(view.year, view.month, 1)))}</Text>
        <Button size="sm" aria-label={m.profileForm.nextMonth} onPress={() => shift(1)}>
          ›
        </Button>
      </XStack>
      <XStack>
        {weekdays.map((w, i) => (
          <Text key={i} flex={1} textAlign="center" fontSize="xs" color="placeholder-color">
            {w}
          </Text>
        ))}
      </XStack>
      {monthGrid(view.year, view.month).map((week, w) => (
        <XStack key={w} gap="1">
          {week.map((day, d) =>
            day ? (
              <Button
                key={day}
                flex={1}
                size="sm"
                paddingHorizontal={0}
                theme={day === value ? "accent" : undefined}
                disabled={Boolean((min && day < min) || (max && day > max))}
                aria-label={date(day)}
                aria-pressed={day === value}
                onPress={() => onPick(day)}
              >
                {Number(day.slice(8))}
              </Button>
            ) : (
              <YStack key={d} flex={1} />
            ),
          )}
        </XStack>
      ))}
    </YStack>
  );
}

export function DateField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  clearable = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  clearable?: boolean;
}) {
  const { m, date } = useI18n();
  const [open, setOpen] = useState(false);
  const controlProps = useControlProps();
  return (
    <Labeled id={id} label={label}>
      <Popover open={open} onOpenChange={setOpen} placement="top-start">
        <Popover.Trigger asChild>
          <Button
            id={id}
            height={controlProps.height}
            justifyContent="flex-start"
            borderWidth={1}
            borderColor="border-color"
            backgroundColor="background"
          >
            <Text fontSize={controlProps.fontSize} color={value ? "color" : "placeholder-color"}>
              {value ? date(value) : m.profileForm.selectDate}
            </Text>
          </Button>
        </Popover.Trigger>
        <Popover.Content borderWidth={1} borderColor="border-color" padding="3" backgroundColor="background">
          {/* key remounts the calendar so it opens on the selected month each time */}
          <Calendar
            key={`${open}-${value}`}
            value={value}
            min={min}
            max={max}
            onPick={(day) => {
              onChange(day);
              setOpen(false);
            }}
          />
          {clearable && value ? (
            <Button
              size="sm"
              marginTop="2"
              onPress={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {m.profileForm.clearDate}
            </Button>
          ) : null}
        </Popover.Content>
      </Popover>
    </Labeled>
  );
}
