# compliance-rules-engine

> Currently covers the United States only; other countries are planned.

A TypeScript rules engine (no UI, no I/O) that takes a description of a US business and returns the legal compliance items that likely apply: licenses, permits, registrations, filings, payments, insurance and recordkeeping.

```ts
import { getComplianceItems } from "compliance-rules-engine";

const items = getComplianceItems({
  entityType: "llc",
  zip: "94105",
  city: "San Francisco",
  county: "San Francisco",
  employeeCount: 4,
  annualPayroll: 320_000,
  sellsTaxableGoods: true,
  annualRevenue: 400_000,
});

// [{ id, title, category, jurisdiction, authority, state?, description,
//    frequency, deadline?, reason, url? }, ...]
```

Output is a pure function of the input: every item is either returned or not. Where an obligation depends on a fact (headcount, payroll, activity in another state, what the business does with alcohol, vehicle weight), that fact is an input; missing required inputs throw `InvalidProfileError`.

## Input (`BusinessProfile`)

| Field | Notes |
| --- | --- |
| `entityType` | `sole_proprietorship`, `partnership`, `llc`, `c_corp`, `s_corp`, `nonprofit` |
| `zip`, `city`, `county` | required; state is derived from ZIP unless `state` is given; city/county name the local authorities |
| `state`, `formationState` | operating state, state of formation |
| `multistate` | `[{ state, employeeCount?, hasProperty?, salesUsd? }]` — employees/property trigger registration; sales trigger economic-nexus sales tax registration |
| `llcTaxClassification` | `disregarded` (default), `partnership`, `s_corp`, `c_corp` |
| `industry` | `general`, `retail`, `restaurant`, `construction`, `healthcare`, `real_estate`, `professional_services`, `transportation`, `alcohol`, `childcare` |
| `alcoholActivity` | required when industry is `alcohol`: `manufacture`, `import`, `wholesale`, `retail` |
| `commercialVehicles` | required when industry is `transportation`: `{ interstate, grossWeightLbs?, passengerCapacity?, carriesHazmat?, forHire? }` |
| `employeeCount`, `annualPayroll`, `priorYearPayrollTaxLiability` | drive payroll, workers' comp (state thresholds), paid leave and deposit schedule |
| `largestContractorPaymentUsd` | 1099-NEC when ≥ $2,000 |
| `annualNetIncome`, `annualRevenue` | estimated tax; California LLC fee |
| `sellsTaxableGoods`, `homeBased`, `usesTradeName`, `isFormed`, `hasTaxExemptStatus` | booleans |

## Extending

Rules are plain objects (`{ id, when(profile), items(profile) }`). Add your own:

```ts
import { getComplianceItems, defaultRules } from "compliance-rules-engine";
getComplianceItems(profile, { rules: [...defaultRules, myRule] });
```

Rules live in `src/rules/` (`federal`, `state`, `industry`, `local`).

## State coverage

All 50 states and DC have dedicated data in `src/data/` (no generic fallbacks): the entity filing agency, LLC and corporate annual/biennial report (fee and deadline), entity-level taxes, revenue and unemployment agencies, sales tax permit name (or the alternative regime for AK, DE, MT, NH, OR), workers' comp agency and threshold (including monopolistic state funds), wage withholding, mandatory paid-leave programs, general state business licenses, publication requirements (NY, AZ), local licensing, and industry licensing authorities (contractor, real estate, alcohol, child care, health). A test enforces completeness for every state.

## Caveats

- Not legal advice. State data was compiled by hand and has not been checked against primary sources; fees, deadlines and thresholds change, so confirm against the linked agency before relying on them.
- ZIP→state uses 3-digit prefix ranges and can be wrong near borders; pass `state` when known.
- Local items name the city/county and the state's typical local licence, but there is no city-level ordinance database, so local fees and exact permit names are not returned.
- State income-tax nexus is modelled as physical presence (employees or property); sales-tax nexus also uses each state's economic threshold.
- Federal estimated-tax applicability is approximated from `annualNetIncome`.
- Rules are US-only for now; non-US jurisdictions are planned.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```
