// Audits every state, county and city entry that is in data/, and every obligation the engine emits for them (federal ones
// included): are the fields right, and are they all there. Usage: node scripts/audit-data.mjs [--json]
//   ERROR  a field is wrong or contradicts another: the build fails.
//   GAP    a field is not filled in yet (a fee or penalty that is "unknown", a county with no check): listed, not a failure.
// Run `npm run build` first: it reads dist/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const core = await import(path.join(root, "dist", "index.js"));
const { lookupZip } = await import(path.join(root, "dist", "zip.js"));

// Counties that are real but that the ZIP table names differently (independent cities, Connecticut's counties, ...), each checked by hand.
const KNOWN_COUNTY_EXCEPTIONS = new Set(
  JSON.parse(fs.readFileSync(path.join(root, "scripts", "audit-county-exceptions.json"), "utf8")),
);

const today = new Date().toISOString().slice(0, 10);
const errors = [];
const gaps = [];
const error = (where, what) => errors.push(`${where}: ${what}`);
const gap = (kind, where) => gaps.push({ kind, where });

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value) =>
  ISO.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const checkDate = (where, field, value, { required = false } = {}) => {
  if (value === undefined) return required && error(where, `${field} is missing`);
  if (!validDate(value)) return error(where, `${field} "${value}" is not a date`);
  if (value > today) error(where, `${field} ${value} is in the future`);
  if (value < "2020-01-01") error(where, `${field} ${value} is implausibly old`);
};
const PLACEHOLDER = /\b(TODO|TBD|FIXME|XXX|lorem ipsum|placeholder|n\/a)\b/i;
const checkText = (where, field, value, { min = 1, sentence = false } = {}) => {
  if (typeof value !== "string" || value.trim().length < min)
    return error(where, `${field} is missing or too short`);
  if (value !== value.trim() || /\s{2}/.test(value)) error(where, `${field} has stray whitespace`);
  if (PLACEHOLDER.test(value)) error(where, `${field} has placeholder text`);
  if (sentence && !/[.!)"”]$/.test(value))
    error(where, `${field} does not end like a sentence: "${value.slice(-20)}"`);
};
const BLOCKED_HOSTS = /(^|\.)(example\.(com|org)|localhost|test)$/i;
const checkUrl = (where, field, value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    return error(where, `${field} "${value}" is not a URL`);
  }
  if (url.protocol !== "https:") error(where, `${field} ${value} is not https`);
  if (BLOCKED_HOSTS.test(url.hostname)) error(where, `${field} ${value} is a placeholder host`);
  if (url.pathname === "/" && !url.search && !url.hash) gap("bare-domain-url", `${where} ${field} ${value}`);
  if (/\s/.test(value)) error(where, `${field} ${value} has whitespace`);
};
const checkUrls = (where, field, value, { required = true } = {}) => {
  if (value === undefined) return required && error(where, `${field} is missing`);
  const list = Array.isArray(value) ? value : [value];
  if (!list.length) return error(where, `${field} is empty`);
  if (new Set(list).size !== list.length) error(where, `${field} lists a URL twice`);
  for (const item of list) checkUrl(where, field, item);
};
const checkMoney = (where, field, value, { max = 1e9 } = {}) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max)
    error(where, `${field} ${value} is not a plausible amount`);
};

// ---- ZIP table: the counties and cities that exist, by state -----------------------------------------------------------------
const zipCounties = new Map();
const zipCities = new Map();
for (let n = 0; n < 100_000; n++) {
  const info = lookupZip(String(n).padStart(5, "0"));
  if (!info) continue;
  (zipCounties.get(info.state) ?? zipCounties.set(info.state, new Set()).get(info.state)).add(info.county);
  (zipCities.get(info.state) ?? zipCities.set(info.state, new Set()).get(info.state)).add(info.city);
}
const normalize = (name) =>
  name
    .toLowerCase()
    .replace(
      /\b(city and county of|city and borough of|city and borough|county|parish|borough|municipality)\b/g,
      "",
    )
    .replace(/\bst\b\.?/g, "saint")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// ---- local items (cities and counties) ------------------------------------------------------------------------------------------
