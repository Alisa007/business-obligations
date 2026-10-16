"use client";

import { useMemo } from "react";
import { Button, Input, Paragraph, Text, XStack, YStack } from "tamagui";
import type { ComplianceItem } from "business-obligations";
import { CONFIDENCE, formatDate, frequencyLabel, hostOf, money, relativeDays } from "../lib/format";
import {
  JURISDICTIONS,
  countBy,
  groupObligations,
  summarize,
  type Analysis,
  type ObligationFilters,
} from "../lib/plan";
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
  const label =
    p.confidence === "checked"
      ? `checked${p.checkedOn ? ` ${formatDate(p.checkedOn)}` : ""}`
      : p.confidence === "unconfirmed"
        ? "partly unconfirmed"
        : "not individually checked";
  const title = `${CONFIDENCE[p.confidence] ?? ""}${p.checkedOn ? `, checked ${formatDate(p.checkedOn)}` : ""}`;
  return (
    <>
      <Chip outline tone={confidenceTone[p.confidence] ?? "neutral"} title={title}>
        {label}
      </Chip>
      {p.stale && (
        <Chip
          outline
          tone="warn"
          title={`Past its review date${p.reviewBy ? ` (${formatDate(p.reviewBy)})` : ""}`}
        >
          review overdue
        </Chip>
      )}
    </>
  );
}

/** Within the next 30 days. */
function soon(due: string, asOf: string): boolean {
  const days = (Date.parse(`${due}T00:00:00Z`) - Date.parse(`${asOf}T00:00:00Z`)) / 86_400_000;
  return days >= 0 && days <= 30;
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

const FILING_METHOD: Record<string, string> = {
  online: "online",
  mail: "by mail",
  in_person: "in person",
  fax: "by fax",
};

const OP: Record<string, string> = {
  ">=": "at least",
  ">": "more than",
  "<=": "at most",
  "<": "less than",
  "==": "is",
  "!=": "is not",
  in: "is one of",
};

function obligationDetails(
  i: ComplianceItem,
  titleOf: (id: string) => string | undefined,
): Array<[string, React.ReactNode]> {
  const rows: Array<[string, React.ReactNode]> = [["Why it applies", i.reason]];
  if (i.preemptedBy) {
    rows.push(["Replaced by", titleOf(i.preemptedBy) ?? i.preemptedBy]);
  }
  if (i.appliesWhen?.length) {
    rows.push([
      "Applies when",
      i.appliesWhen
        .map(
          (w) =>
            w.description ??
            `${w.field} ${OP[w.op] ?? w.op} ${Array.isArray(w.value) ? w.value.join(", ") : String(w.value)}`,
        )
        .join("; "),
    ]);
  }
  if (i.exemptions?.length) rows.push(["Exceptions", i.exemptions.join("; ")]);
  rows.push(["Authority", <ExternalLink url={i.url}>{i.authority}</ExternalLink>]);
  const how = [
    i.formId ? `Form ${i.formId}` : undefined,
    i.filingMethod?.length ? i.filingMethod.map((m) => FILING_METHOD[m] ?? m).join(", ") : undefined,
    i.processingTime,
  ].filter(Boolean);
  if (how.length) rows.push(["How to file", how.join(" · ")]);
  if (i.renewal) rows.push(["Renewal", i.renewal]);
  for (const c of i.upcomingChanges ?? [])
    rows.push(["Changing", `${c.summary} (effective ${formatDate(c.effective)})`]);
  if (i.penalty) {
    const late = i.penalty.percentPerMonth ? ` plus ${i.penalty.percentPerMonth}% per month` : "";
    rows.push(["If late", `${money(i.penalty.amount)}${late}${i.penalty.note ? `. ${i.penalty.note}` : ""}`]);
  }
  const p = i.provenance;
  if (p && p.sources.length > 0) {
    const details =
      p.sourceDetails ?? p.sources.map((url) => ({ url, kind: "agency_page" as const, archiveUrl: "" }));
    rows.push([
      "Sources",
      <>
        {details.slice(0, 3).map((s, n) => (
          <span key={s.url}>
            {n > 0 && "; "}
            <ExternalLink url={s.url}>{hostOf(s.url)}</ExternalLink>
            {s.kind === "pdf" ? " (PDF)" : ""}
            {s.archiveUrl ? (
              <>
                {" "}
                (<ExternalLink url={s.archiveUrl}>archived copy</ExternalLink>)
              </>
            ) : null}
          </span>
        ))}
      </>,
    ]);
  }
  if (p) {
    const state =
      p.confidence === "checked" && p.checkedOn
        ? `Checked against official pages on ${formatDate(p.checkedOn)}`
        : `Compiled from public sources${p.compiledOn ? ` on ${formatDate(p.compiledOn)}` : ""}; not individually checked`;
    rows.push([
      "Data",
      `${state}${p.reviewBy ? `. ${p.stale ? "Review overdue since" : "Review due by"} ${formatDate(p.reviewBy)}.` : ""}`,
    ]);
  }
  if (i.feedbackUrl)
    rows.push([
      "See an error?",
      <ExternalLink url={i.feedbackUrl}>Report it or suggest a correction</ExternalLink>,
    ]);
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
  const titleById = useMemo(() => new Map(items.map((i) => [i.id, i.title])), [items]);
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
            id="trust"
            label="Data confidence"
            value={filters.trust}
            onChange={(trust) => onFilters({ ...filters, trust })}
            options={[
              ["all", "All obligations"],
              ["verified", "Checked against official pages"],
              ["unverified", "Needs verification"],
            ]}
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
                  <YStack gap="1.5" alignItems="flex-start" width="100%">
                    <Text fontWeight="600" textAlign="left">
                      <ExternalLink url={i.url}>{i.title}</ExternalLink>
                    </Text>
                    <XStack gap="1.5" flexWrap="wrap" alignItems="center">
                      {i.preemptedBy && (
                        <Chip outline tone="warn" title="Another item replaces this one">
                          replaced
                        </Chip>
                      )}
                      {i.nextDue ? (
                        <Chip tone={soon(i.nextDue, asOf) ? "warn" : "info"} outline>
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
                  <DefinitionList items={obligationDetails(i, (id) => titleById.get(id))} />
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
  // Items the calendar cannot place: no machine-readable due date (one-time setup, or rules stated only as text).
  const undated = data.result.items.filter(
    (i) => !i.due && i.frequency !== "ongoing" && i.frequency !== "per_event",
  );
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
      {undated.length > 0 && (
        <YStack width="100%" gap="1">
          <Muted>No fixed date, so not in the calendar or the .ics file:</Muted>
          {undated.map((i) => (
            <ListRow key={i.id} columnGap="4">
              <Text fontWeight="600" width={120}>
                {i.frequency === "once" ? "One time" : "See rule"}
              </Text>
              <YStack flex={1} flexBasis={220} minWidth={0}>
                <Text>
                  <ExternalLink url={i.url}>{i.title}</ExternalLink>
                </Text>
                {i.deadline && <Muted>{i.deadline}</Muted>}
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
        <Disclosure
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
        </Disclosure>
      )}
    </YStack>
  );
}
