import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import {
  defaultRules,
  evaluate,
  indexCities,
  indexCounties,
  holds,
  anyHold,
  resolveProfile,
  seededCityRule,
  seededCountyRule,
  type BusinessProfile,
  validateApplicability,
} from "../src";
import { INDUSTRIES, PROFILE_FIELDS, STATES } from "../src";
import { COUNTY_JURISDICTIONS, LOCAL_JURISDICTIONS, findCity, findCounty } from "../src/data";
import type { LocalItem } from "../src/data/types";
import { applicable } from "../src/rules/local";
import { EMPLOYER_ITEMS } from "../src/data/employers";
import { INDUSTRY_ITEMS } from "../src/data/industries";
import { describeSchedule, parseRRule, toRRule } from "../src/rrule";
import { describeFee, describePenalty, feeCost, penaltyOf } from "../src/fee";
import { describeTrigger } from "../src/trigger";

const root = path.resolve(__dirname, "..");
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
/** A validator with the shared definitions loaded, as every schema $refs them. */
const newAjv = () => {
  const a = new Ajv2020({ allErrors: true, strict: false });
  addFormats(a);
  a.addSchema(read("schema/common.schema.json"));
  return a;
};
const ajv = newAjv();

describe("state data files", () => {
  const validate = ajv.compile(read("schema/state.schema.json"));
  const files = fs.readdirSync(path.join(root, "data/states")).filter((f) => f.endsWith(".json"));

  it("has one file per state and DC", () => expect(files).toHaveLength(51));

  it.each(files)("%s matches the schema", (f) => {
    const data = read(`data/states/${f}`);
    const ok = validate(data);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
    expect(data.code, "the file name is the state code").toBeUndefined();
    expect(typeof data.wageWithholding, "withholding is explicit").toBe("boolean");
  });

  it("the loader adds the code and the fields that follow from other fields", () => {
    for (const f of files) {
      const code = f.slice(0, 2);
      const raw = read(`data/states/${f}`);
      expect(STATES[code]).toEqual({
        code,
        ...raw,
        wageWithholding: raw.wageWithholding,
        unemployment: { ...raw.unemployment, year: read("data/ui-source.json").year },
        workersComp: {
          ...raw.workersComp,
          threshold: raw.workersComp.threshold ?? describeTrigger(raw.workersComp.trigger) ?? "Varies",
        },
        verification: {
          ...raw.verification,
          scope: raw.verification.scope ?? read("data/verification.json").scope,
          dba: raw.verification.unconfirmed.includes("dbaFiling") ? "unconfirmed" : "checked",
        },
      });
    }
  });

  type SchemaNode = {
    $ref?: string;
    $defs?: Record<string, SchemaNode>;
    type?: string;
    oneOf?: SchemaNode[];
    anyOf?: SchemaNode[];
    items?: SchemaNode;
    properties?: Record<string, SchemaNode>;
  };
  it("lists keys in the schema's order, so diffs stay small", () => {
    const schema = read("schema/state.schema.json") as SchemaNode;
    const common = read("schema/common.schema.json") as SchemaNode;
    const resolve = (n: SchemaNode): SchemaNode =>
      n.$ref
        ? resolve((n.$ref.startsWith("common.") ? common : schema).$defs![n.$ref.split("/").pop()!]!)
        : n;
    const pick = (n: SchemaNode, v: unknown): SchemaNode => {
      n = resolve(n);
      for (const b of n.oneOf ?? n.anyOf ?? []) {
        const r = resolve(b);
        if (
          (r.type === "object" && v && typeof v === "object" && !Array.isArray(v)) ||
          (r.type === "array" && Array.isArray(v))
        )
          return r;
      }
      return n;
    };
    const misordered: string[] = [];
    const walk = (node: SchemaNode, v: unknown, where: string) => {
      const n = pick(node, v);
      if (Array.isArray(v)) return v.forEach((x, i) => n.items && walk(n.items, x, `${where}[${i}]`));
      if (!v || typeof v !== "object" || !n.properties) return;
      const keys = Object.keys(v);
      const want = Object.keys(n.properties).filter((k) => keys.includes(k));
      if (keys.join() !== want.join())
        misordered.push(`${where}: ${keys.join(",")} (want ${want.join(",")})`);
      for (const [k, x] of Object.entries(v)) if (n.properties[k]) walk(n.properties[k], x, `${where}.${k}`);
    };
    for (const f of files) walk(schema, read(`data/states/${f}`), f);
    expect(misordered).toEqual([]);
  });

  it("keeps unemployment figures and verification paths coherent", () => {
    for (const f of files) {
      const s = read(`data/states/${f}`);
      const u = s.unemployment;
      expect(u.minRate, `${f} minRate <= maxRate`).toBeLessThanOrEqual(u.maxRate);
      if (u.newEmployerRate !== null)
        expect(u.newEmployerRate, `${f} new employer rate within range`).toBeGreaterThanOrEqual(u.minRate);
      if (u.newEmployerRate !== null) expect(u.newEmployerRate).toBeLessThanOrEqual(u.maxRate);
      for (const path of s.verification.unconfirmed as string[]) {
        const found = path
          .split(".")
          .reduce<unknown>(
            (o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined),
            s,
          );
        expect(found, `${f}: unconfirmed path "${path}" does not exist`).not.toBeUndefined();
      }
    }
  });

  it("generates the workers' comp threshold text for plain employee counts", () => {
    for (const f of files) {
      const w = read(`data/states/${f}`).workersComp;
      if (w.threshold)
        expect(w.threshold, `${f} threshold repeats trigger`).not.toBe(describeTrigger(w.trigger));
      else expect(describeTrigger(w.trigger), `${f} needs threshold text`).toBeDefined();
    }
  });

  it("has no note that only restates what the fee already is", () => {
    const empty =
      /^(annual list fee|renewal of registration|certificate of renewal|fee for delinquent [a-z ]+|penalty for late [a-z ]+|late filing penalty on the [a-z ]+|penalty when the fee is not received by the due date)$/i;
    for (const f of files) {
      const s = read(`data/states/${f}`);
      for (const k of ["llcReport", "corpReport", "lpReport", "llpReport", "businessLicense"]) {
        const n = s[k];
        if (!n) continue;
        for (const text of [n.feeDetail.note, n.penalty?.note])
          if (text) expect(text, `${f} ${k}: "${text}" says nothing the amount does not`).not.toMatch(empty);
      }
    }
  });

  it("generates the fee text from feeDetail", () => {
    const text = (code: string, key: string) => describeFee(read(`data/states/${code}.json`)[key].feeDetail);
    expect(text("TX", "llcReport")).toBe(
      "Free (no tax due at or below $2.65 million of annualized revenue (2026 report))",
    );
    expect(text("AK", "llcReport")).toBe("$100");
    expect(text("IA", "llcReport")).toBe("$30 online ($45 paper)");
    expect(text("HI", "corpReport")).toBe("$15 ($12.50 if filed online)");
    expect(text("GA", "llcReport")).toBe("$50 ($60 online; includes a service charge)");
    expect(text("MN", "llpReport")).toBe("$155 online ($135 paper)");
    expect(text("MT", "llcReport")).toBe("Waived (if filed by April 15)");
    expect(text("IL", "llpReport")).toBe("$100 per partner (minimum $200, maximum $5,000; form UPA 1003(D))");
    expect(text("TN", "lpReport")).toBe("$20");
    expect(text("TN", "llcReport")).toBe("$300 base, plus $50 per member over 6 (maximum $3,000)");
    expect(text("MO", "llpReport")).toBe("$105 plus $50 per partner (maximum $205)");
    expect(text("SC", "corpReport")).toBe(
      "0.1% (of capital stock and paid-in surplus, plus $15; minimum $25)",
    );
    expect(text("WY", "llcReport")).toBe("From $60 (or 0.0002 of Wyoming assets, if greater)");
  });

  it("keeps related state fields consistent", () => {
    for (const f of files) {
      const s = read(`data/states/${f}`);
      const code = f.slice(0, 2);
      // A statewide sales tax has a permit page and an economic nexus threshold; Alaska has a nexus rule for local taxes.
      if (s.salesTax.statewide) {
        expect(s.links.salesTax, `${code} links.salesTax`).toBeDefined();
        expect(s.economicNexusUsd, `${code} economicNexusUsd`).not.toBeNull();
      } else if (code !== "AK") expect(s.economicNexusUsd, `${code} economicNexusUsd`).toBeNull();
      if (s.salesTax.statewide) expect(s.salesTax.alternative, `${code} alternative`).toBeNull();
      else expect(s.salesTax.alternative, `${code} alternative`).toBeTruthy();
      if (s.businessLicense)
        expect(s.businessLicense.url, `${code} license page`).toSatisfy(
          (urls) => Array.isArray(urls) && urls.every((url: string) => /^https:\/\//.test(url)),
        );
    }
  });

  it("late-fee notes that quote a monthly rate agree with the structured rate", () => {
    for (const f of files) {
      const s = read(`data/states/${f}`);
      for (const k of ["llcReport", "corpReport", "lpReport", "llpReport"]) {
        const late = s[k]?.penalty;
        const quoted = late?.note?.match(/(\d+(?:\.\d+)?)% per month/);
        if (quoted) expect(Number(quoted[1]), `${f} ${k}`).toBe(late.percentPerMonth);
      }
    }
  });

  it("has one UI data year, in data/ui-source.json", () => {
    const { year, source } = read("data/ui-source.json");
    expect(source).toContain(String(year));
    for (const f of files) {
      const s = read(`data/states/${f}`);
      expect(s.unemployment.year, `${f} stores the year`).toBeUndefined();
      expect(STATES[f.slice(0, 2)]!.unemployment.year).toBe(year);
    }
  });

  it("writes each fee once, in feeDetail, and never repeats its numbers in the note", () => {
    const money = (n: number) => `$${Number.isInteger(n) ? n.toLocaleString("en-US") : n.toFixed(2)}`;
    for (const f of files) {
      const s = read(`data/states/${f}`);
      for (const k of ["llcReport", "corpReport", "lpReport", "llpReport", "businessLicense"]) {
        const node = s[k];
        if (!node) continue;
        expect(node.fee, `${f} ${k} has fee text next to feeDetail`).toBeUndefined();
        expect(node.feeDetail, `${f} ${k}`).toBeDefined();
        const note: string = node.feeDetail.note ?? "";
        for (const key of ["amount", "online", "paper", "perUnit", "min", "max"] as const) {
          const v = node.feeDetail[key];
          if (typeof v === "number")
            expect(note.includes(money(v)) && v !== 0, `${f} ${k}: note repeats ${key} ${money(v)}`).toBe(
              false,
            );
        }
        expect(describeFee(node.feeDetail), `${f} ${k}`).not.toMatch(/undefined|NaN/);
      }
    }
  });
});

describe("business profile schema", () => {
  const validate = ajv.compile(read("schema/business-profile.schema.json"));
  it("accepts a complete profile", () => {
    expect(
      validate({ entityType: "llc", zip: "94105", city: "San Francisco", county: "San Francisco" }),
    ).toBe(true);
  });
  it("requires alcoholActivity for alcohol", () => {
    expect(validate({ entityType: "llc", zip: "94105", city: "SF", county: "SF", industry: "alcohol" })).toBe(
      false,
    );
  });
});

describe("local seed data", () => {
  it.each(LOCAL_JURISDICTIONS.map((j) => [j.city, j] as const))("%s is well-formed", (_city, j) => {
    expect(STATES[j.state]).toBeDefined();
    const ids = j.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const it of j.items) {
      expect(it.appliesTo.length).toBeGreaterThan(0);
      expect(it.title).toBeTruthy();
      expect(it.url, `${j.city} ${it.id} source`).toSatisfy((urls) =>
        urls?.every((url: string) => /^https:\/\//.test(url)),
      );
      const local = it as LocalItem;
      for (const f of ["exemptions", "supersedes"] as const)
        if (local[f])
          expect(
            local[f]!.every((x) => typeof x === "string" && x.length > 0),
            `${j.city} ${f}`,
          ).toBe(true);
      for (const w of [...(local.appliesWhen ?? []), ...(local.appliesWhenAny ?? [])])
        expect(validateApplicability(w), `${j.city} ${it.id} appliesWhen`).toBeUndefined();
    }
  });
});

describe("city data files", () => {
  const files = fs.readdirSync(path.join(root, "data/cities")).filter((f) => f.endsWith(".json"));
  it("has one file per state and DC", () => expect(files).toHaveLength(51));
  it.each(files)("%s only holds cities of its own state", (f) => {
    const list = read(`data/cities/${f}`) as Array<{ state?: string; city: string }>;
    for (const c of list) expect(c.state, "the file name is the state").toBeUndefined();
    const names = list.map((c) => c.city);
    expect(new Set(names).size).toBe(names.length);
  });
  it("entries without items say why", () => {
    for (const j of LOCAL_JURISDICTIONS.filter((x) => x.items.length === 0)) {
      expect(["none", "unverified"], j.city).toContain(j.status);
      expect(j.checkedOn, j.city).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(j.note, j.city).toBeTruthy();
      if (j.status === "none") expect([j.sourceUrl].flat().join(), j.city).toMatch(/^https:\/\//);
    }
  });
  it("entries with items have no status other than rules", () => {
    for (const j of LOCAL_JURISDICTIONS.filter((x) => x.items.length > 0))
      expect(j.status ?? "rules").toBe("rules");
  });
  it("looks cities up regardless of punctuation and aliases", () => {
    expect(findCity("MO", "Saint Louis")?.city).toBe("St. Louis");
    expect(findCity("NY", "brooklyn")?.city).toBe("New York");
    expect(findCity("NY", "Nowhere")).toBeUndefined();
  });
});

describe("county data files", () => {
  const files = fs.readdirSync(path.join(root, "data/counties")).filter((f) => f.endsWith(".json"));
  it("has one file per state and DC", () => expect(files).toHaveLength(51));
  it.each(files)("%s only holds counties of its own state, once each", (f) => {
    const list = read(`data/counties/${f}`) as Array<{ state?: string; county: string }>;
    for (const c of list) expect(c.state, "the file name is the state").toBeUndefined();
    const names = list.map((c) => c.county);
    expect(new Set(names).size).toBe(names.length);
  });
  it("entries are well-formed", () => {
    for (const j of COUNTY_JURISDICTIONS) {
      expect(STATES[j.state], j.county).toBeDefined();
      const ids = j.items.map((i) => i.id);
      expect(new Set(ids).size, j.county).toBe(ids.length);
      for (const it of j.items) {
        expect(it.appliesTo.length).toBeGreaterThan(0);
        expect(it.url, `${j.county} ${it.id} source`).toSatisfy((urls) =>
          urls?.every((url: string) => /^https:\/\//.test(url)),
        );
        for (const w of [...(it.appliesWhen ?? []), ...(it.appliesWhenAny ?? [])])
          expect(validateApplicability(w), `${j.county} ${it.id} appliesWhen`).toBeUndefined();
      }
      if (j.items.length === 0) {
        expect(["none", "unverified"], j.county).toContain(j.status);
        expect(j.checkedOn, j.county).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(j.note, j.county).toBeTruthy();
        if (j.status === "none") expect([j.sourceUrl].flat().join(), j.county).toMatch(/^https:\/\//);
      }
    }
  });
  it("covers the 300 largest counties", () => {
    const top = read("data/top-counties.json").counties as Array<{ state: string; county: string }>;
    expect(top).toHaveLength(300);
    const missing = top.filter((c) => !findCounty(c.state, c.county)).map((c) => `${c.county}, ${c.state}`);
    expect(missing).toEqual([]);
  });
  it("a county is only `none` when more than the personal property return was checked", () => {
    for (const j of COUNTY_JURISDICTIONS.filter((x) => x.status === "none"))
      expect(
        j.note ?? "",
        `${j.state} ${j.county}: none cannot rest on a personal property check alone`,
      ).not.toMatch(/personal property/i);
  });

  it("county appliesWhen conditions read real profile fields", () => {
    for (const j of COUNTY_JURISDICTIONS)
      for (const it of j.items)
        for (const w of it.appliesWhen ?? [])
          expect(validateApplicability(w), `${j.state} ${j.county} ${it.id} appliesWhen`).toBeUndefined();
  });

  it("matches names regardless of County/Parish suffixes", () => {
    expect(findCounty("CA", "Los Angeles County")?.county).toBe("Los Angeles");
    expect(findCounty("LA", "East Baton Rouge")?.county).toBe("East Baton Rouge Parish");
  });
  it("adds county items to results", () => {
    const r = evaluate(
      {
        entityType: "llc",
        zip: "90012",
        city: "Los Angeles",
        county: "Los Angeles",
        industry: "retail",
      } as BusinessProfile,
      { asOf: "2026-10-13" },
    );
    const item = r.items.find(
      (i) => i.jurisdiction === "county" && /business personal property/i.test(i.title),
    );
    expect(item?.url?.every((url) => /^https:\/\//.test(url))).toBe(true);
    expect(item?.nextDue).toBe("2027-04-01");
  });
});

describe("profession directory", () => {
  const prof = read("data/professions.json").professions as Record<
    string,
    Record<string, { name: string; url?: string[] }>
  >;
  it.each(Object.keys(prof))("%s has a board for all 51 jurisdictions", (p) => {
    expect(Object.keys(prof[p]!).sort()).toEqual(Object.keys(STATES).sort());
    for (const b of Object.values(prof[p]!)) {
      expect(b.name.length).toBeGreaterThan(5);
      if (b.url) expect(b.url.every((url) => /^https?:\/\//.test(url))).toBe(true);
    }
  });
});

describe("local and profession data schemas", () => {
  const local = newAjv();
  local.addSchema(read("schema/local-item.schema.json"));
  const cityFile = local.compile(read("schema/cities.schema.json"));
  const countyFile = local.compile(read("schema/counties.schema.json"));
  const list = (dir: string) => fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith(".json"));

  it.each(list("data/cities"))("cities/%s matches the schema", (f) => {
    cityFile(read(`data/cities/${f}`));
    expect(cityFile.errors ?? []).toEqual([]);
  });
  it.each(list("data/counties"))("counties/%s matches the schema", (f) => {
    countyFile(read(`data/counties/${f}`));
    expect(countyFile.errors ?? []).toEqual([]);
  });
  it("professions.json matches the schema", () => {
    const validate = local.compile(read("schema/professions.schema.json"));
    validate(read("data/professions.json"));
    expect(validate.errors ?? []).toEqual([]);
  });

  it("shared note codes are used, and only for text more than one entry shares", () => {
    const notes = read("data/local-notes.json") as Record<string, string>;
    const used = new Map<string, number>();
    for (const dir of ["cities", "counties"])
      for (const f of list(`data/${dir}`))
        for (const e of read(`data/${dir}/${f}`) as Array<{ reason?: string; note?: string }>) {
          if (e.reason) used.set(e.reason, (used.get(e.reason) ?? 0) + 1);
          if (e.note)
            expect(Object.values(notes), `${dir}/${f}: "${e.note}" has a shared code`).not.toContain(e.note);
        }
    for (const [code] of used) expect(notes[code], `unknown reason ${code}`).toBeDefined();
    for (const code of Object.keys(notes)) expect(used.get(code) ?? 0, `${code} is used`).toBeGreaterThan(1);
  });

  it("the loader resolves a reason into the note text", () => {
    const notes = read("data/local-notes.json") as Record<string, string>;
    const austin = findCity("TX", "Abilene");
    expect(austin?.reason).toBe("tx-city-license-not-researched");
    expect(austin?.note).toBe(notes["tx-city-license-not-researched"]);
  });

  it("rejects malformed local entries", () => {
    const ok = {
      city: "Austin",
      counties: ["Travis"],
      checkedOn: "2026-10-13",
      status: "unverified",
      note: "No general license was confirmed.",
      items: [],
    };
    expect(cityFile([ok])).toBe(true);
    const item = {
      id: "x.fee",
      title: "Pay the fee",
      category: "payment",
      authority: "City Hall",
      description: "Pay the annual fee to the city.",
      rrule: "FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=15",
      appliesTo: ["all"],
      feeDetail: { basis: "unknown" },
      penalty: { basis: "unknown" },
    };
    const bad: unknown[] = [
      { ...ok, reason: "tx-city-license-not-researched" },
      { ...ok, note: undefined, reason: "Not A Code" },
      { ...ok, checkedOn: "2026-02-30" },
      { ...ok, checkedOn: "10/13/2026" },
      { ...ok, state: "TX" },
      { ...ok, status: undefined },
      { ...ok, status: "none" },
      { ...ok, items: [item] },
      { ...ok, status: undefined, items: [{ ...item, id: "Bad Id" }] },
      { ...ok, status: undefined, items: [{ ...item, url: "http://insecure.example" }] },
      { ...ok, status: undefined, items: [{ ...item, frequency: "yearly" }] },
      // A recurrence is an rrule; `frequency` is only for what does not recur, and an entry has one or the other.
      { ...ok, status: undefined, items: [{ ...item, rrule: undefined, frequency: "annual" }] },
      { ...ok, status: undefined, items: [{ ...item, frequency: "once" }] },
      { ...ok, status: undefined, items: [{ ...item, rrule: undefined }] },
      { ...ok, status: undefined, items: [{ ...item, rrule: "FREQ=MONTHLY;INTERVAL=2" }] },
      { ...ok, status: undefined, items: [{ ...item, due: { type: "fixed", month: 13, day: 1 } }] },
      { ...ok, status: undefined, items: [{ ...item, due: { type: "date", date: "2026-02-30" } }] },
      // Every item states its fee and its penalty; "unknown" is the placeholder for one not yet researched.
      { ...ok, status: undefined, items: [{ ...item, feeDetail: undefined }] },
      { ...ok, status: undefined, items: [{ ...item, penalty: undefined }] },
      { ...ok, status: undefined, items: [{ ...item, penalty: { basis: "flat" } }] },
      { ...ok, status: undefined, items: [{ ...item, penalty: { basis: "none", amount: 50 } }] },
      { ...ok, status: undefined, items: [{ ...item, penalty: { amount: 50 } }] },
    ];
    for (const entry of bad) expect(cityFile([entry]), JSON.stringify(entry)).toBe(false);
    // An item names its page, and a county entry says when it was checked.
    expect(cityFile([{ ...ok, status: undefined, items: [item] }])).toBe(false);
    expect(cityFile([{ ...ok, status: "rules", items: [{ ...item, url: "https://example.gov/x" }] }])).toBe(
      true,
    );
    expect(
      countyFile([{ county: "Travis", status: "unverified", note: "No filing was confirmed.", items: [] }]),
    ).toBe(false);
  });

  it("keeps unresearched fees visible in the result", () => {
    expect(feeCost({ feeDetail: { basis: "unknown" } })).toEqual({
      cost: { basis: "unknown", currency: "USD" },
    });
    expect(feeCost({ feeDetail: { basis: "none" } })).toEqual({ cost: { basis: "none", currency: "USD" } });
    expect(penaltyOf({ penalty: { basis: "unknown" } })).toEqual({});
    expect(penaltyOf({ penalty: { basis: "none" } })).toEqual({});
    expect(penaltyOf({ penalty: { basis: "flat", amount: 50, note: "per month late" } })).toEqual({
      penalty: { basis: "flat", amount: 50, note: "per month late", currency: "USD" },
    });
  });

  it("describes structured penalties", () => {
    expect(describePenalty({ basis: "percent", rate: 5, min: 25, max: 500 })).toBe(
      "5% (minimum $25; maximum $500)",
    );
    expect(describePenalty({ basis: "per_item", perUnit: 10, note: "per return" })).toBe(
      "$10 per item (per return)",
    );
    expect(describePenalty({ basis: "range", min: 100, max: 1000 })).toBe("$100–$1,000");
  });

  it("requires the numbers a fee basis needs", () => {
    const report = read("data/states/AK.json");
    const withFee = (feeDetail: unknown) => ({ ...report, llcReport: { ...report.llcReport, feeDetail } });
    const fresh = newAjv();
    const validate = fresh.compile(read("schema/state.schema.json"));
    expect(validate(withFee({ basis: "flat", amount: 100 }))).toBe(true);
    expect(validate(withFee({ basis: "flat" }))).toBe(false);
    expect(validate(withFee({ basis: "none" }))).toBe(false);
    expect(validate(withFee({ basis: "per_partner", amount: 100 }))).toBe(false);
    expect(validate(withFee({ basis: "percent", min: 25 }))).toBe(false);
    expect(validate(withFee({ basis: "varies", note: "by license category" }))).toBe(true);
  });
});

describe("coverage", () => {
  it("COVERAGE.md only points at files and folders that exist", () => {
    const md = fs.readFileSync(path.join(root, "COVERAGE.md"), "utf8");
    const links = [...md.matchAll(/\]\((?!https?:)([^)#]+)\)/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThan(3);
    for (const link of links) expect(fs.existsSync(path.join(root, link)), link).toBe(true);
    expect(md, "COVERAGE.md must not hold generated figures").not.toMatch(/\b\d{3}\b with/);
  });

  it("the coverage script counts straight from the JSON", async () => {
    // @ts-expect-error plain JS module
    const { coverage } = await import("../scripts/coverage.mjs");
    const c = coverage();
    expect(c.states.total).toBe(51);
    expect(c.byState).toHaveLength(51);
    expect(c.cities.total).toBe(LOCAL_JURISDICTIONS.length);
    expect(c.cities.withRules + c.cities.checkedNone + c.cities.unverified).toBe(c.cities.total);
    expect(c.counties.total).toBe(COUNTY_JURISDICTIONS.length);
    expect(c.counties.withRules + c.counties.checkedNone + c.counties.unverified).toBe(c.counties.total);
  });
});

describe("compliance result schema", () => {
  const validate = ajv.compile(read("schema/compliance-result.schema.json"));
  const profiles: BusinessProfile[] = [
    {
      entityType: "llc",
      zip: "78701",
      city: "Austin",
      county: "Travis",
      employeeCount: 3,
      annualPayroll: 120000,
    },
    { entityType: "c_corp", zip: "10001", city: "New York", county: "New York", sellsTaxableGoods: true },
    { entityType: "lp", zip: "37201", city: "Nashville", county: "Davidson", ownerCount: 3 },
    {
      entityType: "llc",
      zip: "94105",
      city: "San Francisco",
      county: "San Francisco",
      dissolutionDate: "2026-12-01",
      multistate: [{ state: "WA", employeeCount: 1 }],
    },
  ];
  it.each(profiles.map((p, i) => [i, p] as const))("validates results for profile %i", (_i, profile) => {
    const result = JSON.parse(JSON.stringify(evaluate(profile, { asOf: "2026-10-13" })));
    const ok = validate(result);
    expect(validate.errors ?? []).toEqual([]);
    expect(ok).toBe(true);
  });
});

describe("source links", () => {
  const isBare = (u: string) => {
    const url = new URL(u);
    return (url.pathname === "/" || url.pathname === "") && !url.search;
  };

  it("every state has specific (non-home-page) links for the obligations it cites", () => {
    for (const [code, s] of Object.entries(STATES)) {
      const links = s.links;
      expect(links, code).toBeDefined();
      for (const key of ["formation", "annualReport", "uiRegistration", "entityTax"] as const)
        expect(
          (links[key] as string[]).every(isBare),
          `${code}.links.${key} contains a bare domain: ${links[key]}`,
        ).toBe(false);
      if (s.wageWithholding) expect(links.withholding, `${code} withholding`).toBeDefined();
      if (s.salesTax.statewide) expect(links.salesTax, `${code} salesTax`).toBeDefined();
      for (const [key, value] of Object.entries(links)) {
        expect(value, `${code}.links.${key}`).toSatisfy(
          (urls) => Array.isArray(urls) && urls.every((url: string) => /^https:\/\//.test(url)),
        );
        if ((value as string[]).length > 0)
          expect((value as string[]).every(isBare), `${code}.links.${key}`).toBe(false);
      }
    }
  });
});

describe("industry rules across all jurisdictions", () => {
  const industriesWithRules = INDUSTRIES.filter((value) => value !== "general" && value !== "retail");

  it("emits restaurant and construction obligations for every state", () => {
    for (const state of Object.keys(STATES)) {
      const base = { entityType: "llc", state, zip: "00000", city: "Sample", county: "Sample" } as const;
      expect(
        evaluate({ ...base, industry: "restaurant" }).items.some((i) => i.ruleId === "industry.food-service"),
        state,
      ).toBe(true);
      expect(
        evaluate({ ...base, industry: "construction" }).items.some(
          (i) => i.ruleId === "industry.construction",
        ),
        state,
      ).toBe(true);
    }
  });

  it("evaluates every supported industry in every state", () => {
    for (const state of Object.keys(STATES)) {
      for (const industry of industriesWithRules) {
        const items = evaluate({
          entityType: "llc",
          state,
          zip: "00000",
          city: "Sample",
          county: "Sample",
          industry,
          profession: "other",
          alcoholActivity: "retail",
          cannabisActivity: "retail",
          commercialVehicles: { interstate: true, grossWeightLbs: 20000 },
        }).items;
        expect(items.length, `${state}:${industry}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("citation urls in output", () => {
  const isBare = (u: string) => {
    const url = new URL(u);
    return (url.pathname === "/" || url.pathname === "") && !url.search;
  };
  const sample: Array<Partial<BusinessProfile>> = [
    {
      entityType: "llc",
      employeeCount: 3,
      annualPayroll: 90000,
      sellsTaxableGoods: true,
      usesTradeName: true,
    },
    { entityType: "c_corp", employeeCount: 2, annualPayroll: 60000, sellsTaxableGoods: true },
    { entityType: "sole_proprietorship", usesTradeName: true, sellsTaxableGoods: true },
    { entityType: "pllc", profession: "attorney", industry: "professional_services" },
    { entityType: "llp", profession: "cpa" },
    { entityType: "llc", industry: "healthcare", profession: "physician", employeeCount: 1 },
    { entityType: "llc", profession: "architect", industry: "professional_services" },
    { entityType: "pc", profession: "engineer", industry: "professional_services" },
    { entityType: "lp" },
    { entityType: "llc", industry: "restaurant", employeeCount: 4, annualPayroll: 80000 },
  ];

  it("never cites a bare domain, for every state", () => {
    const bare: string[] = [];
    for (const [code, s] of Object.entries(STATES)) {
      // Any ZIP works: the state is passed explicitly.
      for (const p of sample) {
        const profile = {
          zip: "00000",
          city: "Sample",
          county: "Sample",
          state: code,
          ...p,
        } as BusinessProfile;
        let result;
        try {
          result = evaluate(profile, { asOf: "2026-10-13" });
        } catch {
          continue;
        }
        for (const item of result.items) {
          if (item.url?.some(isBare)) bare.push(`${code} ${item.id}: ${item.url.join(", ")}`);
        }
      }
      void s;
    }
    expect([...new Set(bare)]).toEqual([]);
  });
});

describe("data conditions", () => {
  it("uses profile inputs for city-specific conditions", () => {
    const base = { entityType: "llc" as const, zip: "94533", city: "Fairfield", county: "Solano" };
    const hasOccupancy = (homeBased: boolean) =>
      evaluate({ ...base, homeBased }, { asOf: "2026-10-18" }).items.some((item) =>
        item.title.includes("Fairfield certificate of occupancy"),
      );
    expect(hasOccupancy(false)).toBe(true);
    expect(hasOccupancy(true)).toBe(false);
  });

  it("applies the Idaho personal-property threshold from the profile", () => {
    const base = { entityType: "llc" as const, zip: "83702", city: "Boise", county: "Ada" };
    const hasReturn = (businessPropertyValueUsd: number) =>
      evaluate({ ...base, businessPropertyValueUsd }, { asOf: "2026-10-18" }).items.some((item) =>
        item.title.includes("Ada County business personal property return"),
      );
    expect(hasReturn(250000)).toBe(false);
    expect(hasReturn(250001)).toBe(true);
  });

  it("rejects conditions that cannot be evaluated deterministically", () => {
    expect(validateApplicability({ field: "annualPayroll", op: "in", value: ["large"] })).toMatch(
      /numeric comparison/,
    );
    expect(validateApplicability({ field: "foodService", op: ">", value: true })).toMatch(/==\/!=/);
    expect(validateApplicability({ field: "activities", op: "==", value: 1 })).toMatch(/string/);
    expect(validateApplicability({ field: "commercialVehicles", op: "==", value: "interstate" })).toMatch(
      /cannot be used/,
    );
  });

  it("rejects invalid custom conditions during evaluation", () => {
    const profile = resolveProfile({ entityType: "llc", zip: "78701", city: "Austin", county: "Travis" });
    const item = {
      id: "invalid.condition",
      title: "Invalid condition",
      category: "filing",
      authority: "Test",
      description: "Test",
      appliesTo: ["all"],
      appliesWhen: [{ field: "annualPayroll", op: "in", value: ["large"] }],
    } as never as LocalItem;
    expect(() => applicable([item], profile)).toThrow(/Invalid appliesWhen/);
  });

  it("validates conditions even when a NAICS scope would not match", () => {
    const profile = resolveProfile({ entityType: "llc", zip: "78701", city: "Austin", county: "Travis" });
    const item = {
      id: "scoped.invalid.condition",
      title: "Scoped invalid condition",
      category: "filing",
      authority: "Test",
      description: "Test",
      appliesTo: ["all"],
      naics: ["999999"],
      appliesWhen: [{ field: "annualPayroll", op: "in", value: ["large"] }],
    } as never as LocalItem;
    expect(() => applicable([item], profile)).toThrow(/Invalid appliesWhen/);
  });

  it("rejects empty alternative conditions during evaluation", () => {
    const profile = resolveProfile({ entityType: "llc", zip: "78701", city: "Austin", county: "Travis" });
    const item = {
      id: "empty.condition",
      title: "Empty condition",
      category: "filing",
      authority: "Test",
      description: "Test",
      appliesTo: ["all"],
      appliesWhenAny: [],
    } as never as LocalItem;
    expect(() => applicable([item], profile)).toThrow(/Invalid appliesWhenAny/);
  });

  it("evaluates alternative conditions as an OR", () => {
    const conditions = [
      { field: "homeBased", op: "==" as const, value: true },
      { field: "annualRevenue", op: ">=" as const, value: 2000 },
    ];
    expect(anyHold(conditions, { homeBased: false, annualRevenue: 0 } as never)).toBe(false);
    expect(anyHold(conditions, { homeBased: true, annualRevenue: 0 } as never)).toBe(true);
    expect(anyHold(conditions, { homeBased: false, annualRevenue: 2000 } as never)).toBe(true);
  });

  it("keeps rule input declarations valid and unambiguous", () => {
    for (const rule of defaultRules) {
      expect(new Set(rule.inputs).size, `${rule.id} duplicate inputs`).toBe(rule.inputs.length);
      for (const field of rule.inputs) expect(PROFILE_FIELDS, `${rule.id} input ${field}`).toContain(field);
    }
  });

  it("uses only deterministic profile fields and compatible operators", () => {
    const sources = [
      ...LOCAL_JURISDICTIONS.flatMap((j) => j.items),
      ...COUNTY_JURISDICTIONS.flatMap((j) => j.items),
      ...Object.values(INDUSTRY_ITEMS).flat(),
      ...Object.values(EMPLOYER_ITEMS).flat(),
    ];
    for (const item of sources)
      for (const condition of [...(item.appliesWhen ?? []), ...(item.appliesWhenAny ?? [])])
        expect(validateApplicability(condition), `${item.id} appliesWhen`).toBeUndefined();
  });

  it("has a reachable true and false outcome for every condition", () => {
    const sources = [
      ...LOCAL_JURISDICTIONS.flatMap((j) => j.items),
      ...COUNTY_JURISDICTIONS.flatMap((j) => j.items),
      ...Object.values(INDUSTRY_ITEMS).flat(),
      ...Object.values(EMPLOYER_ITEMS).flat(),
    ];
    for (const item of sources)
      for (const condition of [...(item.appliesWhen ?? []), ...(item.appliesWhenAny ?? [])]) {
        const value = Array.isArray(condition.value) ? condition.value[0] : condition.value;
        const baseValue =
          condition.op === ">=" || condition.op === ">"
            ? (value as number) + 1
            : condition.op === "<=" || condition.op === "<"
              ? (value as number) - 1
              : condition.op === "!="
                ? typeof value === "boolean"
                  ? !value
                  : typeof value === "number"
                    ? value + 1
                    : "__not_equal__"
                : value;
        const base = { [condition.field]: Array.isArray(condition.value) ? [baseValue] : baseValue };
        expect(holds(condition, base as never), `${item.id} true condition`).toBe(true);
        const opposite =
          condition.op === ">=" || condition.op === ">"
            ? (value as number) - 1
            : condition.op === "<=" || condition.op === "<"
              ? (value as number) + 1
              : condition.op === "!="
                ? value
                : Array.isArray(condition.value)
                  ? ["__not_in_condition__"]
                  : typeof value === "boolean"
                    ? !value
                    : typeof value === "number"
                      ? value + 1
                      : "__not_in_condition__";
        expect(holds(condition, { [condition.field]: opposite } as never), `${item.id} false condition`).toBe(
          false,
        );
      }
  });

  it("declares every data condition as a rule input", () => {
    const required = (items: LocalItem[]) =>
      new Set(
        items.flatMap((item) =>
          [...(item.appliesWhen ?? []), ...(item.appliesWhenAny ?? [])].map((condition) => condition.field),
        ),
      );
    const city = defaultRules.find((rule) => rule.id === "local.seeded-city")!;
    const county = defaultRules.find((rule) => rule.id === "local.seeded-county")!;
    const industry = defaultRules.find((rule) => rule.id === "industry.naics-licences")!;
    const employer = defaultRules.find((rule) => rule.id === "state.employer-mandates")!;
    for (const field of required(LOCAL_JURISDICTIONS.flatMap((j) => j.items)))
      expect(city.inputs, `city rule missing ${field}`).toContain(field);
    for (const field of required(COUNTY_JURISDICTIONS.flatMap((j) => j.items)))
      expect(county.inputs, `county rule missing ${field}`).toContain(field);
    for (const field of required(Object.values(INDUSTRY_ITEMS).flat()))
      expect(industry.inputs, `industry rule missing ${field}`).toContain(field);
    for (const field of required(Object.values(EMPLOYER_ITEMS).flat()))
      expect(employer.inputs, `employer rule missing ${field}`).toContain(field);
  });
});

describe("seed items with appliesWhen", () => {
  const seeds = [
    {
      state: "NY",
      county: "Testland",
      status: "rules" as const,
      items: [
        {
          id: "testland.occupancy-tax",
          title: "Testland occupancy tax",
          category: "filing" as const,
          authority: "Testland Finance",
          description: "Lodging operators remit the county occupancy tax.",
          rrule: "FREQ=MONTHLY;INTERVAL=3",
          appliesTo: ["all" as const],
          feeDetail: { basis: "unknown" as const },
          penalty: { basis: "unknown" as const },
          appliesWhen: [{ field: "activities", op: "in" as const, value: ["lodging"] }],
        },
      ],
    },
  ];
  const base: BusinessProfile = {
    entityType: "llc",
    zip: "12401",
    city: "Kingston",
    county: "Testland",
    state: "NY",
  };
  const rules = [...defaultRules, seededCountyRule(indexCounties(seeds), "my.counties")];
  const has = (profile: BusinessProfile) =>
    evaluate(profile, { asOf: "2026-10-13", rules }).items.some((i) => i.title === "Testland occupancy tax");

  it("shows the item only when the condition holds", () => {
    expect(has(base)).toBe(false);
    expect(has({ ...base, activities: ["roofing"] })).toBe(false);
    expect(has({ ...base, activities: ["lodging"] })).toBe(true);
    expect(has({ ...base, activities: ["roofing", "lodging"] })).toBe(true);
  });
});

describe("New York county items follow their conditions", () => {
  const nassau: BusinessProfile = {
    entityType: "llc",
    zip: "11501",
    city: "Mineola",
    county: "Nassau",
    state: "NY",
    employeeCount: 40,
    annualPayroll: 3_000_000,
  };
  const titles = (p: BusinessProfile) =>
    evaluate(p, { asOf: "2026-10-15" })
      .items.filter((i) => i.jurisdiction === "county")
      .map((i) => i.title);
  const has = (p: BusinessProfile, text: RegExp) => titles(p).some((x) => text.test(x));

  it("shows the MCTMT only for employers with enough payroll in the commuter district", () => {
    expect(has(nassau, /MCTMT/)).toBe(true);
    expect(has({ ...nassau, annualPayroll: 500_000 }, /MCTMT/)).toBe(false);
    expect(has({ ...nassau, employeeCount: 0, annualPayroll: 0 }, /MCTMT/)).toBe(false);
    // Albany County is outside the district.
    expect(has({ ...nassau, zip: "12207", city: "Albany", county: "Albany" }, /MCTMT/)).toBe(false);
  });

  it("shows lodging and home improvement obligations only to those businesses", () => {
    expect(has(nassau, /home improvement/i)).toBe(false);
    expect(has(nassau, /occupancy tax/i)).toBe(false);
    expect(
      has({ ...nassau, activities: ["home_improvement"] }, /Nassau County home improvement license/),
    ).toBe(true);
    const westchester = { ...nassau, county: "Westchester", zip: "10601", city: "White Plains" };
    expect(has(westchester, /Westchester County occupancy tax/)).toBe(false);
    expect(has({ ...westchester, activities: ["lodging"] }, /Westchester County occupancy tax/)).toBe(true);
  });
});

describe("Florida county tourist development tax", () => {
  const orlando: BusinessProfile = {
    entityType: "llc",
    zip: "32801",
    city: "Orlando",
    county: "Orange",
    state: "FL",
  };
  const titles = (p: BusinessProfile) =>
    evaluate(p, { asOf: "2026-10-16" })
      .items.filter((i) => i.jurisdiction === "county")
      .map((i) => i.title);

  it("shows the county tax only to lodging businesses", () => {
    expect(titles(orlando).some((t) => /tourist development tax/.test(t))).toBe(false);
    const lodging = titles({ ...orlando, activities: ["lodging"] });
    expect(lodging).toContain("Register for the Orange County tourist development tax");
    expect(lodging).toContain("File the Orange County tourist development tax return");
  });
});

describe("bring-your-own city data", () => {
  const profile: BusinessProfile = {
    entityType: "llc",
    zip: "78701",
    city: "Smallville",
    county: "Travis",
    state: "TX",
    industry: "retail",
  } as BusinessProfile;
  it("adds items for cities that are not bundled", () => {
    const seeds = [
      {
        state: "TX",
        city: "Smallville",
        counties: ["Testland"],
        status: "rules" as const,
        checkedOn: "2026-10-13",
        items: [
          {
            id: "smallville.permit",
            title: "Smallville permit",
            category: "permit" as const,
            authority: "City of Smallville",
            description: "Test.",
            frequency: "once" as const,
            appliesTo: ["all" as const],
            feeDetail: { basis: "unknown" as const },
            penalty: { basis: "unknown" as const },
          },
        ],
      },
    ];
    const base = evaluate(profile, { asOf: "2026-10-13" });
    expect(base.items.some((i) => i.title === "Smallville permit")).toBe(false);
    const rules = [...defaultRules, seededCityRule(indexCities(seeds), "my.cities")];
    const result = evaluate(profile, { asOf: "2026-10-13", rules });
    expect(result.items.some((i) => i.title === "Smallville permit")).toBe(true);
  });
});

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

describe("schedules in data files", () => {
  type Node = Record<string, unknown>;
  const nodes: Array<[string, Node]> = [];
  const collect = (value: unknown, where: string) => {
    if (Array.isArray(value)) value.forEach((v, i) => collect(v, `${where}[${i}]`));
    else if (value && typeof value === "object") {
      const o = value as Node;
      if ("rrule" in o) nodes.push([where, o]);
      for (const [k, v] of Object.entries(o)) collect(v, `${where}.${k}`);
    }
  };
  for (const dir of ["states", "cities", "counties"])
    for (const f of fs.readdirSync(path.join(root, "data", dir)))
      collect(read(`data/${dir}/${f}`), `${dir}/${f}`);

  it("has recurrence rules", () => expect(nodes.length).toBeGreaterThan(300));

  it("every rrule parses, and nothing repeats what it says", () => {
    for (const [where, o] of nodes) {
      const s = parseRRule(o.rrule as string, o.anchor as string | undefined);
      expect(o.frequency, `${where} frequency is derived from rrule`).toBeUndefined();
      expect(o.due, `${where} due is derived from rrule`).toBeUndefined();
      const generated = describeSchedule(s, o.opens as { month: number; day: number } | undefined);
      if (o.deadline) {
        expect(o.deadline, `${where} deadline equals the generated text`).not.toBe(generated);
        // A qualifier belongs in deadlineNote: the date is written once, in the rrule.
        // (A text that goes on to name a second date, such as another filing, is more than a qualifier.)
        const rest = generated ? (o.deadline as string).slice(generated.length) : "";
        const namesAnotherDate = new RegExp(MONTHS.join("|") + " \\d").test(rest);
        if (generated && !namesAnotherDate)
          expect(
            (o.deadline as string).startsWith(`${generated} (`),
            `${where} deadline "${o.deadline}" repeats the generated date; use deadlineNote`,
          ).toBe(false);
        expect(o.deadlineNote, `${where} has deadline and deadlineNote`).toBeUndefined();
      }
      for (const text of [o.deadline, o.deadlineNote])
        if (text) expect(text as string, `${where} quotes a late fee; use penalty`).not.toMatch(/late fee/i);
      if (typeof o.deadlineNote === "string") {
        const open = (o.deadlineNote.match(/\(/g) ?? []).length;
        expect(open, `${where} deadlineNote has unbalanced parentheses: ${o.deadlineNote}`).toBe(
          (o.deadlineNote.match(/\)/g) ?? []).length,
        );
        // Restating what the item already is says nothing ("expiration", "renewal").
        expect(o.deadlineNote, `${where} note says nothing`).not.toMatch(
          /^(license |certificate )?(expiration|renewal)$/i,
        );
      }
      if (o.deadlineNote) {
        expect(generated, `${where} deadlineNote needs a rule that generates text`).toBeDefined();
        // The note may not name one of the rule's own dates.
        const dates = s.due?.type === "fixed" ? [s.due] : s.due?.type === "multi" ? s.due.dates : [];
        for (const d of dates)
          expect(
            (o.deadlineNote as string).includes(`${MONTHS[d.month - 1]} ${d.day}`),
            `${where} deadlineNote repeats ${MONTHS[d.month - 1]} ${d.day}`,
          ).toBe(false);
      }
    }
  });

  it("an explicit deadline names the month the rrule says", () => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    for (const [where, o] of nodes) {
      const { due } = parseRRule(o.rrule as string, o.anchor as string | undefined);
      if (typeof o.deadline !== "string" || !due || due.type === "anniversary") continue;
      // Text such as "15th day of the 4th month after fiscal year end" names no month.
      if (!months.some((m) => (o.deadline as string).includes(m))) continue;
      const dueMonths =
        due.type === "fixed" ? [due.month] : due.type === "multi" ? due.dates.map((d) => d.month) : [];
      // "Before January 1" is a December 31 deadline, so the following month counts too; a multi-month cycle
      // only has to name one of its months ("April 30 for annual filers; quarterly after each quarter").
      const named = dueMonths.some((m) =>
        [months[m - 1]!, months[m % 12]!].some((name) => (o.deadline as string).includes(name)),
      );
      expect(named, `${where}: deadline "${o.deadline}" names a due month`).toBe(true);
    }
  });

  it("round-trips through parseRRule and toRRule", () => {
    for (const [where, o] of nodes) {
      const s = parseRRule(o.rrule as string, o.anchor as string | undefined);
      const back = toRRule(s.due, s.frequency);
      expect(back, where).toEqual({ rrule: o.rrule, ...(o.anchor ? { anchor: o.anchor } : {}) });
    }
  });

  it("reads undated recurrences as a frequency with no due date", () => {
    for (const [rule, frequency] of [
      ["FREQ=YEARLY", "annual"],
      ["FREQ=YEARLY;INTERVAL=2", "biennial"],
      ["FREQ=YEARLY;INTERVAL=5", "every_five_years"],
      ["FREQ=MONTHLY", "monthly"],
      ["FREQ=MONTHLY;INTERVAL=3", "quarterly"],
    ] as const) {
      const s = parseRRule(rule);
      expect(s, rule).toEqual({ frequency });
      expect(toRRule(s.due, s.frequency), rule).toEqual({ rrule: rule });
    }
    // The anniversary of formation is named, so a bare rule cannot be mistaken for it.
    expect(parseRRule("FREQ=YEARLY", "formation").due).toEqual({ type: "anniversary", point: "date" });
    expect(() => parseRRule("FREQ=YEARLY;BYMONTHDAY=1", "formation")).toThrow();
    expect(() => parseRRule("FREQ=MONTHLY", "formation")).toThrow();
  });

  it("reads twice-yearly and quarter-of-formation schedules", () => {
    const twice = parseRRule("FREQ=YEARLY;BYMONTH=1,7;BYMONTHDAY=-1");
    expect(twice).toEqual({
      frequency: "semiannual",
      due: {
        type: "multi",
        dates: [
          { month: 1, day: 31 },
          { month: 7, day: 31 },
        ],
      },
    });
    expect(toRRule(twice.due, twice.frequency)).toEqual({ rrule: "FREQ=YEARLY;BYMONTH=1,7;BYMONTHDAY=-1" });
    const rule = "FREQ=YEARLY;BYMONTH=3,6,9,12;BYMONTHDAY=-1";
    const q = parseRRule(rule, "formation_quarter");
    expect(q.frequency).toBe("annual");
    expect(q.due).toMatchObject({ type: "multi", quarterOf: "formation" });
    expect(toRRule(q.due, q.frequency)).toEqual({ rrule: rule, anchor: "formation_quarter" });
    // Without the anchor the same months are a quarterly cycle.
    expect(parseRRule(rule).frequency).toBe("quarterly");
    expect(() => parseRRule("FREQ=YEARLY;BYMONTH=1,4,7,10;BYMONTHDAY=-1", "formation_quarter")).toThrow();
    expect(() => parseRRule("FREQ=YEARLY;BYMONTH=1,7;BYMONTHDAY=-1", "formation_quarter")).toThrow();
    expect(() => parseRRule("FREQ=YEARLY;BYMONTH=1,7;BYMONTHDAY=-1", "formation")).toThrow();
  });

  it("rejects unsupported rules", () => {
    for (const bad of [
      "FREQ=DAILY",
      "FREQ=MONTHLY;INTERVAL=2",
      "FREQ=MONTHLY;BYMONTHDAY=1",
      "FREQ=YEARLY;BYDAY=MO",
      "FREQ=YEARLY;BYMONTH=13;BYMONTHDAY=1",
      "FREQ=YEARLY;BYMONTH=5",
      "FREQ=YEARLY;INTERVAL=3;BYMONTH=5;BYMONTHDAY=1",
      "FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=15;BYMONTH=6",
    ])
      expect(() => parseRRule(bad), bad).toThrow();
  });
});

describe("schema reuse", () => {
  const patterns = (n: unknown): string[] =>
    !n || typeof n !== "object"
      ? []
      : Object.entries(n).flatMap(([k, v]) => (k === "pattern" && typeof v === "string" ? [v] : patterns(v)));

  it("writes dates, https URLs, state codes and rrules once, in common.schema.json", () => {
    const shared = [/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/, /^\^https:\/\/$/, /^\^\[A-Z\]\{2\}\$$/, /^\^FREQ=/];
    const files = fs.readdirSync(path.join(root, "schema")).filter((f) => f !== "common.schema.json");
    for (const f of files)
      for (const p of patterns(read(`schema/${f}`)))
        for (const re of shared) expect(p, `${f} repeats a shared pattern`).not.toMatch(re);
  });
});

describe("sourceUrl as a list", () => {
  it("accepts a non-empty list of https URLs", () => {
    const local = newAjv();
    local.addSchema(read("schema/local-item.schema.json"));
    const city = local.compile(read("schema/cities.schema.json"));
    const none = (sourceUrl: unknown) => [
      {
        city: "Olathe",
        status: "none",
        sourceUrl,
        note: "The city does not require a general business license.",
        counties: ["Johnson"],
        items: [],
        checkedOn: "2026-01-01",
      },
    ];
    expect(city(none("https://a.example/page"))).toBe(false);
    expect(city(none(["https://a.example/page", "https://b.example/page"]))).toBe(true);
    expect(city(none("https://a.example"))).toBe(false);
    expect(city(none([]))).toBe(false);
    expect(city(none(["http://a.example"]))).toBe(false);
  });
});