const allIds = new Map();
let localItems = 0;
const stateOfWhere = (where) => /^(?:city|county) ([A-Z]{2}):/.exec(where)?.[1];
function checkFee(where, field, detail) {
  if (!detail || typeof detail !== "object") return error(where, `${field} is missing`);
  if (detail.basis === "unknown") return gap(`${field}-unknown`, where);
  for (const key of ["amount", "min", "max", "rate", "percent", "perUnit"])
    if (detail[key] !== undefined)
      checkMoney(where, `${field}.${key}`, detail[key], {
        max: key === "rate" || key === "percent" ? 100 : 1e9,
      });
  if (detail.min !== undefined && detail.max !== undefined && detail.min > detail.max)
    error(where, `${field}.min is above ${field}.max`);
}
function checkLocalItem(where, item, ownerChecked) {
  localItems++;
  for (const key of [
    "id",
    "title",
    "category",
    "authority",
    "description",
    "url",
    "appliesTo",
    "feeDetail",
    "penalty",
  ])
    if (item[key] === undefined) error(where, `${key} is missing`);
  if (typeof item.id !== "string" || !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(item.id))
    error(where, `id "${item.id}" is not a clean id`);
  else {
    const earlier = allIds.get(item.id);
    if (earlier && earlier.state === stateOfWhere(where)) error(where, `id also used by ${earlier.where}`);
    else if (earlier) gap("local-item-id-also-used-in-another-state", `${where} (and ${earlier.where})`);
    else allIds.set(item.id, { where, state: stateOfWhere(where) });
  }
  checkText(where, "title", item.title, { min: 8 });
  if (/[.]$/.test(item.title ?? "")) error(where, "title ends with a period");
  checkText(where, "authority", item.authority, { min: 3 });
  checkText(where, "description", item.description, { min: 20, sentence: true });
  checkUrls(where, "url", item.url);
  if (!Array.isArray(item.appliesTo) || !item.appliesTo.length) error(where, "appliesTo is empty");
  checkFee(where, "feeDetail", item.feeDetail);
  checkFee(where, "penalty", item.penalty);
  if (item.checkedOn !== undefined) {
    checkDate(where, "checkedOn", item.checkedOn);
    if (ownerChecked && item.checkedOn > ownerChecked)
      error(where, `item checkedOn ${item.checkedOn} is after its entry's ${ownerChecked}`);
  }
  const recurs = item.rrule !== undefined,
    plain = item.frequency !== undefined;
  if (recurs === plain)
    error(where, recurs ? "has both rrule and frequency" : "has neither rrule nor frequency");
  if (item.frequency === "once" && item.rrule) error(where, "a one-time item with a recurrence");
  if (
    !item.deadline &&
    !item.rrule &&
    item.frequency !== "once" &&
    item.frequency !== "ongoing" &&
    item.frequency !== "per_event"
  )
    gap("no-date-rule", where);
}

let cityEntries = 0,
  countyEntries = 0;
const stateFiles = fs
  .readdirSync(path.join(root, "data/states"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, 2));
