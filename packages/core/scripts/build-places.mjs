// Builds src/data/places.json: Census FIPS codes (and incorporated status) for the counties and cities in data/.
// Usage: node scripts/build-places.mjs <dir containing national_county2020.txt and national_place2020.txt as county.txt, place.txt>
// Source: U.S. Census Bureau, 2020 FIPS codes (https://www.census.gov/library/reference/code-lists/ansi.html).
// Only unambiguous matches are written; a name that matches several Census entries is left out rather than guessed.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const censusDir = process.argv[2];
if (!censusDir) throw new Error("Pass the directory holding county.txt and place.txt");
const root = (p) => fileURLToPath(new URL(p, import.meta.url));
const rows = (f) =>
  readFileSync(`${censusDir}/${f}`, "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((l) => l.split("|"));

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const strip = (s) =>
  s
    .replace(/\s*\(balance\)$/i, "")
    .replace(
      /\s+(county|parish|borough|census area|municipality|city and borough|city|town|village|cdp|urbana|consolidated government|unified government|metropolitan government|metro government)(\s*\(.*\))?$/i,
      "",
    )
    .replace(/\s+(county|parish|borough|city|town|village|cdp)$/i, "");

const out = {};
const counties = new Map(); // "ST|name" -> [{fips, full}]
for (const [st, sfp, cfp, , name] of rows("county.txt")) {
  const k = `${st}|${slug(strip(name))}`;
  (counties.get(k) ?? counties.set(k, []).get(k)).push({ fips: sfp + cfp, full: name });
}
const places = new Map();
for (const [st, sfp, pfp, , name, type, cls, func, cos] of rows("place.txt")) {
  const k = `${st}|${slug(strip(name))}`;
  // Census class codes: C* incorporated places (including consolidated "balance" entities), U* and M* census places.
  const incorporated = cls.startsWith("C");
  (places.get(k) ?? places.set(k, []).get(k)).push({
    fips: sfp + pfp,
    incorporated,
    cos: cos ?? "",
    full: name,
  });
}

let c = 0,
  p = 0,
  skipped = [];
for (const f of readdirSync(root("../data/counties/"))) {
  const st = f.replace(".json", "");
  for (const e of JSON.parse(readFileSync(root(`../data/counties/${f}`), "utf8"))) {
    // "Baltimore (city)" and "City of Richmond" are independent cities; "Baltimore" is the county of that name.
    const wantsCity = /^city of\b|\(city\)$|\bcity$/i.test(e.county.trim());
    const plain = e.county.replace(/^city of\s+/i, "").replace(/\s*\(city\)$/i, "");
    const m = (counties.get(`${st}|${slug(strip(plain))}`) ?? []).filter(
      (x) => /\scity$/i.test(x.full) === wantsCity,
    );
    const hit = m.length === 1 ? m[0] : undefined;
    if (hit) {
      out[`${st}/county/${slug(strip(e.county))}`] = { fips: hit.fips };
      c++;
    } else skipped.push(`${st} county ${e.county}`);
  }
}
// Consolidated governments and renamed places whose Census name differs from the common one.
const PLACE_ALIASES = {
  "CA|ventura": "San Buenaventura (Ventura) city",
  "GA|athens": "Athens-Clarke County unified government (balance)",
  "GA|augusta": "Augusta-Richmond County consolidated government (balance)",
  "KY|lexington": "Lexington-Fayette urban county",
  "MN|saint-paul": "St. Paul city",
  "TN|nashville": "Nashville-Davidson metropolitan government (balance)",
};
const aliasRows = rows("place.txt");
for (const f of readdirSync(root("../data/cities/"))) {
  const st = f.replace(".json", "");
  for (const e of JSON.parse(readFileSync(root(`../data/cities/${f}`), "utf8"))) {
    const alias = PLACE_ALIASES[`${st}|${slug(e.city)}`];
    let m = alias
      ? aliasRows
          .filter((r) => r[0] === st && r[4] === alias)
          .map((r) => ({
            fips: r[1] + r[2],
            incorporated: r[6].startsWith("C"),
            cos: r[8] ?? "",
            full: r[4],
          }))
      : (places.get(`${st}|${slug(strip(e.city))}`) ?? []);
    if (m.length > 1) {
      const inc = m.filter((x) => x.incorporated);
      if (inc.length) m = inc;
    }
    if (m.length > 1 && e.counties?.length) {
      const near = m.filter((x) =>
        e.counties.some((co) => x.cos.toLowerCase().includes(strip(co).toLowerCase())),
      );
      if (near.length) m = near;
    }
    if (m.length === 1) {
      out[`${st}/city/${slug(e.city)}`] = { fips: m[0].fips, incorporated: m[0].incorporated };
      p++;
    } else skipped.push(`${st} city ${e.city} (${m.length} matches)`);
  }
}
// Compact form: { TX: { c: { travis: "453" }, p: { austin: "05000i" } } }. Counties store the 3-digit county code;
// places store the 5-digit place code plus "i" (incorporated) or "u" (not). The state code is added on read.
const grouped = {};
for (const [key, v] of Object.entries(out).sort()) {
  const [st, kind, name] = key.split("/");
  const g = (grouped[st] ??= { c: {}, p: {} });
  if (kind === "county") g.c[name] = v.fips.slice(2);
  else g.p[name] = v.fips.slice(2) + (v.incorporated ? "i" : "u");
}
writeFileSync(root("../src/data/places.json"), JSON.stringify(grouped) + "\n");
console.log(`counties ${c}, cities ${p}, skipped ${skipped.length}`);
if (skipped.length) console.log(skipped.slice(0, 40).join("\n"));
