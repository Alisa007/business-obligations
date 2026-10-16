<h1 align="center">business-obligations</h1>

<p align="center">
  <b>What licenses, permits, filings and deadlines does a US business need? Describe the business, get the list, in order.</b>
</p>

<p align="center">
  <a href="https://github.com/Alisa007/business-obligations/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Alisa007/business-obligations/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://www.npmjs.com/package/business-obligations"><img alt="npm version" src="https://img.shields.io/npm/v/business-obligations.svg" /></a>
  <a href="https://www.npmjs.com/package/business-obligations"><img alt="npm downloads" src="https://img.shields.io/npm/dm/business-obligations.svg" /></a>
  <img alt="Node 20+" src="https://img.shields.io/node/v/business-obligations.svg" />
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg" /></a>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6.svg" />
  <img alt="Zero dependencies" src="https://img.shields.io/badge/dependencies-0-brightgreen.svg" />
  <a href="https://alisa007.github.io/business-obligations/"><img alt="Live demo" src="https://img.shields.io/badge/demo-try%20it%20in%20your%20browser-1f5f4a.svg" /></a>
  <img alt="Jurisdictions" src="https://img.shields.io/badge/jurisdictions-50%20states%20%2B%20DC-informational.svg" />
</p>

**[Try it in your browser](https://alisa007.github.io/business-obligations/)**: no install; the plan is computed in your browser.

<!-- Add a short GIF or screenshot of the playground here, e.g. docs/playground.gif:
<p align="center"><img alt="Playground: an LLC in Austin gets an ordered plan of filings, licenses and deadlines" src="docs/playground.gif" width="720" /></p>
-->

**Built for** formation and compliance tools, accounting and payroll software, SaaS onboarding flows, and anyone who
needs "what does this business owe, to whom, and by when?" as data rather than a pile of agency pages.

Starting or running a business in the US means a pile of obligations spread over the IRS, 50 state agencies and your
city: formation, EIN, state tax accounts, licenses, annual reports, payroll filings, insurance. They depend on the
entity type, the state, headcount, industry and more, and the answers live in dozens of scattered agency pages.

This library puts that knowledge in one pure TypeScript function. No network, no I/O, no account, no API key: the
same profile always gives the same answer, so you can test it, cache it and run it anywhere (Node, browsers, edge).

```ts
import { evaluate } from "business-obligations";

const { items } = evaluate({
  entityType: "llc",
  zip: "60601",
  city: "Chicago",
  county: "Cook",
  industry: "restaurant",
  employeeCount: 6,
});
// items[0] -> {
//   id: "fed.ein",
//   title: "Obtain an Employer Identification Number (EIN)",
//   authority: "IRS", jurisdiction: "federal", category: "registration",
//   reason: "...", provenance: { confidence: "compiled", sources: [...] }
// }
```

## What you get

| You want                                    | Use                                                         |
| ------------------------------------------- | ----------------------------------------------------------- |
| Everything that applies to a business       | `evaluate(profile)`                                         |
| An ordered plan to **open** a business      | `planLaunch(profile, { startDate, openingDate })`           |
| A year of dated deadlines, as an `.ics`     | `buildCalendar(profile, { from, to })` + `toICS(events)`    |
| What it will cost in government fees        | `estimateCosts(items, { profile })`                         |
| What changes if you hire, expand or convert | `explainTransition(profile, { type: "hire", count: 3 })`    |
| Which unanswered question matters           | `analyzeInputs(profile)`                                    |
| What changes in the law next, and when      | `previewChanges(profile, { to })`, `result.upcomingChanges` |
| How to **close** a business                 | set `dissolutionDate`                                       |
| Output in another language                  | `localize(result, catalog)`                                 |
| The command line                            | `npx business-obligations --zip 78701 --entity llc`         |

Each item also carries a `provenance.reviewBy` date and `stale` flag, per-source archive links, a stable
`jurisdictionId` (for example `US-TX/city/austin`) and a `feedbackUrl` that opens a pre-filled correction issue. Where
the trigger is a number, `appliesWhen` and `exemptions` state it.

Every item says **why** it applies (`reason`), **who** to deal with (`authority`, `url`), **when** (`nextDue`),
**how much** (`cost`, `penalty`) and **how sure we are** (`provenance`: checked, compiled or unconfirmed, with sources).

## Try it

- **In the browser:** the [playground](https://alisa007.github.io/business-obligations/) runs the library locally
  in your browser. If analytics is enabled on the hosted site, the details you enter are sent when you generate a
  plan (see [Analytics on the playground](#analytics-on-the-playground)).
- **From the terminal:**
  ```sh
  npx business-obligations launch --zip 60601 --entity llc --employees 3 --start 2026-11-02 --opening 2027-02-01
  ```
- **In code:** `npm install business-obligations`, then see [`examples/`](packages/core/examples).

## Why trust it (and when not to)

- **Honest about its confidence.** Each state records what was checked against official pages and on what date; what
  could not be confirmed is listed, not hidden. See [COVERAGE.md](packages/core/COVERAGE.md) for where that is recorded in the JSON.
- **Specific, not generic.** All 50 states and DC have their own filing agency, report fees and deadlines, unemployment
  insurance parameters, workers' compensation triggers and licensing authorities. Twenty-six cities are seeded
  with local requirements; the rest get the state's local licensing regime.
- **Cited to the page that matters.** Every item's `url` is the agency page for that obligation (for example the
  state's employer registration page), not a home page, and a weekly job checks the links.
- **Derivable.** If an obligation depends on a fact (headcount, payroll, activity in another state), that fact is an
  input. There is no hidden "maybe"; a missing required input throws.
- **Versioned law.** Dated rule changes are bundled, so you can see what changes next quarter and prepare.
- **Not legal or tax advice.** Rules change and local nuance is endless. Treat the output as a well-sourced checklist
  to confirm with the cited authority or a professional.

## Contributing

The most valuable contributions are **data**: correct a fee, add a city, add an industry. No code is needed for most of
them. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the issues labelled
[`good first issue`](https://github.com/Alisa007/business-obligations/labels/good%20first%20issue).

## Install

```sh
npm install business-obligations
```

ESM and CommonJS are both supported. Node 20+. About 115 KB gzipped, no runtime dependencies.

## Using it from plain JavaScript

TypeScript is optional. The package ships compiled JavaScript (ESM and CommonJS) plus type declarations that editors
like VS Code use for autocomplete, even in `.js` files.

```js
// CommonJS
const { evaluate, validateProfile } = require("business-obligations");
// ESM
import { evaluate, validateProfile } from "business-obligations";

const profile = { entityType: "llc", zip: "78701", city: "Austin", county: "Travis", employeeCount: 2 };

const problems = validateProfile(profile); // [] when the profile is well formed
const { items } = evaluate(profile);
```

Without a compiler, typos would otherwise pass silently, so profiles are checked at runtime. `evaluate` throws an
`InvalidProfileError` listing every problem at once, with a suggestion where one is close:

```js
evaluate({ entityType: "LLC", zip: "78701", city: "Austin", county: "Travis", employes: 5 });
// InvalidProfileError: `entityType` must be one of sole_proprietorship, ..., llc, ...; got "LLC" (try "llc");
//   Unknown field `employes`; did you mean `employeeCount`?
// error.issues -> [{ field: "entityType", message, suggestion: "llc" }, { field: "employes", ... }]
```

`validateProfile(profile)` returns the same issues without throwing, which suits form handlers. For other languages,
[`schema/business-profile.schema.json`](packages/core/schema/business-profile.schema.json) and
[`schema/compliance-result.schema.json`](packages/core/schema/compliance-result.schema.json) describe the input and output.
Runnable versions: [`examples/quickstart.cjs`](packages/core/examples/quickstart.cjs) and the `.mjs` examples.

## Core API

### Evaluate

```ts
import { evaluate } from "business-obligations";

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
import { evaluate } from "business-obligations";
import { withZip } from "business-obligations/zip"; // bundles ~41k US ZIP codes (1.3 MB)

evaluate(withZip({ entityType: "llc", zip: "60601", employeeCount: 2 }));
```

The `zip` subpath is separate so the core stays small. The core's `stateFromZip` uses 3-digit prefixes and can be wrong
near state borders; `lookupZip` is exact.

### Date format

Every machine-readable date, in input and output, is ISO 8601 `YYYY-MM-DD` and must be a real calendar date
(`2026-02-30` is rejected): `formationDate`, `dissolutionDate`, `asOf`, `nextDue`, calendar `date`, `checkedOn`,
change `effective`. Human-readable `deadline` text spells the month out ("April 15", or "April 15, 2027" for one
specific date). `rulesetVersion` is `YYYY-MM-DD.n`. A test enforces all of this across the data and the output.

### Output stability

Item `id`s are stable and have the form `rule.id[:STATE][:key][#n]`, so you can key UI state or reminders on them. Rules
are introspectable with `listRules()`, which returns each rule's id, description and the profile fields it reads.

## Input (`BusinessProfile`)

Machine-readable: [`schema/business-profile.schema.json`](packages/core/schema/business-profile.schema.json).

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
- **City (seeded):** the 300 largest US cities (2020 census, ranks beyond 100 approximate) are all covered, in `data/cities/<STATE>.json`: some
  with city-specific taxes and licenses, some checked and found to have no general city license or tax
  (`status: "none"`), and some researched but not confirmed from an official page (`status: "unverified"`).
  The JSON in [`data/cities`](packages/core/data/cities) lists them (see [`COVERAGE.md`](packages/core/COVERAGE.md)). Every other city returns the state's typical local licensing regime,
  named for the city and county you pass in. City data is one file per state and looked up by an index, so adding
  thousands more is a data change; to keep the bundle small you can also load city data yourself and add it with
  `seededCityRule(indexCities(seeds))`.
- **County (seeded):** the 300 largest counties (approximate) in `data/counties/<STATE>.json`, mainly the annual
  business personal property return in states that levy it (due dates from the state, assessor page per county where
  confirmed). States without a county-level business filing, or where it is made to the city, town or state, are
  recorded as `none` or `unverified`. Add your own with `seededCountyRule(indexCounties(seeds))`.

Intentionally not modelled: FinCEN beneficial ownership reporting (domestic companies are exempt under FinCEN's final
rule effective August 14, 2026; only foreign entities registered in a US state report), local
sales-tax _rates_, professions beyond the five bundled directories (use `profession: "other"`), and non-US countries.
Each state file records what was checked and what was not in its `verification` block.

## Rule versions and upcoming changes

Rules change. The library tracks dated changes so users can prepare:

- **`RULESET_VERSION`** (`YYYY-MM-DD.n`) identifies the bundled rules and data; every result carries it as
  `rulesetVersion`, next to `dataVersion` (the date of the last data review).
- **`asOf`** resolves rules _as of a date_. Enacted changes that have taken effect by then are applied to the data, so
  `evaluate(profile, { asOf: "2027-07-01" })` shows obligations as they will be on that date.
- **`upcomingChanges`** on the result (and on each affected item) lists changes that take effect after `asOf`,
  soonest first; **`recentChanges`** lists those that took effect in the last year (`recentDays`).
- **`previewChanges(profile, { to })`** diffs the obligations between today and a future date: items added, removed
  and changed, plus the changes in between.
- **`listChanges({ state, from, to, status })`** browses the registry (`data/changes.json`).

```ts
import { evaluate, previewChanges } from "business-obligations";

const now = evaluate(profile);
now.upcomingChanges; // [{ id, effective, status: "enacted" | "proposed", kind, summary, source }]

const diff = previewChanges(profile, { to: "2027-07-01" });
diff.changed; // [{ id, title, fields: { description: { before, after } } }]
```

Changes marked `proposed` are reported but never applied. You can pass your own with `evaluate(profile, { changes })`.
Past changes are informational: the bundled data already reflects them.

## Costs, calendar, provenance and sensitivity

```ts
import { evaluate, estimateCosts, buildCalendar, toICS, analyzeInputs } from "business-obligations";

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

## Opening a new business

`planLaunch` turns a profile into an ordered plan: what to do first, what depends on what, planned dates, and the
recurring obligations that start afterwards.

```ts
import { planLaunch } from "business-obligations";

const plan = planLaunch(profile, { startDate: "2026-11-02", openingDate: "2027-02-01" });
plan.phases; // prepare -> form -> identify (EIN) -> register -> license -> employ -> operate
plan.steps[0]; // { order: 1, phase: "prepare", item, dependsOn: [], start, target, legalDeadline? }
plan.onTrack; // does the plan finish before the opening date?
plan.costs; // known government fees: one-time and per year
```

- **Order:** registered agent and professional approvals, then the formation filing, then the EIN, then tax and
  filing registrations, then licenses and permits, then pre-hire setup. Every step lists the item ids it depends on.
- **Dates:** phases are scheduled back to back from `startDate` using planning allowances (`allowanceDays`, defaults
  7/14/3/14/30/7 days). These are scheduling buffers, not agency processing times; override them with what the
  agencies publish for your case. A step's `legalDeadline` appears only when the rules give a real due date.
- **After opening:** the `operate` phase lists recurring items in due-date order, with first due dates computed from the
  planned formation date.
- From the command line: `npx business-obligations launch profile.json --start 2026-11-02 --opening 2027-02-01`.

## Winding down

Set `dissolutionDate` (the date the business is dissolved or the resolution to dissolve is adopted) and the result
gains `dissolution.*` items with computed deadlines: the dissolution filing in the formation state, foreign
withdrawals, closing each state's tax accounts, the final federal return (Form 1040/1065/1120-S/1120/990), Form 966,
final Forms 941/940 and W-2s, closing the IRS account and record retention. Recurring items such as annual reports are
not suppressed, because a final report is often still due.

## What happens if...

```ts
import { explainTransition } from "business-obligations";

const t = explainTransition(profile, { type: "hire", count: 2, annualPayroll: 90_000 });
t.added; // new obligations (unemployment registration, payroll deposits, new-hire reporting, ...)
t.nextSteps; // the added items ordered by next due date
```

Events: `hire`, `add_owners`, `revenue`, `start_selling_goods`, `leave_home_office`, `convert`, `expand` (another
state), `relocate` (keeps the formation state) and `form`. Pass an array to apply several in order. `applyEvent` returns
just the changed profile.

## Command line

```sh
npx business-obligations --zip 78701 --entity llc --employees 2 --payroll 80000
npx business-obligations calendar profile.json --from 2026-10-13 --to 2027-12-31 --ics deadlines.ics
npx business-obligations costs profile.json --json
npx business-obligations analyze profile.json
npx business-obligations changes --state CA --upcoming
```

`profile.json` is a `BusinessProfile`; use `-` to read it from stdin. City and county are filled from the ZIP.

## Translating output

Every item has a stable `id` and a `ruleId`. `localize(result, catalog)` swaps titles, descriptions, reasons,
authorities, enum labels and the disclaimer using templates keyed by rule id (`state.annual-report`, or
`state.annual-report:NY` for one state) with placeholders such as `{state}`, `{city}` and `{authority}`. Anything
without an entry stays in English. `catalogTemplate(result)` lists the English strings to start a catalog from.
The library ships no translations.

## Output schema

`schema/compliance-result.schema.json` describes the object returned by `evaluate()` for non-TypeScript consumers.
The tests validate real results against it.

## Disclaimer

This is general information, not legal, tax or accounting advice. The disclaimer text in each result is a plain-language
summary and has not been reviewed by a lawyer; if you build a product on this library, have counsel review the wording
shown to your users. The MIT license disclaims all warranties.

## Repository layout

This is an npm-workspaces monorepo:

| Path            | What it is                                                                              |
| --------------- | --------------------------------------------------------------------------------------- |
| `packages/core` | The published `business-obligations` library: `src/`, `data/`, `schema/`, `test/`, CLI. |
| `apps/web`      | The playground: Next.js (static export) with React and Tamagui. Not published.          |

Paths such as `data/states/` or `src/rules/` in this README and in CONTRIBUTING.md are relative to `packages/core`.

## Running the playground locally

```sh
npm install
npm run dev    # builds the library, then starts Next.js at http://localhost:3000
```

The playground imports the built library (`packages/core/dist`), so after changing the engine or its data, run
`npm run build` again (or restart `npm run dev`). `npm run site` builds the static export that is published to GitHub
Pages (output in `apps/web/out/`; serve it with any static server). Set `BASE_PATH=""` to serve it from a root path.

### Analytics on the playground

The hosted playground can record usage with [PostHog](https://posthog.com): page views, which tabs and form fields are
used (by name), and that a plan or calendar was generated. Generating a plan also sends the values you entered (ZIP,
entity type, industry, profession, headcount, payroll, revenue, the yes/no options and dates), but not the plan itself.
It sets no cookies, records no sessions and respects Do Not Track. It is off unless `NEXT_PUBLIC_POSTHOG_KEY` and
`NEXT_PUBLIC_POSTHOG_HOST` are set, and always off in `npm run dev`. The library itself has no telemetry.

## Size

The core bundle is about 125 KB gzipped with all 51 jurisdictions' data. ZIP lookup (about 305 KB gzipped) lives in the
separate `business-obligations/zip` entry and is only loaded when you import it. `npm run size` enforces the budgets.

## Extending

Rules are plain objects (`{ id, description, inputs, when(profile), items(profile) }`):

```ts
import { evaluate, defaultRules } from "business-obligations";
evaluate(profile, { rules: [...defaultRules, myRule] });
```

State data lives in [`data/states/*.json`](packages/core/data/states), validated by
[`schema/state.schema.json`](packages/core/schema/state.schema.json); city seeds in [`data/cities/`](packages/core/data/cities).

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
