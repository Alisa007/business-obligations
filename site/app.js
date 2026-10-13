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

export const money = (n) => `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
