"use client";

import { useEffect, useState } from "react";
import { Anchor, H1, Paragraph, ScrollView, Tabs, Text, YStack } from "tamagui";
import { SITE_CONFIG } from "../lib/config";
import { NO_FILTERS, analyze, buildProfile, today, type Analysis, type ObligationFilters } from "../lib/plan";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDoneSteps } from "../hooks/useDoneSteps";
import { ProfileForm, lookupZip, type PlanRequest } from "./ProfileForm";
import { CalendarView, CostsView, ObligationsView, PlanView, WhatIfView } from "./views";
import { Chip, Muted, Panel } from "./ui";

const TABS = [
  ["plan", "Launch plan"],
  ["items", "Obligations"],
  ["calendar", "Calendar"],
  ["costs", "Fees"],
  ["whatif", "What if"],
] as const;
type TabId = (typeof TABS)[number][0];

export function Playground() {
  const analytics = useAnalytics();
  const { done, toggle } = useDoneSteps();
  const [now, setNow] = useState("2026-01-01");
  const [data, setData] = useState<Analysis>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TabId>("plan");
  const [filters, setFilters] = useState<ObligationFilters>(NO_FILTERS);

  useEffect(() => setNow(today()), []);

  const submit = async ({ form, asOf, openingDate }: PlanRequest) => {
    setBusy(true);
    try {
      const place = await lookupZip(form.zip.trim());
      if (!place) throw new Error(`Unknown ZIP code "${form.zip}"`);
      const result = analyze(buildProfile({ ...form, zip: form.zip.trim() }, place), {
        asOf: asOf || undefined,
        openingDate: openingDate || undefined,
        isNew: form.isNew,
      });
      const props = { entityType: form.entityType, industry: form.industry, isNew: form.isNew };
      analytics.track("plan_generated", props);
      analytics.log("plan_generated", props);
      setData(result);
      setError(undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      analytics.log("plan_generation_failed", {
        reason: message.startsWith("Unknown ZIP") ? "unknown_zip" : "analysis_error",
      });
      setData(undefined);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

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
        return <PlanView data={data} done={done} onToggle={toggle} />;
      case "items":
        return <ObligationsView data={data} filters={filters} onFilters={setFilters} />;
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
      marginHorizontal="auto"
      paddingHorizontal="4"
      paddingVertical="6"
      gap="5"
    >
      <YStack gap="2" alignItems="flex-start">
        <Chip>Runs in your browser · nothing is sent anywhere</Chip>
        <H1 fontSize="3xl">Compliance rules engine</H1>
        <Paragraph fontSize="base" color="placeholder-color" maxWidth={620}>
          Describe a US business; get the licenses, permits, filings and deadlines that apply, in order.
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
          <ProfileForm today={now} busy={busy} onSubmit={submit} />
        </YStack>
        <YStack flex={1} minWidth={0} aria-live="polite">
          <Panel gap="3">
            {!data && !error && <Muted>Fill in the form and press the button.</Muted>}
            {error && (
              <Text color="amber-700" role="alert">
                {error}
              </Text>
            )}
            {data && (
              <>
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
        <Muted>
          General information, not legal or tax advice. Data is compiled from public sources; see each
          item&apos;s provenance and the{" "}
          <Anchor href={`${SITE_CONFIG.repoUrl}/blob/main/packages/core/COVERAGE.md`}>coverage report</Anchor>
          . <Anchor href={SITE_CONFIG.repoUrl}>Source on GitHub</Anchor>.
        </Muted>
        {analytics.enabled && (
          <Muted>
            Anonymous usage statistics (page views and which tabs are used, never what you enter) are
            collected with PostHog; Do Not Track is respected.
          </Muted>
        )}
      </YStack>
    </YStack>
  );
}
