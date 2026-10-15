/** Formats a US-dollar amount in the viewer's locale, e.g. "$1,272". */
export const money = (n: number | string, locale?: string): string =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(n));

/**
 * Formats an ISO date (YYYY-MM-DD) in the viewer's locale, e.g. "Jan 31, 2027". Dates are calendar dates, so they
 * are formatted in UTC to avoid shifting a day with the time zone. Anything else passes through.
 */
export function formatDate(iso: string | undefined, locale?: string): string {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(iso ?? "");
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(d);
}

/** "in 18 days", "tomorrow", "3 days ago" relative to `from`, in the viewer's locale. */
export function relativeDays(iso: string | undefined, from: string | undefined, locale?: string): string {
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDate.test(iso ?? "") || !isoDate.test(from ?? "")) return "";
  const days = Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day");
}

/** Returns the URL when it is a plain http(s) link, otherwise undefined. */
export function safeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : undefined;
  } catch {
    return undefined;
  }
}

/** Short label for a source URL: its host without "www.". */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const FREQUENCY: Record<string, string> = {
  once: "One-time",
  annual: "Annual",
  biennial: "Every 2 years",
  every_five_years: "Every 5 years",
  quarterly: "Quarterly",
  monthly: "Monthly",
  per_event: "Per event",
  ongoing: "Ongoing",
};

export const frequencyLabel = (f: string): string => FREQUENCY[f] ?? f;

export const CONFIDENCE: Record<string, string> = {
  checked: "Checked against official pages",
  compiled: "Compiled from public sources",
  unconfirmed: "Contains an unconfirmed value",
};
