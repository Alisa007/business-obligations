"use client";

import { useMemo } from "react";
import { Button, Input, Paragraph, Text, XStack, YStack } from "tamagui";
import type { ComplianceItem } from "business-obligations";
import { CONFIDENCE, formatDate, frequencyLabel, hostOf, money, relativeDays } from "../lib/format";
import { JURISDICTIONS, countBy, groupObligations, type Analysis, type ObligationFilters } from "../lib/plan";
import {
  CheckField,
  Chip,
  DefinitionList,
  Disclosure,
  ExternalLink,
  ListRow,
  Muted,
  NativeSelect,
  Stat,
  useControlProps,
} from "./ui";

type Provenance = NonNullable<ComplianceItem["provenance"]>;

const confidenceTone = { checked: "good", compiled: "neutral", unconfirmed: "warn" } as const;

function Confidence({ p }: { p?: Provenance }) {
  if (!p) return null;
  const title = `${CONFIDENCE[p.confidence] ?? ""}${p.checkedOn ? `, checked ${formatDate(p.checkedOn)}` : ""}`;
  return (
    <Chip outline tone={confidenceTone[p.confidence] ?? "neutral"} title={title}>
      {p.confidence}
    </Chip>
  );
}

function Fee({ item }: { item: ComplianceItem }) {
  return item.cost?.amount !== undefined ? <Chip>fee {money(item.cost.amount)}</Chip> : null;
}

// ---- Launch plan ----

export function PlanView({
  data,
  done,
  onToggle,
}: {
  data: Analysis;
  done: ReadonlySet<string>;
  onToggle: (id: string, checked: boolean) => void;
}) {
  const { plan } = data;
  const ids = new Set(plan.steps.map((s) => s.item.id));
  const doneCount = [...done].filter((x) => ids.has(x)).length;
  const byId = new Map(plan.steps.map((s) => [s.item.id, s.item]));
  return (
    <YStack gap="4">
      <XStack flexWrap="wrap" gap="3">
        <Stat
          label="File formation"
          value={formatDate(plan.formationDate)}
          note={relativeDays(plan.formationDate, plan.startDate)}
        />
        <Stat
          label="Ready to operate"
          value={formatDate(plan.readyDate)}
          note={relativeDays(plan.readyDate, plan.startDate)}
        />
        {plan.onTrack === undefined ? (
          <Stat
            label="Opening date"
            value="Not set"
            note="Add a target opening date to check the plan fits"
          />
        ) : (
          <Stat
            label="Opening"
            value={formatDate(plan.openingDate)}
            note={
              plan.onTrack ? (
                <Text color="green-600">On track, {plan.slackDays} days of slack</Text>
              ) : (
                <Text color="red-600">{-(plan.slackDays ?? 0)} days too soon at these allowances</Text>
              )
            }
          />
        )}
        <Stat
          label="Progress"
          value={`${doneCount} / ${plan.steps.length}`}
          note="Tick steps off as you go; saved in this browser"
        />
        <Stat
          label="Known fees"
          value={
            <>
              {money(data.costs.oneTime)}{" "}
              <Text fontSize="sm" color="placeholder-color">
                one-time
              </Text>
            </>
          }
          note={`${money(data.costs.annual)} per year`}
        />
      </XStack>

      <YStack gap="3">
        {plan.phases.map((phase, n) => {
          const left = phase.steps.filter((s) => !done.has(s.item.id)).length;
          const range = `${formatDate(phase.start)}${phase.end ? ` → ${formatDate(phase.end)}` : " onward"}`;
          return (
            <Disclosure
              key={phase.id}
              card
              open={left > 0 || phase.id === "operate"}
              summary={
                <YStack gap="1">
                  <XStack gap="2" alignItems="center" flexWrap="wrap">
                    <Chip tone="info" outline>
                      {n + 1}
                    </Chip>
                    <Text fontWeight="600" fontSize="base">
                      {phase.title}
                    </Text>
                    <Chip tone={left === 0 ? "good" : "neutral"} outline={left === 0}>
                      {left === 0 ? "done" : `${left} to do`}
                    </Chip>
                  </XStack>
                  <Muted>{range}</Muted>
                </YStack>
              }
            >
              <YStack gap="1">
                <Muted>{phase.description}</Muted>
                {phase.steps.map((s) => {
                  const needs = s.dependsOn
                    .map((d) => byId.get(d))
                    .filter((x): x is ComplianceItem => Boolean(x))
                    .slice(0, 2)
                    .map((x) => x.title);
                  const checked = done.has(s.item.id);
                  return (
                    <CheckField
                      key={s.item.id}
                      id={`step-${s.item.id}`}
                      checked={checked}
                      onChange={(v) => onToggle(s.item.id, v)}
                    >
                      <YStack gap="1">
                        <Text fontWeight="600" textDecorationLine={checked ? "line-through" : "none"}>
                          <Text color="placeholder-color" fontWeight="400">
                            {s.order}.{" "}
                          </Text>
                          <ExternalLink url={s.item.url}>{s.item.title}</ExternalLink>
                        </Text>
                        <Muted>{s.item.authority}</Muted>
                        <XStack flexWrap="wrap" gap="1.5">
                          {s.legalDeadline ? (
                            <Chip outline tone="bad" title="Legal due date">
                              due {formatDate(s.legalDeadline)} ·{" "}
                              {relativeDays(s.legalDeadline, plan.startDate)}
                            </Chip>
                          ) : s.target ? (
                            <Chip>by {formatDate(s.target)}</Chip>
                          ) : null}
                          <Fee item={s.item} />
                          <Chip>{frequencyLabel(s.item.frequency)}</Chip>
                          <Confidence p={s.item.provenance} />
                        </XStack>
                        {needs.length > 0 && <Muted>After: {needs.join("; ")}</Muted>}
                      </YStack>
                    </CheckField>
                  );
                })}
              </YStack>
            </Disclosure>
          );
        })}
      </YStack>
      <Muted>
        Dates are planning allowances, not agency processing times. Legal due dates are shown where the rules
        give one.
      </Muted>
    </YStack>
  );
}

