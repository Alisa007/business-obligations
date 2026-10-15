"use client";

import { useEffect, useState } from "react";
import { Anchor, H1, Paragraph, Tabs, Text, XStack, YStack } from "tamagui";
import { SITE_CONFIG } from "../lib/config";
import { NO_FILTERS, analyze, buildProfile, today, type Analysis, type ObligationFilters } from "../lib/plan";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDoneSteps } from "../hooks/useDoneSteps";
import { ProfileForm, lookupZip, type PlanRequest } from "./ProfileForm";
import { CalendarView, CostsView, ObligationsView, PlanView, WhatIfView } from "./views";
import { Muted, Panel } from "./ui";

const TABS = [
  ["plan", "Launch plan"],
  ["items", "Obligations"],
  ["calendar", "Calendar"],
  ["costs", "Fees"],
  ["whatif", "What would change"],
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
      maxWidth={1100}
      width="100%"
      marginHorizontal="auto"
      paddingHorizontal="4"
      paddingTop="7"
      paddingBottom="10"
      gap="5"
    >
      <YStack gap="1">
        <H1 fontSize="2xl">Compliance rules engine</H1>
        <Paragraph color="placeholder-color" maxWidth={640}>
          Describe a US business; get the licenses, permits, filings and deadlines that apply, in order.
          Everything runs in your browser; nothing you enter is sent anywhere.
        </Paragraph>
      </YStack>

      <XStack gap="5" flexWrap="wrap" alignItems="flex-start">
        <YStack flexBasis={300} flexGrow={1} maxWidth={420} minWidth={260}>
          <ProfileForm today={now} busy={busy} onSubmit={submit} />
        </YStack>
        <YStack flexBasis={480} flexGrow={999} minWidth={0} aria-live="polite">
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
                  <Tabs.List flexWrap="wrap">
                    {TABS.map(([id, label]) => (
                      <Tabs.Tab key={id} value={id}>
                        <Text>{label}</Text>
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                  <Tabs.Content value={tab}>{renderView()}</Tabs.Content>
                </Tabs>
                <Muted>{data.result.disclaimer}</Muted>
              </>
            )}
          </Panel>
        </YStack>
      </XStack>

      <YStack gap="1">
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
