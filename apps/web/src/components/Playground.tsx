"use client";

import { useEffect, useRef, useState } from "react";
import { Anchor, H1, Paragraph, ScrollView, Tabs, Text, XStack, YStack } from "tamagui";
import { LaunchList, ObligationsList, type ObligationFilters } from "business-obligations-ui";
import { SITE_CONFIG } from "../lib/config";
import { NO_FILTERS, analyze, buildProfile, needsProfession, today, type Analysis } from "../lib/plan";
import { useAnalytics } from "../hooks/useAnalytics";
import { useUrlState } from "../hooks/useUrlState";
import { isRunnable, parseQuery } from "../lib/query";
import { useDoneSteps } from "../hooks/useDoneSteps";
import { ProfileForm, lookupZip, type PlanRequest } from "./ProfileForm";
import { CalendarView, CostsView, ResultSummary, WhatIfView } from "./views";
import { Chip, Muted, Panel } from "./ui";

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

export function Playground() {
  const analytics = useAnalytics();
  const { done, toggle } = useDoneSteps();
  const [now, setNow] = useState("2026-01-01");
  const [data, setData] = useState<Analysis>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TabId>("plan");
  const [filters, setFilters] = useState<ObligationFilters>(NO_FILTERS);
  const [sidebar, setSidebar] = useUrlState();

  useEffect(() => setNow(today()), []);

  // Report each field once per visit, by name only.
  const usedFields = useRef(new Set<string>());
  const fieldUsed = (field: string) => {
    if (usedFields.current.has(field)) return;
    usedFields.current.add(field);
    analytics.track("field_used", { field });
  };

  const submit = async ({ form, asOf, openingDate }: PlanRequest) => {
    setBusy(true);
    try {
      if (!/^\d{5}$/.test(form.zip.trim())) throw new Error("Enter a 5-digit ZIP code to start");
      const place = await lookupZip(form.zip.trim());
      if (!place) throw new Error(`Unknown ZIP code "${form.zip}"`);
      const result = analyze(buildProfile({ ...form, zip: form.zip.trim() }, place), {
        asOf: asOf || undefined,
        openingDate: openingDate || undefined,
        isNew: form.isNew,
      });
      const num = (v: string) => (v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);
      analytics.track("plan_generated", {
        ...form,
        zip: form.zip.trim(),
        profession: needsProfession(form) ? form.profession : undefined,
        employees: num(form.employees),
        owners: num(form.owners),
        payroll: num(form.payroll),
        revenue: num(form.revenue),
        formationDate: form.isNew ? undefined : form.formationDate || undefined,
        asOf: asOf || undefined,
        openingDate: openingDate || undefined,
      });
      analytics.log("plan_generated", {
        entityType: form.entityType,
        naics: form.naics,
        isNew: form.isNew,
      });
      setData(result);
      setError(undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      analytics.log("plan_generation_failed", {
        reason: message.startsWith("Unknown ZIP")
          ? "unknown_zip"
          : message.startsWith("Enter a 5-digit")
            ? "invalid_zip"
            : "analysis_error",
      });
      setData(undefined);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  // A link (or Back/Forward) that carries a ZIP shows its result straight away.
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    const fromUrl = () => {
      const state = parseQuery(window.location.search);
      if (isRunnable(state))
        void submitRef.current({
          form: state.form,
          asOf: state.asOf,
          openingDate: state.openingDate,
        });
    };
    fromUrl();
    window.addEventListener("popstate", fromUrl);
    return () => window.removeEventListener("popstate", fromUrl);
  }, []);

  const download = () => {
    if (!data) return;
    analytics.track("ics_downloaded", { events: data.events.length });
    analytics.log("ics_downloaded", { events: data.events.length });
    const url = URL.createObjectURL(new Blob([data.ics], { type: "text/calendar" }));
    Object.assign(document.createElement("a"), { href: url, download: "deadlines.ics" }).click();
    URL.revokeObjectURL(url);
  };

  const renderView = () => {
    if (!data) return null;
    switch (tab) {
      case "plan":
        return <LaunchList plan={data.plan} costs={data.costs} done={done} onToggle={toggle} />;
      case "items":
        return (
          <ObligationsList
            items={data.result.items}
            asOf={data.result.asOf}
            filters={filters}
            onFilters={setFilters}
          />
        );
      case "calendar":
        return <CalendarView data={data} onDownload={download} />;
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
        <Chip tone="info" outline>
          Compliance planning, simplified
        </Chip>
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
          width={{ default: "100%", md: 340 }}
          flexShrink={{ default: 1, md: 0 }}
          position={{ default: "relative", md: "sticky" }}
          top={16}
        >
          <ProfileForm
            today={now}
            busy={busy}
            value={sidebar}
            onChange={setSidebar}
            onSubmit={submit}
            onFieldUsed={fieldUsed}
          />
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
                <Muted>{data.result.disclaimer}</Muted>
              </>
            )}
          </Panel>
        </YStack>
      </YStack>

      <YStack gap="1" borderTopWidth={1} borderColor="border-color" paddingTop="4">
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
          General information, not legal or tax advice. Data is compiled from public sources; see each
          item&apos;s provenance and the{" "}
          <Anchor href={`${SITE_CONFIG.repoUrl}/blob/main/packages/core/COVERAGE.md`}>coverage report</Anchor>
          . <Anchor href={SITE_CONFIG.repoUrl}>Source on GitHub</Anchor>.
        </Muted>
      </YStack>
    </YStack>
  );
}
