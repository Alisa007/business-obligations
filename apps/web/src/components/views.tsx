"use client";

import { useMemo } from "react";
import { Button, H2, Paragraph, Text, XStack, YStack } from "tamagui";
import type { ComplianceItem } from "compliance-rules-engine";
import { CONFIDENCE, formatDate, frequencyLabel, hostOf, money, relativeDays } from "../lib/format";
import { JURISDICTIONS, countBy, groupObligations, type Analysis, type ObligationFilters } from "../lib/plan";
import { Chip, ExternalLink, Muted, Panel } from "./ui";

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

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <YStack
      flexBasis={170}
      flexGrow={1}
      borderWidth={1}
      borderColor="border-color"
      borderRadius="md"
      padding="3"
      gap="0.5"
    >
      <Muted size="xs">{label}</Muted>
      <Text fontSize="xl" fontWeight="600">
        {value}
      </Text>
      {note ? (
        <Text fontSize="sm" color="placeholder-color">
          {note}
        </Text>
      ) : null}
    </YStack>
  );
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
            <details key={phase.id} open={left > 0 || phase.id === "operate"} className="cre-details">
              <summary>
                <XStack gap="2.5" alignItems="baseline" flexWrap="wrap">
                  <Chip tone="info" outline>
                    {n + 1}
                  </Chip>
                  <Text fontWeight="600">{phase.title}</Text>
                  <Muted>{range}</Muted>
                  <Muted>{left === 0 ? "done" : `${left} to do`}</Muted>
                </XStack>
              </summary>
              <YStack gap="1" paddingTop="1.5">
                <Muted>{phase.description}</Muted>
                {phase.steps.map((s) => {
                  const needs = s.dependsOn
                    .map((d) => byId.get(d))
                    .filter((x): x is ComplianceItem => Boolean(x))
                    .slice(0, 2)
                    .map((x) => x.title);
                  const checked = done.has(s.item.id);
                  return (
                    <label key={s.item.id} className="cre-step" style={{ opacity: checked ? 0.6 : 1 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onToggle(s.item.id, e.target.checked)}
                      />
                      <Text fontSize="sm" color="placeholder-color" minWidth={22} textAlign="right">
                        {s.order}
                      </Text>
                      <YStack flex={1} gap="0.5">
                        <Text fontWeight="600" textDecorationLine={checked ? "line-through" : "none"}>
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
                    </label>
                  );
                })}
              </YStack>
            </details>
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

export function ObligationsView({
  data,
  filters,
  onFilters,
}: {
  data: Analysis;
  filters: ObligationFilters;
  onFilters: (f: ObligationFilters) => void;
}) {
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
      <XStack gap="2" flexWrap="wrap" alignItems="center">
        <input
          type="search"
          className="cre-search"
          placeholder="Search obligations"
          aria-label="Search obligations"
          value={filters.query}
          onChange={(e) => onFilters({ ...filters, query: e.target.value })}
        />
        <select
          className="cre-search"
          aria-label="Category"
          value={filters.category}
          onChange={(e) => onFilters({ ...filters, category: e.target.value })}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c} ({byCategory[c] ?? 0})
            </option>
          ))}
        </select>
      </XStack>
      <XStack gap="1.5" flexWrap="wrap">
        {filterButton("all", "All", total)}
        {JURISDICTIONS.map(([k, l]) => filterButton(k, l, byJurisdiction[k] ?? 0))}
      </XStack>
      {groups.length === 0 ? (
        <Muted>No obligations match these filters.</Muted>
      ) : (
        groups.map((g) => (
          <YStack key={g.jurisdiction} gap="0.5">
            <H2 fontSize="lg" marginTop="3">
              {g.label} <Muted>{g.items.length}</Muted>
            </H2>
            {g.items.map((i) => (
              <details key={i.id} className="cre-details cre-ob">
                <summary>
                  <XStack gap="2" flexWrap="wrap" alignItems="center">
                    <Text fontWeight="600">
                      <ExternalLink url={i.url}>{i.title}</ExternalLink>
                    </Text>
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
                </summary>
                <YStack gap="1.5" paddingTop="2" paddingBottom="1">
                  <Paragraph>{i.description}</Paragraph>
                  <dl className="cre-dl">
                    <dt>Why it applies</dt>
                    <dd>{i.reason}</dd>
                    <dt>Authority</dt>
                    <dd>
                      <ExternalLink url={i.url}>{i.authority}</ExternalLink>
                    </dd>
                    {i.penalty && (
                      <>
                        <dt>If late</dt>
                        <dd>
                          {money(i.penalty.amount)}
                          {i.penalty.percentPerMonth
                            ? ` plus ${i.penalty.percentPerMonth}% per month`
                            : ""}. {i.penalty.note}
                        </dd>
                      </>
                    )}
                    {(i.provenance?.sources.length ?? 0) > 0 && (
                      <>
                        <dt>Sources</dt>
                        <dd>
                          {i.provenance!.sources.slice(0, 3).map((u, n) => (
                            <span key={u}>
                              {n > 0 && ", "}
                              <ExternalLink url={u}>{hostOf(u)}</ExternalLink>
                            </span>
                          ))}
                          {i.provenance!.checkedOn ? ` (checked ${formatDate(i.provenance!.checkedOn)})` : ""}
                        </dd>
                      </>
                    )}
                  </dl>
                </YStack>
              </details>
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
        <table className="cre-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Deadline</th>
              <th>Authority</th>
            </tr>
          </thead>
          <tbody>
            {data.events.map((e) => (
              <tr key={`${e.itemId}-${e.date}`}>
                <td>{formatDate(e.date)}</td>
                <td>
                  <ExternalLink url={e.url}>{e.title}</ExternalLink>
                </td>
                <td>{e.authority}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
      <table className="cre-table">
        <tbody>
          {data.costs.lines.map((l) => (
            <tr key={l.id}>
              <td>
                <ExternalLink url={urlOf.get(l.id)}>{l.title}</ExternalLink>
                {l.estimate ? " (estimate)" : ""}
              </td>
              <td className="cre-num">{money(l.perYear || l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
        <table className="cre-table">
          <tbody>
            {sensitivity.map((s) => (
              <tr key={s.field}>
                <td>
                  {s.field} (now {JSON.stringify(s.current)})
                </td>
                <td>
                  {s.changes.slice(0, 4).map((c) => (
                    <div key={JSON.stringify(c.value)}>
                      {JSON.stringify(c.value)}: +{c.added.length} / −{c.removed.length}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </YStack>
  );
}

export { Panel };
