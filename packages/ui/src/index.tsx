import type { ReactNode } from "react";
import type { ComplianceItem, LaunchPlan } from "business-obligations";
import { Accordion, Anchor, Button, Checkbox, Input, Label, Paragraph, Text, XStack, YStack } from "tamagui";
import { nativeControl } from "./controls";
import { useI18n, WithLocale } from "./i18n";
import type { Messages } from "./messages";

export interface LaunchListProps {
  plan: LaunchPlan;
  costs?: { oneTime: number; annual: number };
  done?: ReadonlySet<string>;
  onToggle?: (id: string, checked: boolean) => void;
  /**
   * Language of the interface text and of dates, numbers and relative times: "en" (default) or "es", or any other
   * locale tag together with `messages`. Text from the data is translated separately, with `localizePlan`.
   */
  locale?: string;
  /** Interface text for a language the package does not bundle. */
  messages?: Messages;
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
  /** See `LaunchListProps.locale`. */
  locale?: string;
  /** See `LaunchListProps.messages`. */
  messages?: Messages;
}

const JURISDICTIONS = ["federal", "state", "county", "city"] as const;

/** Lower case without accents, so that "licencia" finds "Licencia" and "licéncia". */
const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const isVerified = (item: Pick<ComplianceItem, "provenance">) =>
  item.provenance?.confidence === "checked" && !item.provenance.stale;

const isSoon = (value: string, asOf: string) => {
  const days = (Date.parse(`${value}T00:00:00Z`) - Date.parse(`${asOf}T00:00:00Z`)) / 86_400_000;
  return days >= 0 && days <= 30;
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
  level,
}: {
  summary: ReactNode;
  children: ReactNode;
  open?: boolean;
  card?: boolean;
  /** Heading level of the trigger's wrapper, so the page keeps a single h1. */
  level: 2 | 3;
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
        <Accordion.Header render={`h${level}`}>
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
  const { m, date } = useI18n();
  const provenance = item.provenance;
  if (!provenance) return null;
  const label =
    provenance.confidence === "checked"
      ? m.checked(provenance.checkedOn ? date(provenance.checkedOn) : undefined)
      : provenance.confidence === "unconfirmed"
        ? m.partlyUnconfirmed
        : m.notIndividuallyChecked;
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
          {m.reviewOverdue}
        </Chip>
      )}
    </>
  );
}

