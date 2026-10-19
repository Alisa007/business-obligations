import type { ComplianceItem } from "business-obligations";
import { Button, Input, Label, Text, XStack, YStack } from "tamagui";
import { WithLocale, useI18n } from "../i18n/context";
import type { Messages } from "../i18n/messages";
import { Select } from "../shared/Select";
import { Chip } from "../shared/primitives";
import { ObligationCard, describeWhen } from "./ObligationCard";
import {
  JURISDICTIONS,
  NO_OBLIGATION_FILTERS,
  filterObligations,
  itemMatches,
  type ObligationFilters,
} from "./filters";

/**
 * An item that is not in the list now, but would be if details left blank turned out a certain way: for each such
 * profile field, the values that would bring it in (from `analyzeInputs`, then `evaluate` with that value).
 */
export interface ConditionalItem {
  item: ComplianceItem;
  when: Array<{ field: string; values: unknown[] }>;
}

export interface ObligationsListProps {
  items: ComplianceItem[];
  /** Items that apply only under conditions not yet known. Shown in their own section after the others. */
  conditional?: ConditionalItem[];
  asOf: string;
  filters: ObligationFilters;
  onFilters: (filters: ObligationFilters) => void;
  /** See `LaunchListProps.locale`. */
  locale?: string;
  /** See `LaunchListProps.messages`. */
  messages?: Messages;
}

export function ObligationsList(props: ObligationsListProps) {
  return (
    <WithLocale locale={props.locale} messages={props.messages}>
      <ObligationsListBody {...props} />
    </WithLocale>
  );
}

function ObligationsListBody({ items, conditional = [], asOf, filters, onFilters }: ObligationsListProps) {
  const { m, tag } = useI18n();
  const categoryLabel = (category: ComplianceItem["category"]) => m.categories[category] ?? category;
  const categories = [...new Set(items.map((item) => item.category))].sort((a, b) =>
    categoryLabel(a).localeCompare(categoryLabel(b), tag),
  );
  const filtered = filterObligations(items, filters);
  const shownConditional = conditional.filter(({ item }) => itemMatches(item, filters));
  const titleById = new Map(items.map((item) => [item.id, item.title]));
  const count = (jurisdiction: string) =>
    items.filter((item) => itemMatches(item, { ...filters, jurisdiction })).length;
  const conditionalCount = (jurisdiction: string) =>
    shownConditional.filter(({ item }) => item.jurisdiction === jurisdiction).length;
  const availableJurisdictions = JURISDICTIONS.filter(
    (jurisdiction) =>
      items.some((item) => item.jurisdiction === jurisdiction) ||
      conditional.some(({ item }) => item.jurisdiction === jurisdiction),
  );
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
          <Select
            id="obligation-category"
            value={filters.category}
            options={[
              { value: "all", label: m.allCategories },
              ...categories.map((category) => ({
                value: category,
                label: `${categoryLabel(category)} (${categoryCount(category)})`,
              })),
            ]}
            onChange={(category) => onFilters({ ...filters, category })}
          />
        </YStack>
        <YStack flexBasis={220} flexGrow={1} gap="0.5">
          <Label htmlFor="obligation-trust" fontSize="sm" color="placeholder-color">
            {m.dataConfidence}
          </Label>
          <Select
            id="obligation-trust"
            value={filters.trust}
            options={[
              { value: "all", label: m.allConfidenceLevels },
              { value: "verified", label: m.checkedAgainstOfficial },
              { value: "unverified", label: m.needsVerification },
            ]}
            onChange={(trust) => onFilters({ ...filters, trust: trust as ObligationFilters["trust"] })}
          />
        </YStack>
      </XStack>
      <XStack gap="1.5" flexWrap="wrap">
        {(["all", ...availableJurisdictions] as const).map((key) => (
          <Button
            key={key}
            size="sm"
            theme={filters.jurisdiction === key ? "accent" : undefined}
            disabled={count(key) + conditionalCount(key) === 0 && key !== "all"}
            onPress={() => onFilters({ ...filters, jurisdiction: key })}
            aria-pressed={filters.jurisdiction === key}
          >
            {key === "all" ? m.all : m.jurisdictions[key]} {key === "all" ? filtered.length : count(key)}
          </Button>
        ))}
      </XStack>
      {shownConditional.length > 0 && (
        <Text fontSize="sm" color="placeholder-color">
          {m.conditionalNote}
        </Text>
      )}
      {filtered.length === 0 && shownConditional.length === 0 ? (
        <Text color="placeholder-color">{m.noMatch}</Text>
      ) : (
        JURISDICTIONS.map((jurisdiction) => {
          const byDue = (a: ComplianceItem, b: ComplianceItem) =>
            (a.nextDue ?? "9999-12-31").localeCompare(b.nextDue ?? "9999-12-31");
          const group = filtered.filter((item) => item.jurisdiction === jurisdiction).sort(byDue);
          // Items that may apply stay in the group of the level that requires them, after the ones that do apply.
          const maybe = shownConditional
            .filter(({ item }) => item.jurisdiction === jurisdiction)
            .sort((a, b) => byDue(a.item, b.item));
          if (!group.length && !maybe.length) return null;
          return (
            <YStack key={jurisdiction}>
              <XStack gap="2" alignItems="center" paddingTop="3" paddingBottom="1" flexWrap="wrap">
                <Text render="h2" fontSize="lg" fontWeight="600" margin={0}>
                  {m.jurisdictions[jurisdiction]}
                </Text>
                <Chip tone="info">{group.length}</Chip>
                {maybe.length > 0 && (
                  <Chip tone="warn" outline>
                    +{maybe.length} {m.conditionalHeading.toLowerCase()}
                  </Chip>
                )}
              </XStack>
              <YStack gap="3">
                {group.map((item) => (
                  <ObligationCard key={item.id} item={item} asOf={asOf} titleOf={(id) => titleById.get(id)} />
                ))}
                {maybe.map(({ item, when }) => (
                  <YStack key={item.id} opacity={0.8}>
                    <ObligationCard
                      item={item}
                      asOf={asOf}
                      titleOf={(id) => titleById.get(id)}
                      note={
                        <XStack gap="1.5" flexWrap="wrap">
                          <Chip tone="warn" outline>
                            {m.appliesIf(when.map((condition) => describeWhen(m, condition)).join("; "))}
                          </Chip>
                        </XStack>
                      }
                    />
                  </YStack>
                ))}
              </YStack>
            </YStack>
          );
        })
      )}
    </YStack>
  );
}
