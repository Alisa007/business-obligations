import fs from "node:fs";
import path from "node:path";
import { STATE_CODES, evaluate, planLaunch, type BusinessProfile } from "../../src";
import {
  ALCOHOL_ACTIVITIES,
  CANNABIS_ACTIVITIES,
  ENTITY_TYPES,
  INDUSTRIES,
  PROFESSIONS,
} from "../../src/enums";

export interface CorpusEntry {
  field: string;
  ruleId: string;
  example: string;
}

/**
 * Collects the English text the engine can show: the output of the rules across states, entity types, industries and
 * scenario profiles that switch on every rule, the launch-plan wording, and every text field of the bundled data files.
 * A translation catalog is complete when it translates all of it.
 */
export function collectCorpus(root = path.join(import.meta.dirname, "..", ".."), onlyRules = false) {
  const corpus = new Map<string, CorpusEntry>();
  const add = (text: unknown, field: string, ruleId: string, example: string) => {
    if (typeof text !== "string" || !text.trim() || corpus.has(text)) return;
    corpus.set(text, { field, ruleId, example });
  };

  const readSeeds = (
    dir: string,
    code: string,
  ): Array<{ city?: string; counties?: string[]; county?: string }> => {
    const file = path.join(root, "data", dir, `${code}.json`);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  };

  let runs = 0;
  const run = (profile: Record<string, unknown>) => {
    try {
      const result = evaluate({
        zip: "10001",
        employeeCount: 4,
        sellsTaxableGoods: true,
        usesTradeName: true,
        ...profile,
      } as BusinessProfile);
      add(result.disclaimer, "disclaimer", "", "");
      for (const it of result.items) {
        for (const f of [
          "title",
          "description",
          "reason",
          "authority",
          "deadline",
          "renewal",
          "processingTime",
        ] as const)
          add(it[f], f, it.ruleId, it.id);
        for (const e of it.exemptions ?? []) add(e, "exemption", it.ruleId, it.id);
        for (const w of it.appliesWhen ?? []) add(w.description, "appliesWhen", it.ruleId, it.id);
        add(it.cost?.note, "costNote", it.ruleId, it.id);
        add(it.penalty?.note, "penaltyNote", it.ruleId, it.id);
        for (const c of it.upcomingChanges ?? []) add(c.summary, "changeSummary", it.ruleId, it.id);
      }
      runs++;
    } catch {
      /* a combination the engine rejects */
    }
  };

  for (const state of STATE_CODES) {
    for (const entityType of ENTITY_TYPES)
      for (const industry of INDUSTRIES)
        for (const employeeCount of [0, 4])
          for (const isFormed of [false, true])
            run({ state, entityType, industry, employeeCount, isFormed, city: "X", county: "Y" });
    const seeds = [
      ...readSeeds("cities", state).map((c) => ({ city: c.city ?? "", county: c.counties?.[0] ?? "" })),
      ...readSeeds("counties", state).map((c) => ({ city: "", county: c.county ?? "" })),
    ];
    for (const { city, county } of seeds)
      for (const industry of [
        "general",
        "restaurant",
        "retail",
        "construction",
        "healthcare",
        "alcohol",
        "childcare",
      ])
        for (const entityType of ["llc", "c_corp", "sole_proprietorship"])
          run({ state, city, county, entityType, industry, isFormed: true });
  }

  // Scenario profiles that switch on the rules the plain profiles never reach.
  const naicsCodes = new Set<string>();
  const collectNaics = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(collectNaics);
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (key === "naics" && Array.isArray(value))
        value.filter((v) => typeof v === "string").forEach((v) => naicsCodes.add(v));
      else collectNaics(value);
    }
  };
  const industriesFile = path.join(root, "data", "industries", "NY.json");
  if (fs.existsSync(industriesFile)) collectNaics(JSON.parse(fs.readFileSync(industriesFile, "utf8")));
  const rich = {
    isFormed: true,
    employeeCount: 300,
    fullTimeEmployeeCount: 120,
    annualPayroll: 9_000_000,
    priorYearPayrollTaxLiability: 60_000,
    largestContractorPaymentUsd: 5000,
    annualNetIncome: 400_000,
    annualRevenue: 5_000_000,
    hasSignage: true,
    floorAreaSqFt: 3000,
    activities: ["lodging", "home_improvement"],
  };
  const scenarios: Array<Record<string, unknown>> = [
    { ...rich },
    { ...rich, homeBased: true, employeeCount: 12 },
    { ...rich, employeeCount: 8, fullTimeEmployeeCount: 8 },
    { ...rich, industry: "construction", projectValueUsd: 500_000, disturbedAcres: 2 },
    {
      ...rich,
      industry: "transportation",
      commercialVehicles: { interstate: true, grossWeightLbs: 40_000, carriesHazmat: true },
    },
    { ...rich, industry: "transportation", commercialVehicles: { interstate: false, passengerCapacity: 20 } },
    { ...rich, industry: "healthcare", entityType: "pllc", profession: "physician" },
    ...PROFESSIONS.flatMap((profession) =>
      ["pllc", "pc", "llp"].map((entityType) => ({
        ...rich,
        industry: "professional_services",
        entityType,
        profession,
      })),
    ),
    ...ALCOHOL_ACTIVITIES.map((alcoholActivity) => ({ ...rich, industry: "alcohol", alcoholActivity })),
    ...CANNABIS_ACTIVITIES.map((cannabisActivity) => ({ ...rich, industry: "cannabis", cannabisActivity })),
    { ...rich, entityType: "nonprofit", hasTaxExemptStatus: false },
    { ...rich, dissolutionDate: "2026-12-31" },
    ...["llc", "c_corp", "s_corp"].map((entityType) => ({
      ...rich,
      entityType,
      dissolutionDate: "2026-12-31",
      employeeCount: 0,
    })),
    ...[...naicsCodes].slice(0, 400).map((naics) => ({ ...rich, naics })),
  ];
  for (const state of STATE_CODES) {
    const other = STATE_CODES.find((c) => c !== state);
    for (const scenario of scenarios)
      for (const extra of [
        {},
        { multistate: [{ state: other, employeeCount: 2, hasProperty: true, salesUsd: 500_000 }] },
      ])
        run({ state, city: "X", county: "Y", entityType: "llc", ...scenario, ...extra });
  }

  // Launch plan wording (phase titles and descriptions).
  const plan = planLaunch({
    ...profileBase,
    state: "NY",
    entityType: "llc",
    industry: "restaurant",
    city: "New York",
    county: "New York",
  } as BusinessProfile);
  for (const ph of plan.phases) {
    add(ph.title, "phaseTitle", ph.id, "");
    add(ph.description, "phaseDescription", ph.id, "");
  }

  // Text in the data files that no profile above might reach (items gated by industry, NAICS code, ...).
  if (!onlyRules) collectDataText(root, add);
  return { corpus, runs };
}