// ---- Obligations ----

function obligationDetails(i: ComplianceItem): Array<[string, React.ReactNode]> {
  const rows: Array<[string, React.ReactNode]> = [
    ["Why it applies", i.reason],
    ["Authority", <ExternalLink url={i.url}>{i.authority}</ExternalLink>],
  ];
  if (i.penalty) {
    const late = i.penalty.percentPerMonth ? ` plus ${i.penalty.percentPerMonth}% per month` : "";
    rows.push(["If late", `${money(i.penalty.amount)}${late}. ${i.penalty.note}`]);
  }
  const p = i.provenance;
  if (p && p.sources.length > 0) {
    rows.push([
      "Sources",
      <>
        {p.sources.slice(0, 3).map((u, n) => (
          <span key={u}>
            {n > 0 && ", "}
            <ExternalLink url={u}>{hostOf(u)}</ExternalLink>
          </span>
        ))}
        {p.checkedOn ? ` (checked ${formatDate(p.checkedOn)})` : ""}
      </>,
    ]);
  }
  return rows;
}

export function ObligationsView({
  data,
  filters,
  onFilters,
}: {
  data: Analysis;
  filters: ObligationFilters;
  onFilters: (f: ObligationFilters) => void;
}) {
  const controlProps = useControlProps();
  const items = data.result.items;
  const asOf = data.result.asOf;
  const byJurisdiction = useMemo(() => countBy(items, "jurisdiction", filters), [items, filters]);
  const byCategory = useMemo(() => countBy(items, "category", filters), [items, filters]);
  const categories = useMemo(
    () => Object.keys(countBy(items, "category", { ...filters, category: "all" })).sort(),
    [items, filters],
  );
  const groups = useMemo(() => groupObligations(items, filters), [items, filters]);
  const total = Object.values(byJurisdiction).reduce((a, b) => a + b, 0);
  const filterButton = (key: string, label: string, n: number) => (
    <Button
      key={key}
      size="sm"
      theme={filters.jurisdiction === key ? "accent" : undefined}
      disabled={n === 0 && key !== "all"}
      onPress={() => onFilters({ ...filters, jurisdiction: key })}
      aria-pressed={filters.jurisdiction === key}
    >
      {label} {n}
    </Button>
  );
  return (
    <YStack gap="3">
      <XStack gap="3" flexWrap="wrap">
        <YStack flexBasis={220} flexGrow={1}>
          <Input
            placeholder="Search obligations"
            aria-label="Search obligations"
            value={filters.query}
            onChangeText={(query) => onFilters({ ...filters, query })}
            {...controlProps}
          />
        </YStack>
        <YStack flexBasis={220} flexGrow={1}>
          <NativeSelect
            id="category"
            label="Category"
            value={filters.category}
            onChange={(category) => onFilters({ ...filters, category })}
            options={[
              ["all", "All categories"],
              ...categories.map((c): [string, string] => [c, `${c} (${byCategory[c] ?? 0})`]),
            ]}
          />
        </YStack>
      </XStack>
      <XStack gap="1.5" flexWrap="wrap">
        {filterButton("all", "All", total)}
        {JURISDICTIONS.map(([k, l]) => filterButton(k, l, byJurisdiction[k] ?? 0))}
      </XStack>
      {groups.length === 0 ? (
        <Muted>No obligations match these filters.</Muted>
      ) : (
        groups.map((g) => (
          <YStack key={g.jurisdiction}>
            <XStack gap="2" alignItems="baseline" paddingTop="3" paddingBottom="1">
              <Text fontSize="lg" fontWeight="600">
                {g.label}
              </Text>
              <Muted>{g.items.length}</Muted>
            </XStack>
            {g.items.map((i) => (
              <Disclosure
                key={i.id}
                summary={
                  <YStack gap="1.5">
                    <Text fontWeight="600">
                      <ExternalLink url={i.url}>{i.title}</ExternalLink>
                    </Text>
                    <XStack gap="1.5" flexWrap="wrap" alignItems="center">
                      {i.nextDue ? (
                        <Chip tone="info" outline>
                          due {formatDate(i.nextDue)} · {relativeDays(i.nextDue, asOf)}
                        </Chip>
                      ) : i.deadline ? (
                        <Chip>{i.deadline}</Chip>
                      ) : null}
                      <Chip>{frequencyLabel(i.frequency)}</Chip>
                      <Chip>{i.category}</Chip>
                      <Fee item={i} />
                      <Confidence p={i.provenance} />
                    </XStack>
                  </YStack>
                }
              >
                <YStack gap="2" paddingBottom="2">
                  <Paragraph>{i.description}</Paragraph>
                  <DefinitionList items={obligationDetails(i)} />
                </YStack>
              </Disclosure>
            ))}
          </YStack>
        ))
      )}
    </YStack>
  );
}

