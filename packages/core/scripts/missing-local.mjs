// Lists cities and counties that appear in the ZIP data but have no seed in data/cities or data/counties,
// biggest first (ZIP count is the population proxy). Used by the scheduled coverage bot; also handy by hand:
//   node scripts/missing-local.mjs [--cities 5] [--counties 5] [--state TX] [--json]
// Candidates the bot decided are not real jurisdictions (postal-only place names) go in scripts/local-skip.json.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const jsonIn = (dir) =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => read(`${dir}/${f}`));

/** Case, punctuation and "St."/"Saint" differences should not make a seeded place look missing. */
export const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\bst\.?(?=\s)/g, "saint")
    .replace(/\bft\.?(?=\s)/g, "fort")
    .replace(/\bmt\.?(?=\s)/g, "mount")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function findMissing({ cities = 5, counties = 5, state } = {}) {
  const zips = read("data/zips.json");
  const skip = read("scripts/local-skip.json");
  const known = (list, key, skipList) => {
    const set = new Set();
    for (const e of [...list, ...skipList]) {
      for (const n of [e[key], ...(e.aliases ?? [])]) set.add(`${e.state}:${norm(n)}`);
    }
    return set;
  };
  const seededCities = known(jsonIn("data/cities"), "city", skip.cities);
  const seededCounties = known(jsonIn("data/counties"), "county", skip.counties);

  const count = (idx, names, seeded) => {
    const tally = new Map();
    for (const entry of Object.values(zips.zips)) {
      const st = zips.states[entry[2]];
      const name = names[entry[idx]];
      if (!name || (state && st !== state)) continue;
      const key = `${st}:${norm(name)}`;
      if (seeded.has(key)) continue;
      const row = tally.get(key) ?? { state: st, name, zips: 0 };
      row.zips += 1;
      tally.set(key, row);
    }
    return [...tally.values()].sort(
      (a, b) => b.zips - a.zips || a.state.localeCompare(b.state) || a.name.localeCompare(b.name),
    );
  };
  return {
    cities: count(0, zips.places, seededCities)
      .slice(0, cities)
      .map(({ state: st, name, zips: n }) => ({ state: st, city: name, zips: n })),
    counties: count(1, zips.counties, seededCounties)
      .slice(0, counties)
      .map(({ state: st, name, zips: n }) => ({ state: st, county: name, zips: n })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : fallback;
  };
  const out = findMissing({
    cities: Number(arg("cities", 5)),
    counties: Number(arg("counties", 5)),
    state: arg("state"),
  });
  if (process.argv.includes("--json")) console.log(JSON.stringify(out, null, 2));
  else {
    console.log("Cities without a seed (by ZIP count):");
    for (const c of out.cities) console.log(`  ${c.state}  ${c.city}  (${c.zips} ZIPs)`);
    console.log("Counties without a seed (by ZIP count):");
    for (const c of out.counties) console.log(`  ${c.state}  ${c.county}  (${c.zips} ZIPs)`);
  }
}
