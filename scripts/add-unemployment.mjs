// One-off: adds `unemployment` (taxable wage base, rate range, new-employer rate) to each state file.
// Source: U.S. DOL, Significant Provisions of State Unemployment Insurance Laws, effective January 2026.
// https://oui.doleta.gov/unemploy/content/sigpros/2020-2029/January2026.pdf
import { readFileSync, writeFileSync } from "node:fs";

// code: [wageBase, minRate, maxRate, newEmployerRate | null (industry average)]
const T = {
  AL: [8000, 0.2, 5.4, 2.7], AK: [54200, 1.0, 5.4, 1.0], AZ: [8000, 0.03, 8.36, 2.0], AR: [7000, 0.1, 6.0, 1.8],
  CA: [7000, 1.5, 6.2, 3.4], CO: [30600, 0.56, 7.34, 1.53], CT: [27000, 0.1, 10.0, 1.9], DE: [14500, 0.4, 5.4, 1.0],
  DC: [9000, 1.9, 7.4, 2.7], FL: [7000, 0.1, 5.4, 2.7], GA: [9500, 0.04, 8.1, 2.64], HI: [64500, 0.0, 5.6, 2.4],
  ID: [58300, 0.208, 5.4, 1.0], IL: [14250, 0.2, 6.5, 2.8], IN: [9500, 0.5, 7.4, 2.5], IA: [20400, 0.0, 5.4, 1.0],
  KS: [15100, 0.0, 6.95, 1.75], KY: [12000, 0.3, 9.0, 2.7], LA: [7000, 0.09, 6.0, null], ME: [12000, 0.0, 6.29, 2.23],
  MD: [8500, 0.3, 7.5, 2.6], MA: [15000, 0.94, 14.37, 2.42], MI: [9500, 0.06, 10.3, 2.7], MN: [44000, 0.4, 9.3, null],
  MS: [14000, 0.0, 5.4, 1.0], MO: [9000, 0.0, 6.0, 2.376], MT: [47300, 0.0, 6.12, null], NE: [24000, 0.0, 5.4, 1.25],
  NV: [43700, 0.25, 5.4, 2.95], NH: [14000, 0.1, 7.0, 2.7], NJ: [44800, 0.5, 5.8, 2.8], NM: [34800, 0.33, 5.4, null],
  NY: [17600, 2.025, 9.825, 4.025], NC: [34200, 0.06, 5.76, 1.0], ND: [46600, 0.07, 9.67, 1.0], OH: [9000, 0.4, 10.1, 2.7],
  OK: [25000, 0.2, 5.8, 1.5], OR: [56700, 0.9, 5.4, 2.4], PA: [10000, 0.75, 8.95, 3.822], RI: [30800, 0.69, 9.19, 1.0],
  SC: [14000, 0.0, 5.4, 1.0], SD: [15000, 0.0, 8.52, 1.2], TN: [7000, 0.01, 10.0, 2.7], TX: [9000, 0.32, 6.32, 2.7],
  UT: [50700, 0.2, 7.2, null], VT: [15400, 0.4, 5.4, 1.0], VA: [8000, 0.1, 6.2, 2.5], WA: [78200, 0.0, 5.4, null],
  WV: [9500, 1.5, 7.5, 2.7], WI: [14000, 0.0, 10.7, 2.5], WY: [33800, 0.1, 8.5, null],
};
const NOTES = {
  RI: "New employer rate excludes the 0.21% Job Development Assessment; the wage base is $32,300 for employers at the highest rate.",
  OH: "Construction employers' new-employer rate differs from the general rate.",
  AK: "Employees also contribute; the 1.00% minimum applies to employers.",
  ND: "New construction employers pay a different new-employer rate.",
};
for (const [code, [wageBase, minRate, maxRate, newRate]] of Object.entries(T)) {
  const f = `data/states/${code}.json`;
  const d = JSON.parse(readFileSync(f, "utf8"));
  d.unemployment = {
    wageBase,
    minRate,
    maxRate,
    newEmployerRate: newRate,
    ...(NOTES[code] ? { note: NOTES[code] } : {}),
    year: 2026,
  };
  writeFileSync(f, JSON.stringify(d, null, 2) + "\n");
}
