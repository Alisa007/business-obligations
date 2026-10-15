/** Build-time site configuration. Analytics stays off while the key or host is empty. */
export const SITE_CONFIG = {
  /** PostHog project API key ("phc_..."). It is a public, write-only key. */
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",
  /** PostHog ingestion host, e.g. https://us.i.posthog.com. */
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "",
  repoUrl: "https://github.com/Alisa007/compliance-rules-engine",
};
