import type { ReactNode } from "react";
import type { ComplianceItem, LaunchPlan } from "business-obligations";
import { Accordion, Anchor, Button, Checkbox, Input, Label, Paragraph, Text, XStack, YStack } from "tamagui";

export interface LaunchListProps {
  plan: LaunchPlan;
  costs?: { oneTime: number; annual: number };
  done?: ReadonlySet<string>;
  onToggle?: (id: string, checked: boolean) => void;
}

export interface ObligationFilters {
  jurisdiction: string;
  category: string;
  query: string;
  trust: "all" | "verified" | "unverified";
}

export const NO_OBLIGATION_FILTERS: ObligationFilters = {
  jurisdiction: "all",
  category: "all",
  query: "",
  trust: "all",
};

export interface ObligationsListProps {
  items: ComplianceItem[];
  asOf: string;
  filters: ObligationFilters;
  onFilters: (filters: ObligationFilters) => void;
}

const JURISDICTIONS = [
  ["federal", "Federal"],
  ["state", "State"],
  ["county", "County"],
  ["city", "City"],
] as const;

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
    amount,
  );

const date = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : "";

const isVerified = (item: Pick<ComplianceItem, "provenance">) =>
  item.provenance?.confidence === "checked" && !item.provenance.stale;

const isSoon = (value: string, asOf: string) => {
  const days = (Date.parse(`${value}T00:00:00Z`) - Date.parse(`${asOf}T00:00:00Z`)) / 86_400_000;
  return days >= 0 && days <= 30;
};

const nativeControl = {
  width: "100%",
  minHeight: 44,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border-color)",
  background: "var(--background)",
  color: "var(--color)",
  font: "inherit",
  fontSize: 16,
};

const frequency = (value: string) =>
  ({
    once: "One-time",
    annual: "Annual",
    biennial: "Every 2 years",
    every_five_years: "Every 5 years",
    quarterly: "Quarterly",
    monthly: "Monthly",
    per_event: "Per event",
    ongoing: "Ongoing",
  })[value] ?? value;

const relativeDays = (value: string | undefined, from: string) => {
  if (!value) return "";
  const days = Math.round((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
  return new Intl.RelativeTimeFormat("en-US", { numeric: "auto" }).format(days, "day");
};

const safeUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
};

const host = (value: string) => {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
};

function ExternalLink({ url, children }: { url?: string; children: ReactNode }) {
  const href = safeUrl(url);
  return href ? (
    <Anchor
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      color="accent-background"
      textDecorationLine="underline"
      textAlign="left"
    >
      {children}
    </Anchor>
  ) : (
    <Text>{children}</Text>
  );
}

function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <YStack flexBasis={150} flexGrow={1} backgroundColor="color-2" borderRadius="md" padding="3" gap="0.5">
      <Text fontSize="xs" color="placeholder-color">
        {label}
      </Text>
      <Text fontSize="xl" fontWeight="600">
        {value}
      </Text>
      {note && (
        <Text fontSize="sm" color="placeholder-color">
          {note}
        </Text>
      )}
    </YStack>
  );
}

function Chip({
  children,
  tone = "neutral",
  outline = false,
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
  outline?: boolean;
  title?: string;
}) {
  const color = {
    neutral: "color",
    good: "green-600",
    warn: "amber-600",
    bad: "red-600",
    info: "accent-background",
  }[tone];
  return (
    <XStack
      borderWidth={1}
      borderColor={outline ? color : "transparent"}
      backgroundColor={outline ? "transparent" : "color-2"}
      borderRadius="md"
      paddingHorizontal="2"
      paddingVertical="0.5"
      {...(title ? { "aria-label": title } : {})}
    >
      <Text fontSize="xs" color={outline ? color : "color"}>
        {children}
      </Text>
    </XStack>
  );
}