for (const code of stateFiles) {
  const countyList = read(`data/counties/${code}.json`);
  const cityList = read(`data/cities/${code}.json`);
  const zc = zipCounties.get(code) ?? new Set();
  const zcNorm = new Set([...zc].map(normalize));

  const seenCounty = new Set();
  for (const entry of countyList) {
    countyEntries++;
    const where = `county ${code}:${entry.county}`;
    if (entry.state !== undefined && entry.state !== code) error(where, `state is ${entry.state}`);
    if (seenCounty.has(normalize(entry.county))) error(where, "listed twice");
    seenCounty.add(normalize(entry.county));
    // Connecticut's county data uses its planning regions (counties there have no government); the ZIP table still has the old counties
    if (
      code !== "CT" &&
      !zcNorm.has(normalize(entry.county)) &&
      !KNOWN_COUNTY_EXCEPTIONS.has(`${code}:${entry.county}`)
    )
      error(where, `no ZIP code is in a county of this name in ${code}`);
    checkDate(where, "checkedOn", entry.checkedOn, { required: true });
    const status = entry.status ?? "rules";
    if (status === "rules" && !entry.items?.length) error(where, "status is rules but there are no items");
    if (status !== "rules" && entry.items?.length) error(where, `status ${status} with items`);
    if (status === "none" && !entry.sourceUrl)
      error(where, "status none without the page that backs it (sourceUrl)");
    if (entry.sourceUrl) checkUrls(where, "sourceUrl", entry.sourceUrl);
    if (status === "unverified") gap("county-unverified", where);
    for (const item of entry.items ?? []) checkLocalItem(`${where} / ${item.id}`, item, entry.checkedOn);
  }

  const dataCounties = new Set(countyList.map((entry) => normalize(entry.county)));
  const seenCity = new Map();
  for (const entry of cityList) {
    cityEntries++;
    const where = `city ${code}:${entry.city}`;
    for (const name of [entry.city, ...(entry.aliases ?? [])]) {
      const key = normalize(name);
      if (seenCity.has(key) && seenCity.get(key) !== entry.city)
        error(where, `the name "${name}" is also used by ${seenCity.get(key)}`);
      seenCity.set(key, entry.city);
    }
    if (!entry.counties?.length) error(where, "has no county");
    for (const county of entry.counties ?? [])
      if (
        !zcNorm.has(normalize(county)) &&
        !dataCounties.has(normalize(county)) &&
        !KNOWN_COUNTY_EXCEPTIONS.has(`${code}:${county}`)
      )
        error(where, `county "${county}" is not a county of ${code}`);
    if (new Set((entry.counties ?? []).map(normalize)).size !== (entry.counties ?? []).length)
      error(where, "lists a county twice");
    if (
      !zipCities.get(code)?.has(entry.city) &&
      ![...(zipCities.get(code) ?? [])].some((name) => normalize(name) === normalize(entry.city)) &&
      !(entry.aliases ?? []).some((a) =>
        [...(zipCities.get(code) ?? [])].some((name) => normalize(name) === normalize(a)),
      )
    )
      gap("city-not-in-zip-table", where);
    checkDate(where, "checkedOn", entry.checkedOn, { required: true });
    const status = entry.status ?? "rules";
    if (status === "rules" && !entry.items?.length) error(where, "status is rules but there are no items");
    if (status !== "rules" && entry.items?.length) error(where, `status ${status} with items`);
    if (status === "none" && !entry.sourceUrl)
      error(where, "status none without the page that backs it (sourceUrl)");
    if (entry.sourceUrl) checkUrls(where, "sourceUrl", entry.sourceUrl);
    if (status !== "rules" && !entry.note && !entry.reason)
      error(where, `status ${status} without a note or reason`);
    if (status === "unverified") gap("city-unverified", where);
    for (const item of entry.items ?? []) checkLocalItem(`${where} / ${item.id}`, item, entry.checkedOn);
  }
}

// ---- states -----------------------------------------------------------------------------------------------------------------------
const stateSchema = read("schema/state.schema.json");
const required = stateSchema.required ?? [];
const stateData = Object.fromEntries(stateFiles.map((code) => [code, read(`data/states/${code}.json`)]));
const keyCount = new Map();
for (const state of Object.values(stateData))
  for (const key of Object.keys(state)) keyCount.set(key, (keyCount.get(key) ?? 0) + 1);
