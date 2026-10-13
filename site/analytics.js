// Anonymous, minimal usage analytics (PostHog). What is sent: page views and a few coarse events. What is never
// sent: anything typed into the form (ZIP, city, headcount, payroll, ...), cookies, session recordings, autocapture.

/** Event names and the only properties each may carry. Anything else is dropped before sending. */
export const ALLOWED = {
  plan_generated: ["entityType", "industry", "isNew"],
  tab_viewed: ["tab"],
  ics_downloaded: ["events"],
};

const POSTHOG_MODULE = "https://cdn.jsdelivr.net/npm/posthog-js@1.200.0/dist/module.js";

/** Keeps only allowed properties with primitive values. */
export function sanitize(name, props = {}) {
  const allowed = ALLOWED[name];
  if (!allowed) return undefined;
  const out = {};
  for (const key of allowed) {
    const v = props[key];
    if (["string", "number", "boolean"].includes(typeof v)) out[key] = v;
  }
  return out;
}

/**
 * Creates the tracker. It does nothing unless a key is configured, the page is not served from localhost and the
 * browser has not asked not to be tracked. `load` is injectable for tests.
 */
export function createAnalytics({ key, host, hostname, doNotTrack, load } = {}) {
  const local = ["localhost", "127.0.0.1", "[::1]", ""].includes(hostname ?? "");
  const enabled = Boolean(key) && !local && !doNotTrack;
  let client;
  const queue = [];

  if (enabled) {
    (load ?? (() => import(/* @vite-ignore */ POSTHOG_MODULE).then((m) => m.default ?? m.posthog)))()
      .then((posthog) => {
        posthog.init(key, {
          api_host: host,
          autocapture: false,
          capture_pageview: true,
          disable_session_recording: true,
          persistence: "memory", // no cookies or local storage, so no consent banner is needed
          person_profiles: "identified_only",
          respect_dnt: true,
          ip: false,
        });
        client = posthog;
        for (const [name, props] of queue.splice(0)) posthog.capture(name, props);
      })
      .catch(() => {
        /* analytics must never break the page */
      });
  }

  return {
    enabled,
    track(name, props) {
      const clean = enabled ? sanitize(name, props) : undefined;
      if (!clean) return;
      if (client) client.capture(name, clean);
      else queue.push([name, clean]);
    },
  };
}
