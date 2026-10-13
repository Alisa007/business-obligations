// Builds data/zips.json from the GeoNames US postal code dump (CC BY 4.0, https://www.geonames.org).
// Usage: node scripts/build-zip-data.mjs path/to/US.txt
import fs from "node:fs";

const input = process.argv[2];
if (!input) {
  console.error("usage: node scripts/build-zip-data.mjs path/to/US.txt");
  process.exit(1);
}
const places = [];
const counties = [];
const states = [];
const idx = (arr, map, v) => {
  let i = map.get(v);
  if (i === undefined) {
    i = arr.length;
    arr.push(v);
    map.set(v, i);
  }
  return i;
};
const pm = new Map(),
  cm = new Map(),
  sm = new Map();
const zips = {};
for (const line of fs.readFileSync(input, "utf8").split("\n")) {
  const f = line.split("\t");
  if (f.length < 7 || !/^\d{5}$/.test(f[1])) continue;
  const state = f[4];
  if (!state) continue;
  zips[f[1]] = [idx(places, pm, f[2]), idx(counties, cm, f[5] || ""), idx(states, sm, state)];
}
const out = { source: "GeoNames postal codes (CC BY 4.0)", places, counties, states, zips };
fs.writeFileSync(new URL("../data/zips.json", import.meta.url), JSON.stringify(out) + "\n");
console.log(`wrote ${Object.keys(zips).length} ZIP codes`);
