# compliance-rules-engine

[![CI](https://github.com/Alisa007/compliance-rules-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/Alisa007/compliance-rules-engine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A TypeScript rules engine (no UI, no network, no I/O) that takes a description of a business and returns the legal
compliance items that apply: licenses, permits, registrations, filings, payments, insurance and recordkeeping, with
authorities, fees, deadlines and the next due date.

Currently covers the **United States** (federal, all 50 states and DC, and a growing set of cities). Other countries
are planned; the engine already selects rule packs by `country`.

> **Not legal or tax advice.** Rule data is maintained by hand. Annual-report fees and deadlines for every state were
> checked against official pages on 2026-10-13; everything else is compiled from public knowledge and flagged in each
> state's `verification` block. Fees, deadlines and thresholds change. Confirm with the cited authority.

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

| Field                                                                                             | Notes                                                                                                                                             |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entityType`                                                                                      | `sole_proprietorship`, `partnership`, `llc`, `pllc`, `lp`, `llp`, `c_corp`, `s_corp`, `pc`, `benefit_corp`, `nonprofit`                           |
| `zip`, `city`, `county`                                                                           | required; state is derived from ZIP unless `state` is given                                                                                       |
| `state`, `formationState`                                                                         | operating state, state of formation                                                                                                               |
| `multistate`                                                                                      | `[{ state, employeeCount?, hasProperty?, salesUsd? }]`; employees/property trigger registration, sales trigger economic-nexus sales tax           |
| `llcTaxClassification`, `sCorpElection`                                                           | federal tax treatment of LLC/PLLC, or S election for `pc`/`benefit_corp`                                                                          |
| `formationDate`, `fiscalYearEndMonth`                                                             | enable anniversary-based due dates; non-calendar fiscal years                                                                                     |
| `industry`                                                                                        | `general`, `retail`, `restaurant`, `construction`, `healthcare`, `real_estate`, `professional_services`, `transportation`, `alcohol`, `childcare` |
| `alcoholActivity`                                                                                 | required for `alcohol`: `manufacture`, `import`, `wholesale`, `retail`                                                                            |
| `commercialVehicles`                                                                              | required for `transportation`: `{ interstate, grossWeightLbs?, passengerCapacity?, carriesHazmat?, forHire? }`                                    |
| `employeeCount`, `annualPayroll`, `priorYearPayrollTaxLiability`                                  | payroll, workers' comp, paid leave/sick leave, deposit schedule                                                                                   |
| `largestContractorPaymentUsd`                                                                     | 1099-NEC when ≥ $2,000                                                                                                                            |
| `annualNetIncome`, `annualRevenue`                                                                | estimated tax; California LLC fee                                                                                                                 |
| `sellsTaxableGoods`, `homeBased`, `usesTradeName`, `isFormed`, `hasTaxExemptStatus`, `profession` | flags                                                                                                                                             |

## What is covered

- **Federal:** EIN, income tax return by tax treatment and fiscal year, estimated tax, payroll deposits and returns
  (941/940/W-2/I-9), 1099-NEC, nonprofit exemption, labor posters, TTB permits, USDOT.
- **State, all 50 + DC:** formation, registered agent, foreign qualification, annual/biennial reports (fee, deadline,
  next due), entity-level taxes, sales tax permit and economic nexus, unemployment insurance, withholding, new-hire
  reporting, workers' comp thresholds, paid leave and paid sick leave, general state licenses, DBA filing level, LLC
  publication, workplace notices, and industry licensing authorities.
- **City (seeded):** New York, San Francisco, Los Angeles, Chicago, Seattle, Portland, Philadelphia, Denver. Other
  cities return the state's typical local licensing regime, named for the city and county you pass in.

Intentionally not modelled yet: FinCEN beneficial ownership reporting (domestic companies were exempted in 2025),
per-profession licensing boards, cannabis, local sales-tax rates, and non-US countries. See the
[changelog](CHANGELOG.md) and [CONTRIBUTING](CONTRIBUTING.md) for how to extend.

## Extending

Rules are plain objects (`{ id, description, inputs, when(profile), items(profile) }`):

```ts
import { evaluate, defaultRules } from "compliance-rules-engine";
evaluate(profile, { rules: [...defaultRules, myRule] });
```

State data lives in [`data/states/*.json`](data/states), validated by
[`schema/state.schema.json`](schema/state.schema.json); city seeds in [`data/local.json`](data/local.json).

## Versioning

Semver, with a data-aware policy: a correction to a fee, deadline or authority is a **patch**; new states/rules/items
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
