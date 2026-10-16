// Minimal usage analytics (PostHog). What is sent: page views, a few coarse events, a few log lines and
// unhandled errors. When a plan is generated, the form values are sent with it (ZIP, entity type, headcount,
// payroll, ...); editing a field reports only its name. Never sent: cookies, session recordings, autocapture.

export type EventName = "plan_generated" | "tab_viewed" | "ics_downloaded" | "field_used";
export type LogName = "plan_generated" | "ics_downloaded" | "plan_generation_failed";
type Props = Record<string, unknown>;
type Primitive = string | number | boolean;

/** Event names and the only properties each may carry. Anything else is dropped before sending. */
const ALLOWED: Record<EventName, readonly string[]> = {
  plan_generated: [
    "zip",
    "entityType",
    "industry",
    "profession",
    "employees",
    "owners",
    "payroll",
    "revenue",
    "sellsGoods",
    "homeBased",
    "tradeName",
    "isNew",
    "formationDate",
    "asOf",
    "openingDate",
  ],
  tab_viewed: ["tab"],
  ics_downloaded: ["events"],
  field_used: ["field"],
};

const LOGS: Record<LogName, { level: "info" | "warn"; message: string; attributes: readonly string[] }> = {
  plan_generated: {
    level: "info",
    message: "Compliance plan generated",
    attributes: ["entityType", "industry", "isNew"],
  },
  ics_downloaded: { level: "info", message: "Calendar downloaded", attributes: ["events"] },
  plan_generation_failed: {
    level: "warn",
    message: "Compliance plan generation failed",
    attributes: ["reason"],
  },
};

/**
 * The playground keeps the form in the URL (shareable links), so page URLs must not carry the query string to
 * PostHog: the form values are sent only when a plan is generated, as disclosed on the site.
 */
export function stripQuery(url: string): string {
  const i = url.search(/[?#]/);
  return i === -1 ? url : url.slice(0, i);
}

/** Keeps only the listed properties, and only primitive values. */
function pick(allowed: readonly string[], props: Props = {}): Record<string, Primitive> {
  const out: Record<string, Primitive> = {};
  for (const key of allowed) {
    const v = props[key];
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[key] = v;
  }
  return out;
}

/** The properties an event may carry, or undefined when the event name is not allowed. */
export function sanitize(name: string, props: Props = {}): Record<string, Primitive> | undefined {
  const allowed = (ALLOWED as Record<string, readonly string[]>)[name];
  return allowed ? pick(allowed, props) : undefined;
}

/** The subset of the posthog-js client this module uses. */
export interface PostHogClient {
  init(key: string, options: Record<string, unknown>): void;
  capture(name: string, props?: Record<string, unknown>): void;
  logger?: Partial<Record<"info" | "warn", (message: string, attributes?: Record<string, unknown>) => void>>;
}

interface AnalyticsOptions {
  key?: string;
  host?: string;
  hostname?: string;
  doNotTrack?: boolean;
  production?: boolean;
  /** Replaces the dynamic import of posthog-js (tests). */
  load?: () => Promise<PostHogClient>;
}

export interface Analytics {
  enabled: boolean;
  track(name: EventName, props?: Props): void;
  log(name: LogName, props?: Props): void;
}

const loadPostHog = async (): Promise<PostHogClient> => {
  const m = await import("posthog-js");
  return (m.default ?? m.posthog) as unknown as PostHogClient;
};

/**
 * Creates the tracker. It does nothing unless a key and host are configured, the page is not served from
 * localhost and the browser has not asked not to be tracked.
 */
export function createAnalytics({
  key,
  host,
  hostname,
  doNotTrack,
  production,
  load = loadPostHog,
}: AnalyticsOptions = {}): Analytics {
  const local = ["localhost", "127.0.0.1", "[::1]", ""].includes(hostname ?? "");
  const enabled = Boolean(key) && Boolean(host) && !local && !doNotTrack;
  let client: PostHogClient | undefined;
  const queue: Array<() => void> = [];
  const run = (send: () => void) => (client ? send() : queue.push(send));

  if (enabled) {
    load()
      .then((posthog) => {
        posthog.init(key!, {
          api_host: host,
          defaults: "2026-05-30",
          autocapture: false,
          capture_pageview: true,
          before_send: (event: { properties?: Record<string, unknown> } | null) => {
            const props = event?.properties;
            if (props)
              for (const k of ["$current_url", "$referrer", "$initial_referrer"])
                if (typeof props[k] === "string") props[k] = stripQuery(props[k] as string);
            return event;
          },
          disable_session_recording: true,
          persistence: "memory", // no cookies or local storage, so no consent banner is needed
          person_profiles: "identified_only",
          respect_dnt: true,
          ip: false,
          logs: {
            serviceName: "business-obligations-site",
            environment: production ? "production" : "development",
          },
          capture_exceptions: {
            capture_unhandled_errors: true,
            capture_unhandled_rejections: true,
            capture_console_errors: false,
          },
        });
        client = posthog;
        for (const send of queue.splice(0)) send();
      })
      .catch(() => {
        /* analytics must never break the page */
      });
  }

  return {
    enabled,
    track(name, props) {
      const clean = enabled ? sanitize(name, props) : undefined;
      if (clean) run(() => client!.capture(name, clean));
    },
    log(name, props) {
      const definition = enabled ? LOGS[name] : undefined;
      if (!definition) return;
      const attributes = pick(definition.attributes, props);
      run(() => client!.logger?.[definition.level]?.(definition.message, attributes));
    },
  };
}
