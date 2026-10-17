// Collects the English text the engine can show, so a translation catalog can be checked against it.
// Run after `npm run build`:  node scripts/i18n-corpus.mjs [out.json]
// Output: { "<english text>": { field, ruleId, example } }
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate, planLaunch, PROFILE_ENUMS, STATE_CODES } from "../dist/index.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const readSeeds = (dir, code) => {
  const file = path.join(root, "data", dir, `${code}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
};

const corpus = new Map();
const add = (text, field, ruleId, example) => {
  if (typeof text !== "string" || !text.trim() || corpus.has(text)) return;
  corpus.set(text, { field, ruleId, example });
};

const collect = (result) => {
  add(result.disclaimer, "disclaimer", "", "");
  for (const it of result.items) {
    for (const f of ["title", "description", "reason", "authority", "deadline", "renewal", "processingTime"])
      add(it[f], f, it.ruleId, it.id);
    for (const e of it.exemptions ?? []) add(e, "exemption", it.ruleId, it.id);
    add(it.cost?.note, "costNote", it.ruleId, it.id);
    add(it.penalty?.note, "penaltyNote", it.ruleId, it.id);
    for (const c of it.upcomingChanges ?? []) add(c.summary, "changeSummary", it.ruleId, it.id);
  }
};

const base = { zip: "10001", employeeCount: 4, sellsTaxableGoods: true, usesTradeName: true };
let runs = 0;
const run = (profile) => {
  try {
    collect(evaluate({ ...base, ...profile }));
    runs++;
  } catch {
    /* combination the engine rejects */
  }
};

for (const state of STATE_CODES) {
  for (const entityType of PROFILE_ENUMS.entityType)
    for (const industry of PROFILE_ENUMS.industry)
      for (const employeeCount of [0, 4])
        for (const isFormed of [false, true]) run({ state, entityType, industry, employeeCount, isFormed, city: "X", county: "Y" });
  const seeds = [
    ...readSeeds("cities", state).map((c) => ({ city: c.city, county: c.counties?.[0] ?? "" })),
    ...readSeeds("counties", state).map((c) => ({ city: "", county: c.county })),
  ];
  for (const { city, county } of seeds)
    for (const industry of ["general", "restaurant", "retail", "construction", "healthcare", "alcohol", "childcare"])
      for (const entityType of ["llc", "c_corp", "sole_proprietorship"])
        run({ state, city, county, entityType, industry, isFormed: true });
}
// Launch plan wording (phase titles and descriptions).
const plan = planLaunch({ ...base, state: "NY", entityType: "llc", industry: "restaurant", city: "New York", county: "New York" });
for (const ph of plan.phases) {
  add(ph.title, "phaseTitle", ph.id, "");
  add(ph.description, "phaseDescription", ph.id, "");
}

const out = Object.fromEntries(corpus);
const file = process.argv[2];
if (file) fs.writeFileSync(file, JSON.stringify(out, null, 1));
console.error(`${runs} profiles, ${corpus.size} distinct texts`);
