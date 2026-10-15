"use client";

import { useEffect, useState } from "react";
import { createAnalytics, type Analytics } from "../lib/analytics";
import { SITE_CONFIG } from "../lib/config";

const off: Analytics = { enabled: false, track: () => {}, log: () => {} };

/** The anonymous usage tracker. Created after mount, because it needs the browser's host name and settings. */
export function useAnalytics(): Analytics {
  const [analytics, setAnalytics] = useState<Analytics>(off);
  useEffect(() => {
    setAnalytics(
      createAnalytics({
        key: SITE_CONFIG.posthogKey,
        host: SITE_CONFIG.posthogHost,
        hostname: window.location.hostname,
        doNotTrack: navigator.doNotTrack === "1",
        production: process.env.NODE_ENV === "production",
      }),
    );
  }, []);
  return analytics;
}
