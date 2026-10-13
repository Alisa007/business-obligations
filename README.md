# us-compliance-engine

A TypeScript rules engine (no UI, no I/O) that takes a description of a US business and returns the legal compliance items that likely apply: licenses, permits, registrations, filings, payments, insurance and recordkeeping.

```ts
import { getComplianceItems } from "us-compliance-engine";

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
import { getComplianceItems, defaultRules } from "us-compliance-engine";
getComplianceItems(profile, { rules: [...defaultRules, myRule] });
```

Rules live in `src/rules/` (`federal`, `state`, `industry`, `local`).

## Caveats

- Not legal advice. Items with `needsVerification: true` are best-effort pointers that must be confirmed with the authority.
- ZIP→state uses 3-digit prefix ranges and can be wrong near borders; pass `state` when known.
- State annual-report specifics are encoded for CA, DE, TX, NY, FL, WA, GA, IL, NV, CO; other states return a "check requirements" item. City/county rules are generic placeholders keyed on ZIP — no local database yet.
- Thresholds and deadlines change; review rules against current law before relying on them.

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```
