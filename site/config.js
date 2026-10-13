// Site configuration. Analytics stays off while `posthogKey` is empty.
export const SITE_CONFIG = {
  /** PostHog project API key ("phc_..."). It is a public write-only key, safe to commit. */
  posthogKey: "",
  /** PostHog ingestion host: https://us.i.posthog.com (US cloud) or https://eu.i.posthog.com (EU cloud). */
  posthogHost: "https://us.i.posthog.com",
};
