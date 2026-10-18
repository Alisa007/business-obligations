/** The plural form to use for `n` in `locale`: `one` for the singular, `other` for the rest. */
export const plural = (locale: string, n: number, one: string, other: string) =>
  new Intl.PluralRules(locale).select(n) === "one" ? one : other;