const profileBase = { zip: "10001", employeeCount: 4, sellsTaxableGoods: true, usesTradeName: true };

const TEXT_KEYS = new Set(["title", "description", "deadline", "renewal", "processingTime", "summary"]);
const NOTE_PARENTS = new Set(["feeDetail", "penalty", "unemployment"]);
const SKIP = new Set(["zips.json", "naics.json"]);

function collectDataText(
  root: string,
  add: (text: unknown, field: string, ruleId: string, example: string) => void,
) {
  const walk = (node: unknown, parentKey: string, file: string): void => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, parentKey, file));
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "string") {
        if (TEXT_KEYS.has(key) || (key === "note" && NOTE_PARENTS.has(parentKey)))
          add(value, key === "note" ? "costNote" : key, `data:${file}`, file);
      } else if (key === "exemptions" && Array.isArray(value))
        value.forEach((e) => add(e, "exemption", `data:${file}`, file));
      else walk(value, key, file);
    }
  };
  const dataRoot = path.join(root, "data");
  for (const entry of fs.readdirSync(dataRoot, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dataRoot, entry.name);
    const files = entry.isDirectory()
      ? fs
          .readdirSync(full)
          .filter((n) => n.endsWith(".json"))
          .map((n) => path.join(entry.name, n))
      : entry.name.endsWith(".json")
        ? [entry.name]
        : [];
    for (const rel of files) walk(JSON.parse(fs.readFileSync(path.join(dataRoot, rel), "utf8")), "", rel);
  }
}
