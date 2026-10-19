"use client";

import { Paragraph, Text, XStack, YStack } from "tamagui";
import {
  CalendarDownload,
  CalendarList,
  Collapse,
  ExternalLink,
  LocationSummary,
  Stat,
  formatDate,
  formatMoney,
  relativeDays,
} from "business-obligations-ui";
import { summarize, type Analysis } from "../lib/plan";
import { ListRow, Muted } from "./ui";

// ---- Calendar, fees, what-if ----

export function CalendarView({ data, onDownload }: { data: Analysis; onDownload: (events: number) => void }) {
  return (
    <YStack gap="3" alignItems="flex-start">
      <CalendarDownload events={data.events} onDownload={onDownload} />
      <CalendarList events={data.events} items={data.result.items} />
    </YStack>
  );
}

export function CostsView({ data }: { data: Analysis }) {
  const urlOf = new Map(data.result.items.map((i) => [i.id, i.url]));
  return (
    <YStack gap="3">
      {data.costs.lines.length === 0 ? (
        <Paragraph>No known government fees.</Paragraph>
      ) : (
        <Paragraph>
          Known government fees: <Text fontWeight="700">{formatMoney(data.costs.annual)}</Text> per year,{" "}
          <Text fontWeight="700">{formatMoney(data.costs.oneTime)}</Text> one-time.
        </Paragraph>
      )}
      <YStack>
        {data.costs.lines.map((l) => (
          <ListRow key={l.id} flexWrap="nowrap" justifyContent="space-between">
            <Text flex={1} minWidth={0}>
              <ExternalLink url={urlOf.get(l.id)}>{l.title}</ExternalLink>
              {l.estimate ? " (estimate)" : ""}
            </Text>
            <Text fontWeight="600">{formatMoney(l.perYear || l.amount)}</Text>
          </ListRow>
        ))}
      </YStack>
      {data.costs.unknown.length > 0 && (
        <Muted>{data.costs.unknown.length} items have fees that cannot be totalled.</Muted>
      )}
    </YStack>
  );
}

export function WhatIfView({ data }: { data: Analysis }) {
  const { sensitivity } = data.analysis;
  return (
    <YStack gap="3">
      <Muted>Inputs you left at their defaults, and what would change if they differed.</Muted>
      {sensitivity.length === 0 ? (
        <Muted>Nothing changes with these inputs.</Muted>
      ) : (
        <YStack>
          {sensitivity.map((s) => (
            <ListRow key={s.field} columnGap="4">
              <Text flex={1} flexBasis={200} minWidth={0}>
                {s.field} (now {JSON.stringify(s.current)})
              </Text>
              <YStack flex={1} flexBasis={200} minWidth={0}>
                {s.changes.slice(0, 4).map((c) => (
                  <Text key={JSON.stringify(c.value)}>
                    {JSON.stringify(c.value)}: +{c.added.length} / −{c.removed.length}
                  </Text>
                ))}
              </YStack>
            </ListRow>
          ))}
        </YStack>
      )}
    </YStack>
  );
}

// ---- Summary above the tabs ----

export function ResultSummary({ data }: { data: Analysis }) {
  const { result } = data;
  const s = summarize(result);
  const city = result.profile.city;
  return (
    <YStack gap="3">
      <XStack flexWrap="wrap" gap="3">
        <Stat
          label="Obligations"
          value={String(s.total)}
          note={s.dueSoon > 0 ? `${s.dueSoon} due in the next 30 days` : "None due in the next 30 days"}
        />
        <Stat
          label="Next deadline"
          value={s.next ? formatDate(s.next.nextDue) : "None dated"}
          note={
            s.next
              ? `${s.next.title} · ${relativeDays(s.next.nextDue, result.asOf)}`
              : "Add a formation date for anniversary filings"
          }
        />
        <Stat
          label="Checked against official pages"
          value={`${s.verified} of ${s.total}`}
          note={`Data compiled ${formatDate(result.dataVersion)}`}
        />
      </XStack>
      <LocationSummary
        state={result.profile.state}
        county={result.profile.county}
        city={result.profile.city}
        compact
      />
      {s.verified < s.total && (
        <Muted>
          {s.total - s.verified} obligations were compiled from public sources and not individually checked
          {s.stale > 0 ? `; ${s.stale} are past their review date` : ""}. Each item shows its sources and a
          link to report errors.
        </Muted>
      )}
      {!s.hasCityData && (
        <Muted>
          No city-specific requirements are on file for {city}. Local licenses and permits may still apply;
          check with the city.
        </Muted>
      )}
      {s.changes.length > 0 && (
        <Collapse
          level={3}
          summary={
            <Text fontWeight="600">
              {s.changes.length} rule {s.changes.length === 1 ? "change" : "changes"} coming that affect this
              business
            </Text>
          }
        >
          <YStack gap="1" paddingBottom="2">
            {s.changes.map((c) => (
              <Paragraph key={c.id}>
                <Text fontWeight="600">{formatDate(c.effective)}</Text> · {c.summary}{" "}
                {c.source ? <ExternalLink url={c.source}>source</ExternalLink> : null}
              </Paragraph>
            ))}
          </YStack>
        </Collapse>
      )}
    </YStack>
  );
}
