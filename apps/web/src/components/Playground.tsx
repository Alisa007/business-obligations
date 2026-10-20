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
  SidebarLayout,
  ThemeToggle,
  useBeforePaint,
  useHydrated,
  useProfileChoices,
  writeProfileQuery,
  type ObligationFilters,
} from "business-obligations-ui";
import { SITE_CONFIG } from "../lib/config";
import { analyze, type Analysis } from "../lib/plan";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDoneSteps } from "../hooks/useDoneSteps";
import { CalendarView, CostsView, ResultSummary, WhatIfView } from "./views";
import { Muted } from "./ui";

const TABS = [
  ["plan", "Launch plan"],
  ["items", "Obligations"],
  ["calendar", "Calendar"],
  ["costs", "Fees"],
  ["whatif", "What if"],
] as const;
type TabId = (typeof TABS)[number][0];

/**
 * Stands in for the summary, tabs and list while a plan is being worked out (a ZIP code is in the address), at about
 * their height, so the page does not jump when the plan arrives.
 */
function PlanSkeleton() {
  return (
    <YStack gap="4" aria-busy={true} aria-label="Working out your plan">
      <YStack height={150} backgroundColor="color-2" borderRadius="lg" />
      <YStack height={36} backgroundColor="color-2" borderRadius="md" />
      {[0, 1, 2].map((block) => (
        <YStack key={block} height={110} backgroundColor="color-2" borderRadius="lg" />
      ))}
    </YStack>
  );
}

/** How long the details stay unchanged before the result is worked out again. */
const RECALCULATE_DELAY_MS = 400;

// The ZIP table is a separate download; start it now, because the first plan needs it.
if (typeof window !== "undefined") void import("business-obligations/zip");

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

  // Today's date is set before the first paint, not after, so the form never shows the placeholder date.
  useBeforePaint(() => setNow(todayIso()), []);
  // False on the server and while hydrating: the address (and so the plan) is not known until the page is running.
  const hydrated = useHydrated();

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
  // The first plan, for an address that already has details, is worked out at once; only later changes wait.
  const firstRun = useRef(true);
  useEffect(() => {
    const state = choicesRef.current;
    // Without a complete ZIP only the federal obligations are shown, which need no place.
    const federalOnly = !/^\d{5}$/.test(state.zip);
    let current = true;
    const delay = firstRun.current ? 0 : RECALCULATE_DELAY_MS;
    const timer = setTimeout(async () => {
      firstRun.current = false;
      try {
        const place = federalOnly ? undefined : await lookupPlace(state.zip);
        if (!federalOnly && !place) throw new Error(`Unknown ZIP code "${state.zip}"`);
        const result = analyze(profileFromChoices(state, place), {
          federalOnly,
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
    }, delay);
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
            summary={false}
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
    <SidebarLayout
      railLabel="Business details"
      rail={
        <>
          <XStack justifyContent="space-between" alignItems="center" gap="3">
            <Text fontWeight="700">Business obligations</Text>
            <ThemeToggle />
          </XStack>
          <ProfileForm compact today={now} onFieldUsed={fieldUsed} />
        </>
      }
    >
      <YStack gap="2.5" alignItems="flex-start" width="100%" maxWidth={720}>
        <Chip tone="info" outline>
          Compliance planning, simplified
        </Chip>
        <H1
          fontSize={{ default: "2xl", md: "3xl" }}
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

      {/* Hidden (its room kept) until the page has read the address, so no empty state shows first and is replaced. */}
      <YStack
        className="bo-pending"
        minWidth={0}
        aria-live="polite"
        style={hydrated ? undefined : { visibility: "hidden" }}
      >
        {/* Without JavaScript there is no plan to wait for; show what is there. */}
        <noscript>
          <style>{`.bo-pending{visibility:visible !important}`}</style>
        </noscript>
        {/* A screen of room for the plan from the start (the address is not known until the page is running), so the
              footer starts below the fold and does not jump into view's way when the plan arrives. Not on a phone: the form is
              above the plan there, so a screen of room is a screen of blank space under a short plan. */}
        <YStack gap="4" minHeight={{ default: 0, md: "100vh" }} minWidth={0}>
          {!data && !error && <PlanSkeleton />}
          {error && (
            <Text color="amber-700" role="alert">
              {error}
            </Text>
          )}
          {data && (
            <>
              <ResultSummary data={data} tab={tab} done={done} />
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
        {/* Last, so that it appearing (once analytics is known to be on) moves nothing above it. */}
        {analytics.enabled && (
          <Muted>
            This site records usage with PostHog: page views, which tabs and fields you use, and the details
            you enter when you generate a plan (ZIP, entity type, industry, headcount, payroll, revenue and
            dates). The plan itself is not sent. Your entries are also kept in this page's address so you can
            bookmark or share a link; the address is not sent with page views. There are no cookies or session
            recordings, and your browser&apos;s Do Not Track setting is respected.
          </Muted>
        )}
      </YStack>
    </SidebarLayout>
  );
}