function Disclosure({
  summary,
  children,
  open = false,
  card = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  open?: boolean;
  card?: boolean;
}) {
  return (
    <Accordion
      type="multiple"
      defaultValue={open ? ["item"] : []}
      {...(card
        ? { borderWidth: 1, borderColor: "border-color", borderRadius: "lg", overflow: "hidden" }
        : { borderTopWidth: 1, borderColor: "border-color" })}
    >
      <Accordion.Item value="item">
        <Accordion.Header>
          <Accordion.Trigger
            flexDirection="row"
            alignItems="flex-start"
            gap="2.5"
            paddingVertical="3"
            paddingHorizontal={card ? "3" : "0"}
            width="100%"
            alignSelf="stretch"
            justifyContent="flex-start"
            textAlign="left"
            backgroundColor="transparent"
            borderWidth={0}
            cursor="pointer"
          >
            {({ open: isOpen }: { open: boolean }) => (
              <>
                <Text
                  color="placeholder-color"
                  width={14}
                  marginTop={2}
                  rotate={isOpen ? "90deg" : "0deg"}
                  transition="transform 180ms ease-out"
                >
                  ▸
                </Text>
                <YStack flex={1} minWidth={0} alignItems="flex-start" alignSelf="stretch" textAlign="left">
                  {summary}
                </YStack>
              </>
            )}
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.HeightAnimator
          transition={{ duration: 220, easing: "ease-out", properties: "min-height" }}
        >
          <Accordion.Content paddingBottom="3" paddingHorizontal={card ? "3" : "0"}>
            <YStack paddingLeft="6">{children}</YStack>
          </Accordion.Content>
        </Accordion.HeightAnimator>
      </Accordion.Item>
    </Accordion>
  );
}

function Confidence({ item }: { item: ComplianceItem }) {
  const provenance = item.provenance;
  if (!provenance) return null;
  const label =
    provenance.confidence === "checked"
      ? `checked${provenance.checkedOn ? ` ${date(provenance.checkedOn)}` : ""}`
      : provenance.confidence === "unconfirmed"
        ? "partly unconfirmed"
        : "not individually checked";
  const tone =
    provenance.confidence === "checked"
      ? "good"
      : provenance.confidence === "unconfirmed"
        ? "warn"
        : "neutral";
  return (
    <>
      <Chip outline tone={tone}>
        {label}
      </Chip>
      {provenance.stale && (
        <Chip outline tone="warn">
          review overdue
        </Chip>
      )}
    </>
  );
}

function Fee({ item }: { item: ComplianceItem }) {
  return item.cost?.amount !== undefined ? <Chip>fee {money(item.cost.amount)}</Chip> : null;
}

function CheckStep({
  id,
  item,
  checked,
  onChange,
}: {
  id: string;
  item: ComplianceItem;
  checked: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <XStack gap="3" alignItems="flex-start" paddingVertical="1" opacity={checked ? 0.6 : 1}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange?.(value === true)}
        size="md"
        marginTop="0.5"
      >
        <Checkbox.Indicator>
          <Text fontSize="xs">✓</Text>
        </Checkbox.Indicator>
      </Checkbox>
      <Label htmlFor={id} flex={1} minWidth={0} cursor="pointer">
        <YStack gap="1">
          <Text fontWeight="600" textDecorationLine={checked ? "line-through" : "none"}>
            <ExternalLink url={item.url}>{item.title}</ExternalLink>
          </Text>
          <Text fontSize="sm" color="placeholder-color">
            {item.authority}
          </Text>
        </YStack>
      </Label>
    </XStack>
  );
}

