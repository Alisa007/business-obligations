"use client";

import { useEffect, useRef, useState } from "react";
import { H1, Paragraph, ScrollView, Tabs, Text, XStack, YStack } from "tamagui";
import { DISCLAIMER } from "business-obligations";
import {
  Chip,
  ExternalLink,
  LaunchList,
  NO_OBLIGATION_FILTERS,
  ObligationsList,
  ProfileForm,
  lookupPlace,
  needsProfession,
  profileFromChoices,
  todayIso,
  ThemeToggle,
  useProfileChoices,
  writeProfileQuery,
  type ObligationFilters,
} from "business-obligations-ui";
import { SITE_CONFIG } from "../lib/config";
import { analyze, type Analysis } from "../lib/plan";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDoneSteps } from "../hooks/useDoneSteps";
import { CalendarView, CostsView, ResultSummary, WhatIfView } from "./views";
import { Muted, Panel } from "./ui";

const TABS = [
  ["plan", "Launch plan"],
  ["items", "Obligations"],
  ["calendar", "Calendar"],
  ["costs", "Fees"],
  ["whatif", "What if"],
] as const;
type TabId = (typeof TABS)[number][0];

function EmptyPlanState() {
  const steps = [
    ["1", "Describe", "Your location and business"],
    ["2", "Review", "The obligations that apply"],
    ["3", "Act", "Deadlines in a simple plan"],
  ];
  return (
    <YStack gap="4" justifyContent="center" flex={1} paddingVertical="3">
      <YStack gap="1.5">
        <Text fontSize="xl" fontWeight="700">
          Build your plan
        </Text>
        <Muted>Start with your ZIP code. We’ll use it to find the state and local requirements.</Muted>
      </YStack>
      <XStack gap="3" flexWrap="wrap">
        {steps.map(([number, title, description]) => (
          <XStack key={number} gap="2.5" flex={1} flexBasis={150} alignItems="flex-start">
            <Chip tone="info" outline>
              {number}
            </Chip>
            <YStack gap="0.5" flex={1}>
              <Text fontWeight="600">{title}</Text>
              <Muted size="xs">{description}</Muted>
            </YStack>
          </XStack>
        ))}
      </XStack>
    </YStack>
  );
}

/** How long the details stay unchanged before the result is worked out again. */
/** Width of the form beside the results, in px; the form itself is as wide as this. */
const SIDEBAR_WIDTH = 340;
const RECALCULATE_DELAY_MS = 400;