function Fee({ item }: { item: ComplianceItem }) {
  const { m, money } = useI18n();
  return item.cost?.amount !== undefined ? <Chip>{m.fee(money(item.cost.amount))}</Chip> : null;
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

export function LaunchList(props: LaunchListProps) {
  return (
    <WithLocale locale={props.locale} messages={props.messages}>
      <LaunchListBody {...props} />
    </WithLocale>
  );
}

function LaunchListBody({ plan, costs, done = new Set(), onToggle }: LaunchListProps) {
  const { m, money, date, relativeDays } = useI18n();
  const completed = plan.steps.filter((step) => done.has(step.item.id)).length;
  const byId = new Map(plan.steps.map((step) => [step.item.id, step.item]));
  return (
    <YStack gap="4">
      <XStack flexWrap="wrap" gap="3">
        <Stat
          label={m.fileFormation}
          value={date(plan.formationDate)}
          note={relativeDays(plan.formationDate, plan.startDate)}
        />
        <Stat
          label={m.readyToOperate}
          value={date(plan.readyDate)}
          note={relativeDays(plan.readyDate, plan.startDate)}
        />
        {plan.onTrack === undefined ? (
          <Stat label={m.openingDate} value={m.notSet} note={m.addOpeningDate} />
        ) : (
          <Stat
            label={m.opening}
            value={date(plan.openingDate)}
            note={
              plan.onTrack ? (
                <Text color="green-600">{m.onTrack(plan.slackDays ?? 0)}</Text>
              ) : (
                <Text color="red-600">{m.tooSoon(-(plan.slackDays ?? 0))}</Text>
              )
            }
          />
        )}
        <Stat label={m.progress} value={`${completed} / ${plan.steps.length}`} note={m.savedInBrowser} />
        {costs && (
          <Stat
            label={m.knownFees}
            value={
              <>
                {money(costs.oneTime)} <Text fontSize="sm">{m.oneTime}</Text>
              </>
            }
            note={m.perYear(money(costs.annual))}
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
            level={2}
            open={remaining > 0 || phase.id === "operate"}
            summary={
              <YStack gap="1">
                <XStack gap="2" alignItems="center" flexWrap="wrap">
                  <Chip tone="info" outline>
                    {index + 1}
                  </Chip>
                  <Text fontWeight="600">{phase.title}</Text>
                  <Chip tone={remaining === 0 ? "good" : "neutral"} outline={remaining === 0}>
                    {remaining === 0 ? m.done : m.toDo(remaining)}
                  </Chip>
                </XStack>
                <Text fontSize="sm" color="placeholder-color">
                  {date(phase.start)}
                  {phase.end ? ` → ${date(phase.end)}` : ` ${m.onward}`}
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
                // A date from the rules (a legal deadline or a filing schedule) is statutory; any other date is a planning allowance.
                const statutory = Boolean(step.legalDeadline || (step.target && step.item.deadline));
                return (
                  <YStack key={step.item.id} gap="1">
                    <CheckStep
                      id={`step-${step.item.id}`}
                      item={step.item}
                      checked={done.has(step.item.id)}
                      onChange={onToggle ? (checked) => onToggle(step.item.id, checked) : undefined}
                    />
                    <XStack flexWrap="wrap" gap="1.5" paddingLeft="8">
                      {statutory ? (
                        <Chip outline tone="bad">
                          {m.dueOn(
                            date(step.legalDeadline ?? step.target),
                            relativeDays(step.legalDeadline ?? step.target, plan.startDate),
                          )}
                        </Chip>
                      ) : step.target ? (
                        <Chip>{m.by(date(step.target))}</Chip>
                      ) : null}
                      <Fee item={step.item} />
                      <Chip>{m.frequencies[step.item.frequency] ?? step.item.frequency}</Chip>
                      <Confidence item={step.item} />
                    </XStack>
                    {statutory && (
                      <Text fontSize="sm" color="placeholder-color" paddingLeft="8">
                        {m.triggeredBy(step.item.reason, step.item.deadline)}
                      </Text>
                    )}
                    {needs.length > 0 && (
                      <Text fontSize="sm" color="placeholder-color" paddingLeft="8">
                        {m.after} {needs.join("; ")}
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
        {m.planNote}
      </Text>
    </YStack>
  );
}

function itemMatches(item: ComplianceItem, filters: ObligationFilters) {
  const query = fold(filters.query.trim());
  return (
    (filters.jurisdiction === "all" || item.jurisdiction === filters.jurisdiction) &&
    (filters.category === "all" || item.category === filters.category) &&
    (filters.trust === "all" || (filters.trust === "verified") === isVerified(item)) &&
    (!query || fold(`${item.title} ${item.authority} ${item.description} ${item.reason}`).includes(query))
  );
}

export function filterObligations(items: ComplianceItem[], filters: ObligationFilters): ComplianceItem[] {
  return items.filter((item) => itemMatches(item, filters));
}

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
          <Text fontSize="sm" flex={1} flexBasis={200} minWidth={0}>
            {value}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}

export function ObligationsList(props: ObligationsListProps) {
  return (
    <WithLocale locale={props.locale} messages={props.messages}>
      <ObligationsListBody {...props} />
    </WithLocale>
  );
}

function ObligationsListBody({ items, asOf, filters, onFilters }: ObligationsListProps) {
  const { m, tag, date, relativeDays } = useI18n();
  const categoryLabel = (category: ComplianceItem["category"]) => m.categories[category] ?? category;
  const categories = [...new Set(items.map((item) => item.category))].sort((a, b) =>
    categoryLabel(a).localeCompare(categoryLabel(b), tag),
  );
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
          <Text fontWeight="700">{m.findObligation}</Text>
          <Text fontSize="sm" color="placeholder-color">
            {m.showing(filtered.length, items.length)}
          </Text>
        </YStack>
        {hasFilters && (
          <Button size="sm" onPress={clearFilters}>
            {m.clearFilters}
          </Button>
        )}
      </XStack>
      <XStack gap="3" flexWrap="wrap" alignItems={"flex-end"}>
        <Input
          flex={1}
          flexBasis={220}
          placeholder={m.searchObligations}
          aria-label={m.searchObligations}
          value={filters.query}
          onChangeText={(query) => onFilters({ ...filters, query })}
        />
        <YStack flexBasis={220} flexGrow={1} gap="0.5">
          <Label htmlFor="obligation-category" fontSize="sm" color="placeholder-color">
            {m.category}
          </Label>
          <select
            id="obligation-category"
            aria-label={m.category}
            style={nativeControl}
            value={filters.category}
            onChange={(event) => onFilters({ ...filters, category: event.target.value })}
          >
            <option value="all">{m.allCategories}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)} ({categoryCount(category)})
              </option>
            ))}
          </select>
        </YStack>
        <YStack flexBasis={220} flexGrow={1} gap="0.5">
          <Label htmlFor="obligation-trust" fontSize="sm" color="placeholder-color">
            {m.dataConfidence}
          </Label>
          <select
            id="obligation-trust"
            aria-label={m.dataConfidence}
            style={nativeControl}
            value={filters.trust}
            onChange={(event) =>
              onFilters({ ...filters, trust: event.target.value as ObligationFilters["trust"] })
            }
          >
            <option value="all">{m.allConfidenceLevels}</option>
            <option value="verified">{m.checkedAgainstOfficial}</option>
            <option value="unverified">{m.needsVerification}</option>
          </select>
        </YStack>
      </XStack>
      <XStack gap="1.5" flexWrap="wrap">
        {(["all", ...JURISDICTIONS] as const).map((key) => (
          <Button
            key={key}
            size="sm"
            theme={filters.jurisdiction === key ? "accent" : undefined}
            disabled={count(key) === 0 && key !== "all"}
            onPress={() => onFilters({ ...filters, jurisdiction: key })}
            aria-pressed={filters.jurisdiction === key}
          >
            {key === "all" ? m.all : m.jurisdictions[key]} {key === "all" ? filtered.length : count(key)}
          </Button>
        ))}
      </XStack>
      {filtered.length === 0 ? (
        <Text color="placeholder-color">{m.noMatch}</Text>
      ) : (
        JURISDICTIONS.map((jurisdiction) => {
          const group = filtered
            .filter((item) => item.jurisdiction === jurisdiction)
            .sort((a, b) => (a.nextDue ?? "9999-12-31").localeCompare(b.nextDue ?? "9999-12-31"));
          if (!group.length) return null;
          return (
            <YStack key={jurisdiction}>
              <XStack gap="2" alignItems="center" paddingTop="3" paddingBottom="1">
                <Text render="h2" fontSize="lg" fontWeight="600" margin={0}>
                  {m.jurisdictions[jurisdiction]}
                </Text>
                <Chip tone="info">{group.length}</Chip>
              </XStack>
              <YStack gap="3">
                {group.map((item) => (
                  <Disclosure
                    key={item.id}
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

export { messages, getMessages } from "./messages";
export type { Locale, Messages } from "./messages";
export type { ComplianceItem, LaunchPlan };
export { TypeInput, IndustryInput, EmployeesInput, DetailsInput } from "./profile";
export type { ProfileInputProps, DetailsInputProps } from "./profile";
export {
  DETAIL_FIELDS,
  PROFILE_DEFAULTS,
  PROFILE_PARAMS,
  ProfileQueryProvider,
  readProfileQuery,
  setProfileQuery,
  useProfileChoices,
  writeProfileQuery,
} from "./profileQuery";
export type { DetailField, ProfileChoices } from "./profileQuery";
