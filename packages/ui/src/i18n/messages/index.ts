import { en } from "./en";
import { es } from "./es";
import type { Locale, Messages } from "./types";

export type { Locale, Messages } from "./types";

/** The bundled message tables. */
export const messages: Record<Locale, Messages> = { en, es };

/** The messages for a locale code such as "es" or "es-MX"; English when the language has no table. */
export function getMessages(locale?: string): Messages {
  const language = locale?.toLowerCase().split("-")[0];
  return language === "es" ? es : en;
}
