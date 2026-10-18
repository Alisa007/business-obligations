/** The BCP 47 tag handed to `Intl`. The data is about US businesses, so a bare language code formats the US way. */
export const localeTag = (locale = "en"): string =>
  locale === "en" ? "en-US" : locale === "es" ? "es-US" : locale;

const cache = new Map<string, unknown>();
/** One `Intl` formatter per kind and tag: making one is far slower than using it. */
function formatter<T>(kind: string, tag: string, make: () => T): T {
  const key = `${kind}:${tag}`;
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
}

/** A US-dollar amount: whole dollars without cents ("$1,250"), otherwise with both ("$4.50"). */
export function formatMoney(amount: number, locale?: string): string {
  const tag = localeTag(locale);
  const cents = Number.isInteger(amount) ? 0 : 2;
  return formatter(
    `money${cents}`,
    tag,
    () =>
      new Intl.NumberFormat(tag, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: cents,
        maximumFractionDigits: cents,
      }),
  ).format(amount);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * An ISO date (`YYYY-MM-DD`) as a calendar date, e.g. "Jan 31, 2027". Dates are calendar dates, so they are formatted
 * in UTC to avoid shifting a day with the time zone. Anything else ("April 15") passes through as it is.
 */
export function formatDate(value: string | undefined, locale?: string): string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return value ?? "";
  const tag = localeTag(locale);
  const day = formatter(
    "date",
    tag,
    () => new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
  );
  return day.format(new Date(`${value}T00:00:00Z`));
}

/** "in 18 days", "tomorrow", "3 days ago": the distance of an ISO date from another (`from`). */
export function relativeDays(value: string | undefined, from: string | undefined, locale?: string): string {
  if (!ISO_DATE.test(value ?? "") || !ISO_DATE.test(from ?? "")) return "";
  const tag = localeTag(locale);
  const days = Math.round((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
  return formatter("relative", tag, () => new Intl.RelativeTimeFormat(tag, { numeric: "auto" })).format(
    days,
    "day",
  );
}

/** Today's date as `YYYY-MM-DD` in the visitor's time zone; `toISOString()` is UTC and is already tomorrow on a US evening. */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
