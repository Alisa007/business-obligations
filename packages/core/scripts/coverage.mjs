// Summarises what the bundled data covers, straight from data/. Nothing is written: the JSON files are the report.
//   node scripts/coverage.mjs          counts and a per-state table
//   node scripts/coverage.mjs --json   the same as JSON
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
/** The entries of every per-state file in a data folder; the file name is the state, so entries do not carry it. */
const readPlaces = (dir) =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => read(`${dir}/${f}`).map((e) => ({ state: f.slice(0, 2), ...e })));

export function coverage() {
  const states = readdirSync(join(root, "data/states"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ code: f.slice(0, 2), ...read(`data/states/${f}`) }))
    .sort((a, b) => a.code.localeCompare(b.code));
  const cities = readPlaces("data/cities");
  const counties = readPlaces("data/counties");
  const topCounties = read("data/top-counties.json").counties;
  const count = (list, f) => list.filter(f).length;
  return {
    states: {
      total: states.length,
      withUnconfirmedFields: count(states, (s) => s.verification.unconfirmed.length > 0),
    },
    cities: {
      total: cities.length,
      withRules: count(cities, (c) => c.items.length > 0),
      checkedNone: count(cities, (c) => c.status === "none"),
      unverified: count(cities, (c) => c.status === "unverified"),
      neverIndividuallyChecked: count(cities, (c) => c.items.length > 0 && !c.checkedOn),
    },
    counties: {
      total: counties.length,
      withRules: count(counties, (c) => c.items.length > 0),
      checkedNone: count(counties, (c) => c.status === "none"),
      unverified: count(counties, (c) => c.status === "unverified"),
      ofLargest300: count(topCounties, (t) =>
        counties.some((c) => c.state === t.state && c.county === t.county),
      ),
    },
    byState: states.map((s) => ({
      state: s.code,
      checkedOn: s.verification.checkedOn,
      entityReports: ["llcReport", "corpReport", "lpReport", "llpReport"]
        .filter((k) => s[k])
        .map((k) => k.replace("Report", "")),
      dbaLevelChecked: !s.verification.unconfirmed.includes("dbaFiling"),
      entityTax: s.entityTaxDetail ? "structured" : "text",
      cities: cities.filter((c) => c.state === s.code).map((c) => c.city),
      unconfirmed: s.verification.unconfirmed,
    })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const c = coverage();
  if (process.argv.includes("--json")) console.log(JSON.stringify(c, null, 2));
  else {
    const { byState, ...totals } = c;
    console.log(totals);
    console.table(
      byState.map((s) => ({
        state: s.state,
        checkedOn: s.checkedOn,
        reports: s.entityReports.join(","),
        entityTax: s.entityTax,
        cities: s.cities.length,
        unconfirmed: s.unconfirmed.join(", "),
      })),
    );
  }
}
