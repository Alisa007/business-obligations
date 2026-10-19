import { findCity, findCounty, STATES } from "business-obligations";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { WithLocale, useI18n } from "../i18n/context";
import type { Messages } from "../i18n/messages";
import { ExternalLink } from "../shared/primitives";

export interface LocationSummaryProps {
  /** Two-letter state code. The state is always needed: cities and counties are looked up within it. */
  state: string;
  /** County name as the ZIP data spells it, without "County". */
  county?: string;
  /** City name. */
  city?: string;
  /** Use a compact summary when detailed local requirements are shown elsewhere. */
  compact?: boolean;
  /** See `LaunchListProps.locale`. */
  locale?: string;
  /** See `LaunchListProps.messages`. */
  messages?: Messages;
}

const asList = (value?: string | string[]) => (value ? [value].flat() : []);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <YStack gap="1" flexBasis={260} flexGrow={1} flexShrink={1}>
      <Text fontSize="sm" color="placeholder-color">
        {label}
      </Text>
      <Text>{children}</Text>
    </YStack>
  );
}

/**
 * What is specific to the smallest place given: the city when there is one, otherwise the county, otherwise the
 * state. Everything comes from the engine's data for that one place; the state and federal rules the plan shares
 * are not repeated. Text from the data (titles, agency names) is shown as it is, in English.
 */
export function LocationSummary(props: LocationSummaryProps) {
  return (
    <WithLocale locale={props.locale} messages={props.messages}>
      <LocationSummaryBody {...props} />
    </WithLocale>
  );
}

function LocationSummaryBody({ state, county, city, compact = false }: LocationSummaryProps) {
  const { m, date } = useI18n();
  const stateData = STATES[state];
  const local = city ? findCity(state, city, county) : county ? findCounty(state, county) : undefined;
  const name = city ?? county ?? stateData?.name ?? state;
  const status = local ? (local.status ?? (local.items.length ? "rules" : "unverified")) : undefined;
  const sources = asList(local?.sourceUrl);
  const agencies = stateData
    ? ([
        ["filing", stateData.filing],
        ["revenue", stateData.revenue],
        ["labor", stateData.labor],
      ] as const)
    : [];

  return (
    <YStack
      gap={compact ? "1.5" : "3"}
      render="section"
      padding={compact ? "3" : "4"}
      borderWidth={1}
      borderColor="border-color"
      borderRadius="lg"
    >
      <Text fontSize={compact ? "lg" : "xl"} fontWeight="700" role="heading" aria-level={2}>
        {compact ? name : m.summary.heading(name)}
      </Text>
      {!compact && !city && !county && stateData?.salesTax.permit ? (
        <XStack gap="4" flexWrap="wrap">
          <Row label={m.summary.salesTaxPermit}>{stateData.salesTax.permit}</Row>
        </XStack>
      ) : null}
      {status ? (
        <YStack gap="1">
          <Text>
            {m.summary.status[status]}
            {local?.checkedOn ? ` · ${m.summary.checkedOn(date(local.checkedOn))}` : ""}
          </Text>
          {!compact && local && local.items.length ? (
            <YStack gap="1">
              <Text fontWeight="600">{m.summary.localItems}</Text>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {local.items.map((item) => (
                  <li key={item.id}>
                    <ExternalLink url={item.url}>{item.title}</ExternalLink>{" "}
                    <Text color="placeholder-color">· {item.authority}</Text>
                  </li>
                ))}
              </ul>
            </YStack>
          ) : status === "rules" ? null : (
            <Paragraph fontSize="sm" color="placeholder-color">
              {m.summary.noLocalItems}
            </Paragraph>
          )}
        </YStack>
      ) : null}
      {!compact && !city && !county && agencies.length ? (
        <YStack gap="1">
          <Text fontWeight="600">{m.summary.agencies}</Text>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {agencies.map(([role, agency]) => (
              <li key={role}>
                {m.summary.agencyRoles[role]}: <ExternalLink url={agency.url}>{agency.name}</ExternalLink>
              </li>
            ))}
          </ul>
        </YStack>
      ) : null}
      {sources.length ? (
        <Paragraph fontSize="sm" color="placeholder-color">
          {m.summary.sources}:{" "}
          {sources.map((url, index) => (
            <span key={url}>
              {index ? ", " : ""}
              <ExternalLink url={url}>{new URL(url).hostname}</ExternalLink>
            </span>
          ))}
        </Paragraph>
      ) : null}
    </YStack>
  );
}