for (const [code, state] of Object.entries(stateData)) {
  const where = `state ${code}`;
  for (const key of required) if (state[key] === undefined) error(where, `${key} is missing`);
  for (const [key, count] of keyCount)
    if (count >= stateFiles.length * 0.9 && state[key] === undefined)
      gap("state-field-most-states-have", `${where} ${key}`);
  for (const agency of ["filing", "revenue", "labor"]) {
    checkText(where, `${agency}.name`, state[agency]?.name, { min: 5 });
    checkUrls(where, `${agency}.url`, state[agency]?.url);
  }
  checkDate(where, "verification.checkedOn", state.verification?.checkedOn, { required: true });
  checkUrls(where, "verification.sources", state.verification?.sources);
  // every URL anywhere in the file
  const walk = (value, trail) => {
    if (typeof value === "string" && /^https?:\/\//.test(value)) checkUrl(where, trail, value);
    else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${trail}[${i}]`));
    else if (value && typeof value === "object")
      for (const [k, v] of Object.entries(value)) walk(v, trail ? `${trail}.${k}` : k);
  };
  walk(state, "");
  const walkValues = (value, trail) => {
    // null is deliberate in a state file: "none" for a report, a tax, a field that does not apply (the schema says where)
    if (typeof value === "string" && !value.trim()) error(where, `${trail} is an empty string`);
    else if (typeof value === "string" && PLACEHOLDER.test(value))
      error(where, `${trail} has placeholder text`);
    else if (Array.isArray(value)) value.forEach((v, i) => walkValues(v, `${trail}[${i}]`));
    else if (value && typeof value === "object")
      for (const [k, v] of Object.entries(value)) walkValues(v, trail ? `${trail}.${k}` : k);
  };
  walkValues(state, "");
  if (state.economicNexusUsd !== undefined && state.economicNexusUsd !== null)
    checkMoney(where, "economicNexusUsd", state.economicNexusUsd);
  checkFee(where, "salesTax.penalty", state.salesTax?.penalty);
  for (const [key, penalty] of Object.entries(state.penalties ?? {}))
    checkFee(where, `penalties.${key}`, penalty);
  if (state.unemployment) {
    // newEmployerRate is null where a new employer's rate depends on its industry or on the state's own formula
    for (const key of ["newEmployerRate", "wageBase", "minRate", "maxRate"])
      if (state.unemployment[key] !== undefined && state.unemployment[key] !== null)
        checkMoney(where, `unemployment.${key}`, state.unemployment[key], {
          max: key.endsWith("Rate") ? 20 : 500000,
        });
    if (
      state.unemployment.minRate !== undefined &&
      state.unemployment.maxRate !== undefined &&
      state.unemployment.minRate > state.unemployment.maxRate
    )
      error(where, "unemployment.minRate is above maxRate");
  }
  if (state.salesTax?.rate !== undefined)
    checkMoney(where, "salesTax.rate", state.salesTax.rate, { max: 15 });
  for (const field of state.verification?.unconfirmed ?? [])
    if (state[field] === undefined && !String(field).includes("."))
      error(where, `verification.unconfirmed names "${field}", which is not a field`);
}

// ---- what the engine emits: every jurisdiction, federal included ---------------------------------------------------------------------
const profiles = (place) => [
  { entityType: "llc", ...place },
  {
    entityType: "llc",
    ...place,
    employeeCount: 12,
    sellsTaxableGoods: true,
    homeBased: true,
    foodService: true,
    industry: "restaurant",
  },
  {
    entityType: "c_corp",
    ...place,
    employeeCount: 40,
    annualPayroll: 2_000_000,
    annualRevenue: 9_000_000,
    industry: "construction",
    isFormed: true,
    formationDate: "2022-03-01",
  },
  { entityType: "nonprofit", ...place, employeeCount: 3, hasTaxExemptStatus: true },
];
const emitted = new Map();
let results = 0;
const sampled = [];
for (const code of stateFiles) {
  const cities = read(`data/cities/${code}.json`);
  for (const city of cities) sampled.push({ state: code, city: city.city, county: city.counties?.[0] });
}
const byJurisdiction = { federal: 0, state: 0, county: 0, city: 0 };
const emittedIssues = new Set();
for (const place of sampled) {
  const zip = (() => {
    for (let n = 0; n < 100_000; n++) {
      const i = lookupZip(String(n).padStart(5, "0"));
      if (i && i.state === place.state && i.city === place.city) return String(n).padStart(5, "0");
    }
    return undefined;
  })();
  if (!zip) continue;
  for (const profile of profiles({ zip, city: place.city, county: place.county, state: place.state })) {
    let result;
    try {
      result = core.evaluate(profile, { asOf: today });
    } catch (e) {
      error(`evaluate ${place.state}:${place.city}`, `throws: ${e.message.slice(0, 120)}`);
      continue;
    }
    results++;
    const ids = new Set();
    for (const item of result.items) {
      const key = `${item.jurisdiction}:${item.id}`;
      if (ids.has(item.id)) error(`${place.state}:${place.city}`, `result lists ${item.id} twice`);
      ids.add(item.id);
      if (emitted.has(key)) continue;
      emitted.set(key, item);
      byJurisdiction[item.jurisdiction]++;
      const where = `${item.jurisdiction} item ${item.id} (first seen for ${place.state}:${place.city})`;
      const bad = (what) => emittedIssues.add(`${where}: ${what}`);
      for (const field of [
        "id",
        "title",
        "authority",
        "description",
        "category",
        "frequency",
        "jurisdiction",
      ])
        if (!item[field] || (typeof item[field] === "string" && !item[field].trim()))
          bad(`${field} is missing`);
      if (item.description && !/[.!)"”]$/.test(item.description.trim()))
        bad("description does not end like a sentence");
      if (!item.url?.length) bad("url is missing");
      else
        for (const u of item.url) {
          try {
            const parsed = new URL(u);
            if (parsed.protocol !== "https:") bad(`url ${u} is not https`);
          } catch {
            bad(`url "${u}" is not a URL`);
          }
        }
      // The result leaves `penalty` out when the data says none, not_stated or unknown; the data-level gaps count those.
      if (!item.cost && !item.feeDetail) bad("fee is missing");
      else if ((item.cost ?? item.feeDetail)?.basis === "unknown") gap("emitted-fee-unknown", where);
      if (!item.provenance?.sources?.length) bad("provenance has no sources");
      if (!item.provenance?.confidence) bad("provenance has no confidence");
      if (
        item.jurisdiction === "federal" &&
        item.authority &&
        !/IRS|Treasury|FinCEN|Department|Administration|Commission|Agency|SBA|OSHA|EEOC|DOL|USCIS|FTC|SEC|ATF|TTB|FDA|EPA|DOT|FMCSA|FAA|FCC|USPTO|Copyright|Customs|Postal|Bureau|Service|Board/i.test(
          item.authority,
        )
      )
        bad(`authority "${item.authority}" does not look like a federal body`);
      if (item.jurisdiction === "state" && !item.state) bad("state is missing");
      if (item.nextDue && !validDate(item.nextDue)) bad(`nextDue ${item.nextDue} is not a date`);
    }
  }
}
errors.push(...emittedIssues);

// ---- report -----------------------------------------------------------------------------------------------------------------------
const gapKinds = {};
for (const g of gaps) (gapKinds[g.kind] ??= []).push(g.where);
const summary = {
  states: stateFiles.length,
  counties: countyEntries,
  cities: cityEntries,
  localItems,
  evaluations: results,
  distinctItemsEmitted: emitted.size,
  byJurisdiction,
  errors: errors.length,
  gaps: Object.fromEntries(Object.entries(gapKinds).map(([k, v]) => [k, v.length])),
};
if (process.argv.includes("--json"))
  console.log(JSON.stringify({ summary, errors, gaps: gapKinds }, null, 2));
else {
  console.log(JSON.stringify(summary, null, 1));
  for (const e of errors.slice(0, 60)) console.log("ERROR", e);
  if (errors.length > 60) console.log(`... and ${errors.length - 60} more errors`);
  for (const [kind, list] of Object.entries(gapKinds))
    console.log(`GAP ${kind}: ${list.length} e.g. ${list.slice(0, 3).join(" | ")}`);
}
process.exit(errors.length ? 1 : 0);