export function LaunchList({ plan, costs, done = new Set(), onToggle }: LaunchListProps) {
  const completed = plan.steps.filter((step) => done.has(step.item.id)).length;
  const byId = new Map(plan.steps.map((step) => [step.item.id, step.item]));
  return (
    <YStack gap="4">
      <XStack flexWrap="wrap" gap="3">
        <Stat
          label="File formation"
          value={date(plan.formationDate)}
          note={relativeDays(plan.formationDate, plan.startDate)}
        />
        <Stat
          label="Ready to operate"
          value={date(plan.readyDate)}
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
            value={date(plan.openingDate)}
            note={
              plan.onTrack ? (
                <Text color="green-600">On track, {plan.slackDays} days of slack</Text>
              ) : (
                <Text color="red-600">{-(plan.slackDays ?? 0)} days too soon</Text>
              )
            }
          />
        )}
        <Stat label="Progress" value={`${completed} / ${plan.steps.length}`} note="Saved in this browser" />
        {costs && (
          <Stat
            label="Known fees"
            value={
              <>
                {money(costs.oneTime)} <Text fontSize="sm">one-time</Text>
              </>
            }
            note={`${money(costs.annual)} per year`}
          />
        )}
      </XStack>
      <YStack height={6} backgroundColor="color-3" borderRadius="full" overflow="hidden">
        <XStack
          height="100%"
          width={`${plan.steps.length ? (completed / plan.steps.length) * 100 : 0}%`}
          backgroundColor="accent-background"
        />
      </YStack>
      {plan.phases.map((phase, index) => {
        const remaining = phase.steps.filter((step) => !done.has(step.item.id)).length;
        return (
          <Disclosure
            key={phase.id}
            card
            open={remaining > 0 || phase.id === "operate"}
            summary={
              <YStack gap="1">
                <XStack gap="2" alignItems="center" flexWrap="wrap">
                  <Chip tone="info" outline>
                    {index + 1}
                  </Chip>
                  <Text fontWeight="600">{phase.title}</Text>
                  <Chip tone={remaining === 0 ? "good" : "neutral"} outline={remaining === 0}>
                    {remaining === 0 ? "done" : `${remaining} to do`}
                  </Chip>
                </XStack>
                <Text fontSize="sm" color="placeholder-color">
                  {date(phase.start)}
                  {phase.end ? ` → ${date(phase.end)}` : " onward"}
                </Text>
              </YStack>
            }
          >
            <YStack gap="2">
              <Paragraph fontSize="sm" color="placeholder-color">
                {phase.description}
              </Paragraph>
              {phase.steps.map((step) => {
                const needs = step.dependsOn
                  .map((id) => byId.get(id))
                  .filter((item): item is ComplianceItem => Boolean(item))
                  .slice(0, 2)
                  .map((item) => item.title);
                return (
                  <YStack key={step.item.id} gap="1">
                    <CheckStep
                      id={`step-${step.item.id}`}
                      item={step.item}
                      checked={done.has(step.item.id)}
                      onChange={onToggle ? (checked) => onToggle(step.item.id, checked) : undefined}
                    />
                    <XStack flexWrap="wrap" gap="1.5" paddingLeft="8">
                      {step.legalDeadline ? (
                        <Chip outline tone="bad">
                          due {date(step.legalDeadline)} · {relativeDays(step.legalDeadline, plan.startDate)}
                        </Chip>
                      ) : step.target ? (
                        <Chip>by {date(step.target)}</Chip>
                      ) : null}
                      <Fee item={step.item} />
                      <Chip>{frequency(step.item.frequency)}</Chip>
                      <Confidence item={step.item} />
                    </XStack>
                    {needs.length > 0 && (
                      <Text fontSize="sm" color="placeholder-color" paddingLeft="8">
                        After: {needs.join("; ")}
                      </Text>
                    )}
                  </YStack>
                );
              })}
            </YStack>
          </Disclosure>
        );
      })}
      <Text fontSize="sm" color="placeholder-color">
        Dates are planning allowances, not agency processing times. Legal due dates are shown where the rules
        give one.
      </Text>
    </YStack>
  );
}

function itemMatches(item: ComplianceItem, filters: ObligationFilters) {
  const query = filters.query.trim().toLowerCase();
  return (
    (filters.jurisdiction === "all" || item.jurisdiction === filters.jurisdiction) &&
    (filters.category === "all" || item.category === filters.category) &&
    (filters.trust === "all" || (filters.trust === "verified") === isVerified(item)) &&
    (!query ||
      `${item.title} ${item.authority} ${item.description} ${item.reason}`.toLowerCase().includes(query))
  );
}

export function filterObligations(items: ComplianceItem[], filters: ObligationFilters): ComplianceItem[] {
  return items.filter((item) => itemMatches(item, filters));
}

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

