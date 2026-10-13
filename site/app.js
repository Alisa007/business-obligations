// Playground logic. Kept free of DOM access so it can be tested in Node.

export const ENTITY_TYPES = [
  ["llc", "LLC"],
  ["sole_proprietorship", "Sole proprietorship"],
  ["s_corp", "S corporation"],
  ["c_corp", "C corporation"],
  ["partnership", "General partnership"],
  ["lp", "Limited partnership"],
  ["llp", "Limited liability partnership"],
  ["pllc", "Professional LLC"],
  ["pc", "Professional corporation"],
  ["benefit_corp", "Benefit corporation"],
  ["nonprofit", "Nonprofit"],
];

export const INDUSTRIES = [
  ["general", "General / other"],
  ["retail", "Retail"],
  ["restaurant", "Restaurant / food service"],
  ["construction", "Construction"],
  ["healthcare", "Healthcare"],
  ["real_estate", "Real estate"],
  ["professional_services", "Professional services"],
  ["childcare", "Childcare"],
];

export const PROFESSIONS = [
  ["attorney", "Attorney"],
  ["cpa", "CPA"],
  ["physician", "Physician"],
  ["architect", "Architect"],
  ["engineer", "Engineer"],
  ["other", "Other"],
];

const num = (v) => (v === "" || v === undefined || v === null ? undefined : Number(v));
const clean = (o) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && !Number.isNaN(v)));

/** Turns form values into a BusinessProfile; `place` is the result of a ZIP lookup. */
export function buildProfile(form, place) {
  const needsProfession =
    ["pllc", "pc", "llp"].includes(form.entityType) || form.industry === "professional_services";
  return clean({
    entityType: form.entityType,
    zip: form.zip,
    city: place?.city,
    county: place?.county,
    state: place?.state,
    industry: form.industry === "general" ? undefined : form.industry,
    profession: needsProfession ? form.profession || "other" : undefined,
    employeeCount: num(form.employees),
    annualPayroll: num(form.payroll),
    annualRevenue: num(form.revenue),
    ownerCount: num(form.owners),
    sellsTaxableGoods: form.sellsGoods ? true : undefined,
    homeBased: form.homeBased ? true : undefined,
    usesTradeName: form.tradeName ? true : undefined,
    formationDate: form.isNew ? undefined : form.formationDate || undefined,
  });
}

const today = () => new Date().toISOString().slice(0, 10);

/** Runs every analysis the playground shows. Throws the library's errors for the UI to display. */
export function analyze(lib, profile, options = {}) {
  const asOf = options.asOf || today();
  const result = lib.evaluate({ ...profile, isFormed: !options.isNew }, { asOf });
  const plan = lib.planLaunch(profile, { startDate: asOf, openingDate: options.openingDate || undefined });
  const calendar = lib.buildCalendar(profile, { from: asOf, to: addYears(asOf, 1) });
  return {
    result,
    plan,
    events: calendar.events,
    ics: lib.toICS(calendar.events, { calendarName: "Compliance deadlines" }),
    costs: lib.estimateCosts(result.items, {
      profile: result.profile,
      ownerCount: result.profile.ownerCount,
    }),
    analysis: lib.analyzeInputs(profile, { asOf }),
  };
}

function addYears(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

/** Formats a US-dollar amount in the viewer's locale, e.g. "$1,272" or "1 272 $US". */
export const money = (n, locale) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(n));

export const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

/**
 * Formats an ISO date (YYYY-MM-DD) in the viewer's locale, e.g. "Jan 31, 2027" or "31 janv. 2027".
 * Dates are calendar dates, so they are formatted in UTC to avoid shifting a day with the time zone.
 */
export function formatDate(iso, locale) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(iso ?? "");
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(d);
}

/** Returns the URL when it is a plain http(s) link, otherwise undefined. */
export function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : undefined;
  } catch {
    return undefined;
  }
}

/** An external link (escaped), or just the escaped text when there is no usable URL. */
export function link(url, text) {
  const href = safeUrl(url);
  return href
    ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`
    : escapeHtml(text);
}

/** Short label for a source URL: its host without "www.". */
export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
