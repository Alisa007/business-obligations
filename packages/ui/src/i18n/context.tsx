import { createContext, useContext, useMemo, type ReactNode } from "react";
import { formatDate, formatMoney, localeTag, relativeDays } from "./format";
import { getMessages, type Messages } from "./messages";

/** The interface text and the formatters for one locale. */
export interface I18n {
  /** BCP 47 tag handed to `Intl`. */
  tag: string;
  m: Messages;
  money: (amount: number) => string;
  date: (value?: string) => string;
  relativeDays: (value: string | undefined, from: string | undefined) => string;
}

export function createI18n(locale = "en", custom?: Messages): I18n {
  return {
    tag: localeTag(locale),
    m: custom ?? getMessages(locale),
    money: (amount) => formatMoney(amount, locale),
    date: (value) => formatDate(value, locale),
    relativeDays: (value, from) => relativeDays(value, from, locale),
  };
}

const I18nContext = /* @__PURE__ */ createContext<I18n>(/* @__PURE__ */ createI18n());
export const useI18n = () => useContext(I18nContext);

/**
 * Sets the language of everything inside: `locale` picks a bundled table, `messages` replaces it. With neither, the
 * language of the enclosing `WithLocale` (or English) stays, so a field inside a form speaks the form's language.
 */
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
  if (locale === undefined && messages === undefined) return <>{children}</>;
  return <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>;
}