export function Playground() {
  const analytics = useAnalytics();
  const { done, toggle } = useDoneSteps();
  const [now, setNow] = useState("2026-01-01");
  const [data, setData] = useState<Analysis>();
  const [error, setError] = useState<string>();
  const [tab, setTab] = useState<TabId>("plan");
  const [filters, setFilters] = useState<ObligationFilters>(NO_OBLIGATION_FILTERS);
  // The form is the package's `ProfileForm`; its answers live in the address, and this reads them.
  const [choices] = useProfileChoices();

  useEffect(() => setNow(todayIso()), []);

  // Report each field once per visit, by name only.
  const usedFields = useRef(new Set<string>());
  const fieldUsed = (field: string) => {
    if (usedFields.current.has(field)) return;
    usedFields.current.add(field);
    analytics.track("field_used", { field });
  };

  // The result follows the address. Whenever the details change it is worked out again, after a short pause so that
  // typing is not a calculation per key; there is no button to press. Without a complete ZIP there is nothing to show.
  const key = writeProfileQuery("", choices);
  const choicesRef = useRef(choices);
  choicesRef.current = choices;
  useEffect(() => {
    const state = choicesRef.current;
    if (!/^\d{5}$/.test(state.zip)) {
      setData(undefined);
      setError(undefined);
      return;
    }
    let current = true;
    const timer = setTimeout(async () => {
      try {
        const place = await lookupPlace(state.zip);
        if (!place) throw new Error(`Unknown ZIP code "${state.zip}"`);
        const result = analyze(profileFromChoices(state, place), {
          asOf: state.asOf || undefined,
          openingDate: state.openingDate || undefined,
          isNew: !state.isFormed,
        });
        if (!current) return;
        analytics.track("plan_generated", {
          zip: state.zip,
          entityType: state.entityType,
          naics: state.naics,
          profession: needsProfession(state) ? state.profession : undefined,
          employees: state.employeeCount,
          owners: state.ownerCount,
          payroll: state.annualPayroll,
          revenue: state.annualRevenue,
          sellsGoods: state.sellsTaxableGoods,
          homeBased: state.homeBased,
          tradeName: state.usesTradeName,
          isNew: !state.isFormed,
          formationDate: state.isFormed ? state.formationDate || undefined : undefined,
          asOf: state.asOf || undefined,
          openingDate: state.openingDate || undefined,
        });
        analytics.log("plan_generated", {
          entityType: state.entityType,
          naics: state.naics,
          isNew: !state.isFormed,
        });
        setData(result);
        setError(undefined);
      } catch (err) {
        if (!current) return;
        const message = err instanceof Error ? err.message : String(err);
        analytics.log("plan_generation_failed", {
          reason: message.startsWith("Unknown ZIP") ? "unknown_zip" : "analysis_error",
        });
        setData(undefined);
        setError(message);
      }
    }, RECALCULATE_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
    // `key` is the address: the effect reads the state it stands for, through the ref.
  }, [key]);

  const onCalendarDownload = (events: number) => {
    analytics.track("ics_downloaded", { events });
    analytics.log("ics_downloaded", { events });
  };

  const renderView = () => {
    if (!data) return null;
    switch (tab) {
      case "plan":
        return (
          <LaunchList
            plan={data.plan}
            costs={data.costs}
            conditional={data.conditional}
            done={done}
            onToggle={toggle}
          />
        );
      case "items":
        return (
          <ObligationsList
            items={data.result.items}
            conditional={data.conditional}
            asOf={data.result.asOf}
            filters={filters}
            onFilters={setFilters}
          />
        );
      case "calendar":
        return <CalendarView data={data} onDownload={onCalendarDownload} />;
      case "costs":
        return <CostsView data={data} />;
      case "whatif":
        return <WhatIfView data={data} />;
    }
  };

  return (
    <YStack
      maxWidth={1180}
      width="100%"
      boxSizing="border-box"
      marginHorizontal="auto"
      paddingHorizontal="4"
      paddingVertical="6"
      gap="6"
    >
      <YStack gap="2.5" alignItems="flex-start" width="100%" maxWidth={720}>
        <XStack width="100%" justifyContent="space-between" alignItems="center" gap="3">
          <Chip tone="info" outline>
            Compliance planning, simplified
          </Chip>
          <ThemeToggle />
        </XStack>
        <H1
          fontSize={{ default: "2xl", md: "4xl" }}
          lineHeight={1.05}
          letterSpacing={-1}
          whiteSpace="normal"
          wordWrap="break-word"
          width="100%"
          minWidth={0}
        >
          Business obligations, in order.
        </H1>
        <Paragraph
          fontSize={{ default: "base", md: "lg" }}
          color="placeholder-color"
          maxWidth={620}
          whiteSpace="normal"
          width="100%"
          minWidth={0}
        >
          Describe a US business and get a practical checklist of the licenses, permits, filings, and
          deadlines that apply.
        </Paragraph>
      </YStack>

      <YStack
        gap="5"
        flexDirection={{ default: "column", md: "row" }}
        alignItems={{ default: "stretch", md: "flex-start" }}
      >
        <YStack
          width={{ default: "100%", md: SIDEBAR_WIDTH }}
          flexShrink={{ default: 1, md: 0 }}
          position={{ default: "relative", md: "sticky" }}
          top={16}
        >
          <Panel gap="2.5" padding="3.5">
            <ProfileForm today={now} onFieldUsed={fieldUsed} />
          </Panel>
        </YStack>
        <YStack flex={1} minWidth={0} aria-live="polite">
          <Panel gap="4" padding="4" minHeight={220} minWidth={0}>
            {!data && !error && <EmptyPlanState />}
            {error && (
              <Text color="amber-700" role="alert">
                {error}
              </Text>
            )}
            {data && (
              <>
                <ResultSummary data={data} />
                <Tabs
                  value={tab}
                  onValueChange={(v) => {
                    setTab(v as TabId);
                    analytics.track("tab_viewed", { tab: v });
                  }}
                  orientation="horizontal"
                  flexDirection="column"
                  gap="3"
                >
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} flexGrow={0}>
                    <Tabs.List borderBottomWidth={1} borderColor="border-color" borderRadius={0} gap="1">
                      {TABS.map(([id, label]) => {
                        const active = id === tab;
                        const count = { items: data.result.items.length, calendar: data.events.length }[
                          id as "items" | "calendar"
                        ];
                        return (
                          <Tabs.Tab
                            key={id}
                            value={id}
                            flexShrink={0}
                            backgroundColor="transparent"
                            borderWidth={0}
                            borderRadius={0}
                            borderBottomWidth={2}
                            borderBottomColor={active ? "accent-background" : "transparent"}
                            marginBottom={-1}
                            paddingHorizontal="3"
                            gap="1.5"
                          >
                            <Text
                              whiteSpace="nowrap"
                              fontWeight={active ? "700" : "500"}
                              color={active ? "color" : "placeholder-color"}
                            >
                              {label}
                            </Text>
                            {count !== undefined && <Chip>{count}</Chip>}
                          </Tabs.Tab>
                        );
                      })}
                    </Tabs.List>
                  </ScrollView>
                  <Tabs.Content value={tab}>{renderView()}</Tabs.Content>
                </Tabs>
              </>
            )}
          </Panel>
        </YStack>
      </YStack>

      <YStack
        className="site-footer"
        role="contentinfo"
        gap="1"
        borderTopWidth={1}
        borderColor="border-color"
        paddingTop="4"
      >
        {analytics.enabled && (
          <Muted>
            This site records usage with PostHog: page views, which tabs and fields you use, and the details
            you enter when you generate a plan (ZIP, entity type, industry, headcount, payroll, revenue and
            dates). The plan itself is not sent. Your entries are also kept in this page's address so you can
            bookmark or share a link; the address is not sent with page views. There are no cookies or session
            recordings, and your browser&apos;s Do Not Track setting is respected.
          </Muted>
        )}
        <Muted>
          {DISCLAIMER} See each item&apos;s provenance and the{" "}
          <ExternalLink url={`${SITE_CONFIG.repoUrl}/blob/main/packages/core/COVERAGE.md`}>
            coverage report
          </ExternalLink>
          . <ExternalLink url={SITE_CONFIG.repoUrl}>Source on GitHub</ExternalLink>.
        </Muted>
        <Muted>
          Suggested planning dates are allowances, not agency processing times. Statutory deadlines come from
          the rules and are labeled as such.
        </Muted>
      </YStack>
    </YStack>
  );
}
