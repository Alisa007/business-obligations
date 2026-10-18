import type { ReactNode } from "react";
import type { ComplianceItem } from "business-obligations";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { useI18n } from "../i18n/context";
import type { Messages } from "../i18n/messages";
import { Collapse } from "../shared/Collapse";
import { Chip, ExternalLink } from "../shared/primitives";
import { host } from "../shared/url";
import { Confidence, Fee } from "./chips";
import { isSoon } from "./items";

function ObligationDetails({
  item,
  titleOf,
}: {
  item: ComplianceItem;
  titleOf: (id: string) => string | undefined;
}) {
  const { m, money, date } = useI18n();
  const rows: Array<[string, ReactNode]> = [[m.whyItApplies, item.reason]];
  if (item.preemptedBy) rows.push([m.replacedBy, titleOf(item.preemptedBy) ?? item.preemptedBy]);
  if (item.appliesWhen?.length)
    rows.push([
      m.appliesWhen,
      item.appliesWhen
        .map(
          (when) =>
            when.description ??
            `${m.fields[when.field] ?? when.field} ${m.operators[when.op] ?? when.op} ${Array.isArray(when.value) ? when.value.join(", ") : String(when.value)}`,
        )
        .join("; "),
    ]);
  if (item.exemptions?.length) rows.push([m.exceptions, item.exemptions.join("; ")]);
  rows.push([m.authority, <ExternalLink url={item.url}>{item.authority}</ExternalLink>]);
  const how = [
    item.formId ? m.form(item.formId) : undefined,
    item.filingMethod?.length
      ? item.filingMethod.map((method) => m.filingMethods[method] ?? method).join(", ")
      : undefined,
    item.processingTime,
  ].filter(Boolean);
  if (how.length) rows.push([m.howToFile, how.join(" · ")]);
  if (item.renewal) rows.push([m.renewal, item.renewal]);
  if (item.penalty)
    rows.push([
      m.ifLate,
      `${money(item.penalty.amount)}${item.penalty.percentPerMonth ? m.plusPerMonth(item.penalty.percentPerMonth) : ""}${item.penalty.note ? `. ${item.penalty.note}` : ""}`,
    ]);
  const provenance = item.provenance;
  if (provenance?.sources.length) {
    const sources =
      provenance.sourceDetails ??
      provenance.sources.map((url) => ({ url, kind: "agency_page" as const, archiveUrl: "" }));
    rows.push([
      m.sources,
      <>
        {sources.slice(0, 3).map((source, index) => (
          <span key={source.url}>
            {index > 0 && "; "}
            <ExternalLink url={source.url}>{host(source.url)}</ExternalLink>
            {source.kind === "pdf" ? m.pdf : ""}
            {source.archiveUrl ? (
              <>
                {" "}
                (<ExternalLink url={source.archiveUrl}>{m.archivedCopy}</ExternalLink>)
              </>
            ) : null}
          </span>
        ))}
      </>,
    ]);
  }
  if (provenance)
    rows.push([
      m.data,
      `${provenance.confidence === "checked" && provenance.checkedOn ? m.checkedAgainst(date(provenance.checkedOn)) : m.compiledFrom(provenance.compiledOn ? date(provenance.compiledOn) : undefined)}${provenance.reviewBy ? `. ${provenance.stale ? m.reviewOverdueSince(date(provenance.reviewBy)) : m.reviewDueBy(date(provenance.reviewBy))}.` : ""}`,
    ]);
  if (item.feedbackUrl)
    rows.push([m.seeAnError, <ExternalLink url={item.feedbackUrl}>{m.reportIt}</ExternalLink>]);
  return (
    <YStack gap="2" paddingBottom="2">
      <Paragraph>{item.description}</Paragraph>
      {rows.map(([label, value]) => (
        <XStack key={label} gap="1" columnGap="4" flexWrap="wrap">
          <Text fontSize="sm" fontWeight="600" width={130}>
            {label}
          </Text>
          <Text fontSize="sm" flex={1} flexBasis={200} flexShrink={1} minWidth={0}>
            {value}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}

export function ObligationCard({
  item,
  asOf,
  titleOf,
  note,
}: {
  item: ComplianceItem;
  asOf: string;
  titleOf: (id: string) => string | undefined;
  /** Shown above the chips, for what is special about the item in its section. */
  note?: ReactNode;
}) {
  const { m, date, relativeDays } = useI18n();
  const categoryLabel = (category: ComplianceItem["category"]) => m.categories[category] ?? category;
  return (
    <Collapse
      card
      level={3}
      summary={
        <YStack gap="1.5" alignItems="flex-start" width="100%">
          <Text fontWeight="600" textAlign="left" alignSelf="stretch">
            <ExternalLink url={item.url}>{item.title}</ExternalLink>
          </Text>
          <Text fontSize="sm" color="placeholder-color">
            {item.authority}
          </Text>
          {note}
          <XStack gap="1.5" flexWrap="wrap">
            {item.nextDue ? (
              <Chip tone={isSoon(item.nextDue, asOf) ? "warn" : "info"} outline>
                {m.dueOn(date(item.nextDue), relativeDays(item.nextDue, asOf))}
              </Chip>
            ) : item.deadline ? (
              <Chip>{item.deadline}</Chip>
            ) : null}
            <Chip>{m.frequencies[item.frequency] ?? item.frequency}</Chip>
            <Chip>{categoryLabel(item.category)}</Chip>
            <Fee item={item} />
            <Confidence item={item} />
          </XStack>
        </YStack>
      }
    >
      <ObligationDetails item={item} titleOf={titleOf} />
    </Collapse>
  );
}

/** "number of employees: 1, 2, 3 …" for the values of one profile field that would bring an item in. */
export function describeWhen(m: Messages, { field, values }: { field: string; values: unknown[] }): string {
  const shown = values
    .slice(0, 3)
    .map((value) => (typeof value === "boolean" ? (value ? m.yes : m.no) : String(value)));
  return `${m.fields[field] ?? field}: ${shown.join(", ")}${values.length > 3 ? " …" : ""}`;
}
