# compliance-rules-engine

> Currently covers the United States only; other countries are planned.

A TypeScript rules engine (no UI, no I/O) that takes a description of a US business and returns the legal compliance items that likely apply: licenses, permits, registrations, filings, payments, insurance and recordkeeping.

```ts
import { getComplianceItems } from "compliance-rules-engine";

const items = getComplianceItems({
  entityType: "llc",
  zip: "94105",
  hasEmployees: true,
  sellsTaxableGoods: true,
  annualRevenue: 400_000,
});

// [{ id, title, category, jurisdiction, authority, state?, description,
//    frequency, deadline?, reason, needsVerification, url? }, ...]
```

## Input (`BusinessProfile`)

| Field | Notes |
| --- | --- |
| `entityType` | `sole_proprietorship`, `partnership`, `llc`, `c_corp`, `s_corp`, `nonprofit` |
| `zip` | 5-digit ZIP; state is derived from it unless `state` is given |
| `state`, `formationState`, `otherStates` | operating state, state of formation, other states with activity |
| `llcTaxClassification` | `disregarded` (default), `partnership`, `s_corp`, `c_corp` |
| `industry` | `general`, `retail`, `restaurant`, `construction`, `healthcare`, `real_estate`, `professional_services`, `transportation`, `alcohol`, `childcare` |
| `hasEmployees`, `paysContractors`, `sellsTaxableGoods`, `homeBased`, `usesTradeName`, `isFormed`, `hasTaxExemptStatus`, `annualRevenue` | booleans / number |

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

- Not legal advice. State data was compiled by hand and has not been checked against primary sources; fees, deadlines and thresholds change, so confirm against the linked agency before relying on them. Items with `needsVerification: true` are best-effort pointers.
- ZIP→state uses 3-digit prefix ranges and can be wrong near borders; pass `state` when known.
- Local (city/county) items describe how each state typically licenses businesses; there is no city-level database yet.
- Rules are US-only for now; non-US jurisdictions are planned.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```
