import type { ComplianceItem, LaunchPlan } from "business-obligations";
import { Label, Paragraph, Text, XStack, YStack } from "tamagui";
import { WithLocale, useI18n } from "../i18n/context";
import type { Messages } from "../i18n/messages";
import { CheckBox } from "../shared/CheckBox";
import { Collapse } from "../shared/Collapse";
import { Chip, ExternalLink, Stat } from "../shared/primitives";
import { Confidence, Fee } from "./chips";
import { JURISDICTIONS } from "./filters";
import { ConditionChip } from "./ConditionChip";
import type { ConditionalItem } from "./ObligationsList";

export interface LaunchListProps {
  plan: LaunchPlan;
  costs?: { oneTime: number; annual: number };
  /**
   * Items that apply only under conditions not yet known (see `ObligationsListProps.conditional`). Shown after the
   * phases, grouped by level (city first), each with what would bring it in; they have no checkbox.
   */
  conditional?: ConditionalItem[];
  done?: ReadonlySet<string>;
  /**
   * Show the dates, progress and fees above the phases (default). Pass `false` when a `PlanSummary` shows them, so
   * the same figures are not repeated.
   */
  summary?: boolean;
  onToggle?: (id: string, checked: boolean) => void;
  /**
   * Called with the profile field when a condition of a conditional item is pressed. By default the page's
   * `ProfileForm` is opened at the input that answers it (see `focusProfileField`).
   */
  onEditField?: (field: string) => void;
  /**
   * Language of the interface text and of dates, numbers and relative times: "en" (default) or "es", or any other
   * locale tag together with `messages`. Text from the data is translated separately, with `localizePlan`.
   */
  locale?: string;
  /** Interface text for a language the package does not bundle. */
  messages?: Messages;
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
      <CheckBox id={id} checked={checked} onChange={() => onChange?.(!checked)} />
      <Label htmlFor={id} flex={1} minWidth={0} cursor="pointer">
        <YStack gap="1" flexShrink={1} minWidth={0}>
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

function LaunchListBody({
  plan,
  costs,
  conditional = [],
  done = new Set(),
  summary = true,
  onToggle,
  onEditField,
}: LaunchListProps) {
  const { m, money, date, relativeDays } = useI18n();
  const completed = plan.steps.filter((step) => done.has(step.item.id)).length;
  const byId = new Map(plan.steps.map((step) => [step.item.id, step.item]));
  return (
    <YStack gap="4">
      {summary && (
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
      )}
      {/* Only once something is done: an empty track looks like a scrollbar, and the Progress figure above says 0 already. */}
      {summary && completed > 0 && (
        <YStack
          role="progressbar"
          aria-label={m.progress}
          aria-valuemin={0}
          aria-valuemax={plan.steps.length}
          aria-valuenow={completed}
          height={6}
          backgroundColor="color-3"
          borderRadius="full"
          overflow="hidden"
        >
          <XStack
            height="100%"
            width={`${(completed / plan.steps.length) * 100}%`}
            backgroundColor="accent-background"
          />
        </YStack>
      )}
      {plan.phases.map((phase, index) => {
        const remaining = phase.steps.filter((step) => !done.has(step.item.id)).length;
        return (
          <Collapse
            key={phase.id}
            card
            level={2}
            defaultOpen={remaining > 0 || phase.id === "operate"}
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
          </Collapse>
        );
      })}
      {conditional.length > 0 && (
        <Collapse
          card
          level={2}
          summary={
            <XStack gap="2" alignItems="center" flexWrap="wrap">
              <Text fontWeight="600">{m.conditionalHeading}</Text>
              <Chip tone="warn" outline>
                {conditional.length}
              </Chip>
            </XStack>
          }
        >
          <YStack gap="3">
            <Paragraph fontSize="sm" color="placeholder-color">
              {m.conditionalNote}
            </Paragraph>
            {JURISDICTIONS.map((jurisdiction) => {
              const group = conditional.filter(({ item }) => item.jurisdiction === jurisdiction);
              if (!group.length) return null;
              return (
                <YStack key={jurisdiction} gap="2">
                  <Text fontSize="sm" fontWeight="700" color="placeholder-color">
                    {m.jurisdictions[jurisdiction]}
                  </Text>
                  {group.map(({ item, when }) => (
                    <YStack key={item.id} gap="1" paddingVertical="1">
                      <Text fontWeight="600">
                        <ExternalLink url={item.url}>{item.title}</ExternalLink>
                      </Text>
                      <Text fontSize="sm" color="placeholder-color">
                        {item.authority}
                      </Text>
                      <XStack flexWrap="wrap" gap="1.5">
                        <ConditionChip when={when} onEditField={onEditField} />
                        <Fee item={item} />
                        <Chip>{m.frequencies[item.frequency] ?? item.frequency}</Chip>
                      </XStack>
                    </YStack>
                  ))}
                </YStack>
              );
            })}
          </YStack>
        </Collapse>
      )}
    </YStack>
  );
}
