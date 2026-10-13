// One-off migration: derive structured `feeDetail` (and `lateFee`) from the free-text fee strings.
// Re-runnable; review the diff. Usage: node scripts/migrate-fees.mjs
import fs from "node:fs";

const dir = new URL("../data/states/", import.meta.url);
const num = (s) => Number(s.replace(/,/g, ""));
const money = (s) => {
  const m = /\$([\d,]+(?:\.\d+)?)/.exec(s);
  return m ? num(m[1]) : undefined;
};

export function parseFee(fee) {
  const f = fee.trim();
  let m;
  if (/^(free|no state fee)$/i.test(f)) return { basis: "none", amount: 0 };
  if (/^no filing fee/i.test(f)) return { basis: "none", amount: 0, note: f };
  if (/^waived if filed by/i.test(f)) return { basis: "flat", amount: 0, waived: true, note: f };
  if (/^per secretary of state fee schedule/i.test(f)) return { basis: "varies", note: f };
  if ((m = /^\$([\d,.]+) base, plus \$([\d,.]+) per member over (\d+) \(maximum \$([\d,]+)\)/i.exec(f)))
    return {
      basis: "per_member",
      amount: num(m[1]),
      perUnit: num(m[2]),
      freeUnits: Number(m[3]),
      min: num(m[1]),
      max: num(m[4]),
    };
  if (
    (m =
      /^\$([\d,.]+) per (partner|general partner)(?: \([^)]*\))?(?: \(minimum \$([\d,]+), maximum \$([\d,]+)\))?(?:; form [^)]*\))?/i.exec(
        f,
      )) ||
    /^\$[\d,.]+ per partner/.test(f)
  ) {
    const mm = /^\$([\d,.]+) per (?:general )?partner/.exec(f);
    const min = /minimum \$([\d,]+)/.exec(f);
    const max = /maximum \$([\d,]+)/.exec(f);
    const o = { basis: "per_partner", perUnit: num(mm[1]) };
    if (min) o.min = num(min[1]);
    if (max) o.max = num(max[1]);
    if (/best estimate/.test(f)) o.estimate = true;
    if (/plus \$7 annual report/.test(f)) o.note = "plus $7 annual report";
    return o;
  }
  if ((m = /^\$([\d,.]+) plus \$([\d,.]+) (?:for each|per) partner added \(maximum \$([\d,]+)\)/i.exec(f)))
    return {
      basis: "per_partner",
      amount: num(m[1]),
      perUnit: num(m[2]),
      max: num(m[3]),
      note: "per partner added",
    };
  if (/^license fee: 0\.1%/i.test(f)) return { basis: "percent", min: 25, note: f };
  if (/^occupation tax by paid-in capital/i.test(f)) return { basis: "varies", min: 26, note: f };
  if (/^franchise tax \(from \$175/i.test(f)) return { basis: "varies", min: 175, note: f };
  if (/^\$60 minimum license tax/i.test(f))
    return { basis: "varies", min: 60, note: "greater of $60 or 0.0002 of Wyoming assets" };
  if ((m = /^\$([\d,.]+) online \(\$([\d,.]+) (?:paper|by mail)\)/i.exec(f)))
    return {
      basis: "flat",
      amount: num(m[2]) < num(m[1]) && /by mail/.test(f) ? num(m[2]) : num(m[1]),
      online: num(m[1]),
      paper: num(m[2]),
    };
  if ((m = /^\$([\d,.]+) \(\$([\d,.]+) (?:if filed )?(?:electronically|online)/i.exec(f)))
    return {
      basis: "flat",
      amount: num(m[1]),
      online: num(m[2]),
      ...(/including service charge/.test(f) ? { note: "online amount includes a service charge" } : {}),
    };
  if ((m = /^\$([\d,.]+) \(\$([\d,.]+) online\)/i.exec(f)))
    return { basis: "flat", amount: num(m[1]), online: num(m[2]) };
  if ((m = /^\$([\d,.]+) online \(plus/i.exec(f)))
    return { basis: "flat", amount: num(m[1]), online: num(m[1]), note: f };
  if ((m = /^\$([\d,.]+) \((?:online)\)$/i.exec(f)))
    return { basis: "flat", amount: num(m[1]), online: num(m[1]) };
  if ((m = /^\$([\d,.]+) if filed .*; \$([\d,.]+) after/i.exec(f)))
    return { basis: "flat", amount: num(m[1]), note: f };
  const a = money(f);
  if (a !== undefined) {
    const o = { basis: "flat", amount: a };
    if (/minimum/i.test(f) && !/per /i.test(f)) o.min = a;
    if (f.length > String(f.match(/^\$[\d,.]+/)?.[0] ?? "").length) o.note = f;
    return o;
  }
  return { basis: "varies", note: f };
}

// Late fees researched from official pages (flat amount unless noted).
const LATE = {
  FL: {
    llc: { amount: 400, note: "Added to the annual report after May 1; no provision to waive" },
    corp: { amount: 400, note: "Profit corporations only; added after May 1" },
  },
  CO: { both: { amount: 50, note: "Late filing penalty on the periodic report" } },
  ME: { both: { amount: 50, note: "Added when the annual report is received after June 1" } },
  NH: { both: { amount: 50, note: "Added to reports received after April 1" } },
  SD: { both: { amount: 55, note: "Fee for delinquent annual reports" } },
  WV: { both: { amount: 50, note: "Statutory late fee that the office cannot waive" } },
  WA: { both: { amount: 25, note: "Delinquency fee after the expiration date (not for nonprofits)" } },
  DE: {
    both: { amount: 200, percentPerMonth: 1.5, note: "Plus 1.5% per month interest on the tax and penalty" },
  },
  RI: { both: { amount: 25, note: "Penalty when filed more than 30 days late" } },
  HI: { both: { amount: 10, note: "Per year delinquent" } },
  IL: { llc: { amount: 100, note: "When filed more than 60 days after the due date" } },
  NV: { both: { amount: 175, note: "$75 list penalty plus $100 business license penalty" } },
  GA: { both: { amount: 25, note: "Penalty for late annual registration" } },
  MT: { both: { amount: 35, note: "Fee after April 15 (fee is waived before then)" } },
  VA: { llc: { amount: 25, note: "Penalty when the fee is not received by the due date" } },
};

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".json")) continue;
  const p = new URL(f, dir);
  const s = JSON.parse(fs.readFileSync(p, "utf8"));
  const L = LATE[s.code];
  for (const k of ["llcReport", "corpReport", "lpReport", "llpReport"]) {
    const r = s[k];
    if (!r) continue;
    r.feeDetail = parseFee(r.fee);
    delete r.lateFee;
    if (L) {
      const pick = L.both ?? (k === "llcReport" || k === "llpReport" || k === "lpReport" ? L.llc : L.corp);
      if (pick) r.lateFee = pick;
    }
  }
  if (s.businessLicense) s.businessLicense.feeDetail = parseFee(s.businessLicense.fee);
  fs.writeFileSync(p, JSON.stringify(s, null, 2) + "\n");
}
