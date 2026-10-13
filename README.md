# compliance-rules-engine

[![CI](https://github.com/Alisa007/compliance-rules-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/Alisa007/compliance-rules-engine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A TypeScript rules engine (no UI, no network, no I/O) that takes a description of a business and returns the legal
compliance items that apply: licenses, permits, registrations, filings, payments, insurance and recordkeeping, with
authorities, fees, deadlines and the next due date.

Currently covers the **United States** (federal, all 50 states and DC, and a growing set of cities). Other countries
are planned; the engine already selects rule packs by `country`.

> **Not legal or tax advice.** Rule data is maintained by hand. On 2026-10-13 the entity annual/biennial report fee and
> deadline, workers' compensation thresholds, DBA filing level and LP/LLP reporting were checked for every state against
> web search results (official agency pages where available). Anything not confirmed is listed in that state's
> `verification.unconfirmed`, and everything else is compiled from public knowledge. Fees, deadlines and thresholds
> change. Confirm with the cited authority.

## Install

```sh
npm install compliance-rules-engine
```

ESM and CommonJS are both supported. Node 18+.

## Use

```ts
import { evaluate } from "compliance-rules-engine";

const { items, disclaimer } = evaluate(
  {
    entityType: "llc",
    zip: "94105",
    city: "San Francisco",
    county: "San Francisco",
    formationDate: "2022-03-10",
    employeeCount: 4,
    annualPayroll: 320_000,
    sellsTaxableGoods: true,
    annualRevenue: 400_000,
  },
  { asOf: "2026-10-12" },
);

// items[n]: { id, title, category, jurisdiction, authority, state?, description,
//             frequency, deadline?, due?, nextDue?, reason, url? }
```

`getComplianceItems(profile)` returns just the array. The output is a pure function of the input (and `asOf`): an item
is either returned or not. When an obligation depends on a fact (headcount, payroll, activity in another state, what
the business does with alcohol, vehicle weight), that fact is an input, and a missing required input throws
`InvalidProfileError`.

### Only have a ZIP?

```ts
import { evaluate } from "compliance-rules-engine";
import { withZip } from "compliance-rules-engine/zip"; // bundles ~41k US ZIP codes (1.3 MB)

evaluate(withZip({ entityType: "llc", zip: "60601", employeeCount: 2 }));
```

The `zip` subpath is separate so the core stays small. The core's `stateFromZip` uses 3-digit prefixes and can be wrong
near state borders; `lookupZip` is exact.

### Output stability

Item `id`s are stable and have the form `rule.id[:STATE][:key][#n]`, so you can key UI state or reminders on them. Rules
are introspectable with `listRules()`, which returns each rule's id, description and the profile fields it reads.

## Input (`BusinessProfile`)

Machine-readable: [`schema/business-profile.schema.json`](schema/business-profile.schema.json).

| Field                                                                                             | Notes                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entityType`                                                                                      | `sole_proprietorship`, `partnership`, `llc`, `pllc`, `lp`, `llp`, `c_corp`, `s_corp`, `pc`, `benefit_corp`, `nonprofit`                                       |
| `zip`, `city`, `county`                                                                           | required; state is derived from ZIP unless `state` is given                                                                                                   |
| `state`, `formationState`                                                                         | operating state, state of formation                                                                                                                           |
| `multistate`                                                                                      | `[{ state, employeeCount?, hasProperty?, salesUsd? }]`; employees/property trigger registration, sales trigger economic-nexus sales tax                       |
| `llcTaxClassification`, `sCorpElection`                                                           | federal tax treatment of LLC/PLLC, or S election for `pc`/`benefit_corp`                                                                                      |
| `formationDate`, `fiscalYearEndMonth`                                                             | enable anniversary-based due dates; non-calendar fiscal years                                                                                                 |
| `industry`                                                                                        | `general`, `retail`, `restaurant`, `construction`, `healthcare`, `real_estate`, `professional_services`, `transportation`, `alcohol`, `childcare`, `cannabis` |
| `alcoholActivity`                                                                                 | required for `alcohol`: `manufacture`, `import`, `wholesale`, `retail`                                                                                        |
| `cannabisActivity`                                                                                | required for `cannabis`: `cultivation`, `manufacturing`, `retail`, `distribution`, `testing`                                                                  |
| `commercialVehicles`                                                                              | required for `transportation`: `{ interstate, grossWeightLbs?, passengerCapacity?, carriesHazmat?, forHire? }`                                                |
| `employeeCount`, `annualPayroll`, `priorYearPayrollTaxLiability`                                  | payroll, workers' comp, paid leave/sick leave, deposit schedule                                                                                               |
| `largestContractorPaymentUsd`                                                                     | 1099-NEC when ≥ $2,000                                                                                                                                        |
| `annualNetIncome`, `annualRevenue`                                                                | estimated tax; California LLC fee                                                                                                                             |
| `sellsTaxableGoods`, `homeBased`, `usesTradeName`, `isFormed`, `hasTaxExemptStatus`, `profession` | flags                                                                                                                                                         |

## What is covered

- **Federal:** EIN, income tax return by tax treatment and fiscal year, estimated tax, payroll deposits and returns
  (941/940/W-2/I-9), 1099-NEC, nonprofit exemption, labor posters, TTB permits, USDOT, cannabis tax/regulatory status.
- **State, all 50 + DC:** formation, registered agent, foreign qualification, annual/biennial reports with fee,
  deadline and next due date (separate rules for LLCs, corporations, LPs and LLPs), entity-level taxes, sales tax
  permit, economic nexus and local-sales-tax administration, unemployment insurance, withholding, new-hire reporting,
  workers' comp thresholds (including hours and payroll tests), paid leave and paid sick leave, general state
  licenses, DBA filing level and office, LLC publication, workplace notices, professional boards (attorney, CPA,
  physician, architect, engineer) and industry licensing authorities including cannabis regulators.
- **City (seeded):** New York, San Francisco, Los Angeles, San Diego, San José, Oakland, Chicago, Seattle, Portland,
  Philadelphia, Denver, Boston, Atlanta, Miami, Detroit, Columbus, Cleveland, Cincinnati, Pittsburgh, Louisville,
  Kansas City, St. Louis, Baltimore, New Orleans, Las Vegas, Phoenix. Other cities return the state's typical local
  licensing regime, named for the city and county you pass in.

Intentionally not modelled: FinCEN beneficial ownership reporting (domestic companies were exempted in 2025), local
sales-tax _rates_, professions beyond the five bundled directories (use `profession: "other"`), and non-US countries.
Each state file records what was checked and what was not in its `verification` block.

## Rule versions and upcoming changes

Rules change. The library tracks dated changes so users can prepare:

- **`RULESET_VERSION`** (`YYYY.MM.DD-n`) identifies the bundled rules and data; every result carries it as
  `rulesetVersion`, next to `dataVersion` (the date of the last data review).
- **`asOf`** resolves rules _as of a date_. Enacted changes that have taken effect by then are applied to the data, so
  `evaluate(profile, { asOf: "2027-07-01" })` shows obligations as they will be on that date.
- **`upcomingChanges`** on the result (and on each affected item) lists changes that take effect after `asOf`,
  soonest first; **`recentChanges`** lists those that took effect in the last year (`recentDays`).
- **`previewChanges(profile, { to })`** diffs the obligations between today and a future date: items added, removed
  and changed, plus the changes in between.
- **`listChanges({ state, from, to, status })`** browses the registry (`data/changes.json`).

```ts
import { evaluate, previewChanges } from "compliance-rules-engine";

const now = evaluate(profile);
now.upcomingChanges; // [{ id, effective, status: "enacted" | "proposed", kind, summary, source }]

const diff = previewChanges(profile, { to: "2027-07-01" });
diff.changed; // [{ id, title, fields: { description: { before, after } } }]
```

Changes marked `proposed` are reported but never applied. You can pass your own with `evaluate(profile, { changes })`.
Past changes are informational: the bundled data already reflects them.

## Costs, calendar, provenance and sensitivity

```ts
import { evaluate, estimateCosts, buildCalendar, toICS, analyzeInputs } from "compliance-rules-engine";

const result = evaluate(profile);
result.items[0].cost; // { basis: "flat", amount: 300, online: 300, currency: "USD", ... }
result.items[0].penalty; // { amount: 50, note: "...", currency: "USD" }
result.items[0].provenance; // { confidence: "checked", checkedOn: "2026-..", sources: ["https://..."] }

estimateCosts(result.items, { ownerCount: 3, channel: "online" });
// { annual, oneTime, lines: [...], unknown: [...] }   (percentage-based fees are listed under `unknown`)

const { events } = buildCalendar(profile, { from: "2026-01-01", to: "2027-12-31" });
const ics = toICS(events); // save as .ics and import into any calendar app

analyzeInputs(profile);
// { defaultsUsed: [{ field: "employeeCount", value: 0, affectsResult: true, rules: [...] }],
//   sensitivity: [{ field: "employeeCount", current: 0, changes: [{ value: 1, added: [...], removed: [] }] }] }
```

- `cost` and `penalty` are structured; `estimateCosts` multiplies by frequency (biennial = 0.5 per year, and so on)
  and applies per-member / per-partner rules using `ownerCount`.
- `provenance.confidence` is `checked` when the underlying fields were confirmed against official pages,
  `unconfirmed` when the state's verification block lists them, and `compiled` otherwise.
- `buildCalendar` includes only items with a machine-readable due rule; items such as "15th of the following month"
  deposits are not expanded.
- `analyzeInputs` tells you which questions are worth asking: defaulted inputs that would change the result.

## Extending

Rules are plain objects (`{ id, description, inputs, when(profile), items(profile) }`):

```ts
import { evaluate, defaultRules } from "compliance-rules-engine";
evaluate(profile, { rules: [...defaultRules, myRule] });
```

State data lives in [`data/states/*.json`](data/states), validated by
[`schema/state.schema.json`](schema/state.schema.json); city seeds in [`data/local.json`](data/local.json).

## Versioning

Semver for the package, plus `RULESET_VERSION` for the rules and data (see above). Policy: a correction to a fee, deadline or authority is a **patch**; new states/rules/items
or new optional inputs are **minor**; removed or renamed items, ids or required inputs are **major**. `DATA_VERSION`
reports the date the bundled data was last reviewed.

## Development

```sh
npm install
npm run check   # typecheck, lint, format check, tests
npm run build
```

## License

[MIT](LICENSE). The bundled ZIP dataset derives from [GeoNames](https://www.geonames.org) (CC BY 4.0); see
[NOTICE](NOTICE).
