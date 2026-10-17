import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getMessages, type Messages } from "./messages";

/** The interface text and the formatters for one locale. */
export interface I18n {
  /** BCP 47 tag handed to `Intl`. */
  tag: string;
  m: Messages;
  money: (amount: number) => string;
  date: (value?: string) => string;
  relativeDays: (value: string | undefined, from: string) => string;
}

export function createI18n(locale = "en", custom?: Messages): I18n {
  // The data is about US businesses, so a bare language code formats numbers and dates the US way ("$1,250.00").
  const tag = locale === "en" ? "en-US" : locale === "es" ? "es-US" : locale;
  const money = new Intl.NumberFormat(tag, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const day = new Intl.DateTimeFormat(tag, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const relative = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
  return {
    tag,
    m: custom ?? getMessages(locale),
    money: (amount) => money.format(amount),
    date: (value) => (value ? day.format(new Date(`${value}T00:00:00Z`)) : ""),
    relativeDays: (value, from) => {
      if (!value) return "";
      const days = Math.round(
        (Date.parse(`${value}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
      );
      return relative.format(days, "day");
    },
  };
}

const I18nContext = createContext<I18n>(createI18n());
export const useI18n = () => useContext(I18nContext);

export function WithLocale({
  locale,
  messages,
  children,
}: {
  locale?: string;
  messages?: Messages;
  children: ReactNode;
}) {
  const i18n = useMemo(() => createI18n(locale, messages), [locale, messages]);
  return <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>;
}