function ObligationDetails({
  item,
  titleOf,
}: {
  item: ComplianceItem;
  titleOf: (id: string) => string | undefined;
}) {
  const rows: Array<[string, ReactNode]> = [["Why it applies", item.reason]];
  if (item.preemptedBy) rows.push(["Replaced by", titleOf(item.preemptedBy) ?? item.preemptedBy]);
  if (item.appliesWhen?.length)
    rows.push([
      "Applies when",
      item.appliesWhen
        .map(
          (when) =>
            when.description ??
            `${when.field} ${OP[when.op] ?? when.op} ${Array.isArray(when.value) ? when.value.join(", ") : String(when.value)}`,
        )
        .join("; "),
    ]);
  if (item.exemptions?.length) rows.push(["Exceptions", item.exemptions.join("; ")]);
  rows.push(["Authority", <ExternalLink url={item.url}>{item.authority}</ExternalLink>]);
  const how = [
    item.formId ? `Form ${item.formId}` : undefined,
    item.filingMethod?.length
      ? item.filingMethod.map((method) => FILING_METHOD[method] ?? method).join(", ")
      : undefined,
    item.processingTime,
  ].filter(Boolean);
  if (how.length) rows.push(["How to file", how.join(" · ")]);
  if (item.renewal) rows.push(["Renewal", item.renewal]);
  if (item.penalty)
    rows.push([
      "If late",
      `${money(item.penalty.amount)}${item.penalty.percentPerMonth ? ` plus ${item.penalty.percentPerMonth}% per month` : ""}${item.penalty.note ? `. ${item.penalty.note}` : ""}`,
    ]);
  const provenance = item.provenance;
  if (provenance?.sources.length) {
    const sources =
      provenance.sourceDetails ??
      provenance.sources.map((url) => ({ url, kind: "agency_page" as const, archiveUrl: "" }));
    rows.push([
      "Sources",
      <>
        {sources.slice(0, 3).map((source, index) => (
          <span key={source.url}>
            {index > 0 && "; "}
            <ExternalLink url={source.url}>{host(source.url)}</ExternalLink>
            {source.kind === "pdf" ? " (PDF)" : ""}
            {source.archiveUrl ? (
              <>
                {" "}
                (<ExternalLink url={source.archiveUrl}>archived copy</ExternalLink>)
              </>
            ) : null}
          </span>
        ))}
      </>,
    ]);
  }
  if (provenance)
    rows.push([
      "Data",
      `${provenance.confidence === "checked" && provenance.checkedOn ? `Checked against official pages on ${date(provenance.checkedOn)}` : `Compiled from public sources${provenance.compiledOn ? ` on ${date(provenance.compiledOn)}` : ""}; not individually checked`}${provenance.reviewBy ? `. ${provenance.stale ? "Review overdue since" : "Review due by"} ${date(provenance.reviewBy)}.` : ""}`,
    ]);
  if (item.feedbackUrl)
    rows.push([
      "See an error?",
      <ExternalLink url={item.feedbackUrl}>Report it or suggest a correction</ExternalLink>,
    ]);
  return (
    <YStack gap="2" paddingBottom="2">
      <Paragraph>{item.description}</Paragraph>
      {rows.map(([label, value]) => (
        <XStack key={label} gap="1" columnGap="4" flexWrap="wrap">
          <Text fontSize="sm" fontWeight="600" width={130}>
            {label}
          </Text>
          <Text fontSize="sm" flex={1} flexBasis={200} minWidth={0}>
            {value}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}

export function ObligationsList({ items, asOf, filters, onFilters }: ObligationsListProps) {
  const categories = [...new Set(items.map((item) => item.category))].sort();
  const filtered = filterObligations(items, filters);
  const titleById = new Map(items.map((item) => [item.id, item.title]));
  const count = (jurisdiction: string) =>
    items.filter((item) => itemMatches(item, { ...filters, jurisdiction })).length;
  const categoryCount = (category: string) =>
    items.filter((item) => itemMatches(item, { ...filters, category })).length;
  const hasFilters =
    filters.jurisdiction !== "all" ||
    filters.category !== "all" ||
    filters.query !== "" ||
    filters.trust !== "all";
  const clearFilters = () => onFilters({ ...NO_OBLIGATION_FILTERS });
  return (
    <YStack gap="3">
      <XStack justifyContent="space-between" gap="3" flexWrap="wrap" alignItems="baseline">
        <YStack gap="0.5">
          <Text fontWeight="700">Find an obligation</Text>
          <Text fontSize="sm" color="placeholder-color">
            Showing {filtered.length} of {items.length} obligations
          </Text>
        </YStack>
        {hasFilters && (
          <Button size="sm" onPress={clearFilters}>
            Clear filters
          </Button>
        )}
      </XStack>
      <XStack gap="3" flexWrap="wrap" alignItems={"flex-end"}>
        <Input
          flex={1}
          flexBasis={220}
          placeholder="Search obligations"
          aria-label="Search obligations"
          value={filters.query}
          onChangeText={(query) => onFilters({ ...filters, query })}
        />
        <YStack flexBasis={220} flexGrow={1} gap="0.5">
          <Label htmlFor="obligation-category" fontSize="sm" color="placeholder-color">
            Category
          </Label>
          <select
            id="obligation-category"
            aria-label="Category"
            style={nativeControl}
            value={filters.category}
            onChange={(event) => onFilters({ ...filters, category: event.target.value })}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category} ({categoryCount(category)})
              </option>
            ))}
          </select>
        </YStack>
        <YStack flexBasis={220} flexGrow={1} gap="0.5">
          <Label htmlFor="obligation-trust" fontSize="sm" color="placeholder-color">
            Data confidence
          </Label>
          <select
            id="obligation-trust"
            aria-label="Data confidence"
            style={nativeControl}
            value={filters.trust}
            onChange={(event) =>
              onFilters({ ...filters, trust: event.target.value as ObligationFilters["trust"] })
            }
          >
            <option value="all">All confidence levels</option>
            <option value="verified">Checked against official pages</option>
            <option value="unverified">Needs verification</option>
          </select>
        </YStack>
      </XStack>
      <XStack gap="1.5" flexWrap="wrap">
        {[["all", "All"] as const, ...JURISDICTIONS].map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            theme={filters.jurisdiction === key ? "accent" : undefined}
            disabled={count(key) === 0 && key !== "all"}
            onPress={() => onFilters({ ...filters, jurisdiction: key })}
            aria-pressed={filters.jurisdiction === key}
          >
            {label} {key === "all" ? filtered.length : count(key)}
          </Button>
        ))}
      </XStack>
      {filtered.length === 0 ? (
        <Text color="placeholder-color">No obligations match these filters.</Text>
      ) : (
        JURISDICTIONS.map(([jurisdiction, label]) => {
          const group = filtered
            .filter((item) => item.jurisdiction === jurisdiction)
            .sort((a, b) => (a.nextDue ?? "9999-12-31").localeCompare(b.nextDue ?? "9999-12-31"));
          if (!group.length) return null;
          return (
            <YStack key={jurisdiction}>
              <XStack gap="2" alignItems="center" paddingTop="3" paddingBottom="1">
                <Text fontSize="lg" fontWeight="600">
                  {label}
                </Text>
                <Chip tone="info">{group.length}</Chip>
              </XStack>
              <YStack gap="3">
                {group.map((item) => (
                  <Disclosure
                    key={item.id}
                    card
                    summary={
                      <YStack gap="1.5" alignItems="flex-start" width="100%">
                        <Text fontWeight="600" textAlign="left" alignSelf="stretch">
                          <ExternalLink url={item.url}>{item.title}</ExternalLink>
                        </Text>
                        <Text fontSize="sm" color="placeholder-color">
                          {item.authority}
                        </Text>
                        <XStack gap="1.5" flexWrap="wrap">
                          {item.nextDue ? (
                            <Chip tone={isSoon(item.nextDue, asOf) ? "warn" : "info"} outline>
                              due {date(item.nextDue)} · {relativeDays(item.nextDue, asOf)}
                            </Chip>
                          ) : item.deadline ? (
                            <Chip>{item.deadline}</Chip>
                          ) : null}
                          <Chip>{frequency(item.frequency)}</Chip>
                          <Chip>{item.category}</Chip>
                          <Fee item={item} />
                          <Confidence item={item} />
                        </XStack>
                      </YStack>
                    }
                  >
                    <ObligationDetails item={item} titleOf={(id) => titleById.get(id)} />
                  </Disclosure>
                ))}
              </YStack>
            </YStack>
          );
        })
      )}
    </YStack>
  );
}

export type { ComplianceItem, LaunchPlan };