// ---- Calendar, fees, what-if ----

export function CalendarView({ data, onDownload }: { data: Analysis; onDownload: () => void }) {
  return (
    <YStack gap="3" alignItems="flex-start">
      <Button size="sm" onPress={onDownload}>
        Download .ics
      </Button>
      {data.events.length === 0 ? (
        <Muted>
          No dated deadlines in the next year. Add a formation date for anniversary-based filings.
        </Muted>
      ) : (
        <YStack width="100%">
          {data.events.map((e) => (
            <ListRow key={`${e.itemId}-${e.date}`} columnGap="4">
              <Text fontWeight="600" width={120}>
                {formatDate(e.date)}
              </Text>
              <YStack flex={1} flexBasis={220} minWidth={0}>
                <Text>
                  <ExternalLink url={e.url}>{e.title}</ExternalLink>
                </Text>
                <Muted>{e.authority}</Muted>
              </YStack>
            </ListRow>
          ))}
        </YStack>
      )}
    </YStack>
  );
}

export function CostsView({ data }: { data: Analysis }) {
  const urlOf = new Map(data.result.items.map((i) => [i.id, i.url]));
  return (
    <YStack gap="3">
      <Paragraph>
        Known government fees: <Text fontWeight="700">{money(data.costs.annual)}</Text> per year,{" "}
        <Text fontWeight="700">{money(data.costs.oneTime)}</Text> one-time.
      </Paragraph>
      <YStack>
        {data.costs.lines.map((l) => (
          <ListRow key={l.id} flexWrap="nowrap" justifyContent="space-between">
            <Text flex={1} minWidth={0}>
              <ExternalLink url={urlOf.get(l.id)}>{l.title}</ExternalLink>
              {l.estimate ? " (estimate)" : ""}
            </Text>
            <Text fontWeight="600">{money(l.perYear || l.amount)}</Text>
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
