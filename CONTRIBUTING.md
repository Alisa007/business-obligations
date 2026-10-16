# Contributing

The repository is an npm-workspaces monorepo: the library is in `packages/core` and the playground in `apps/web`. Paths
below (`data/`, `src/`, `test/`, `scripts/`) are relative to `packages/core`. Run `npm run check` from the root.

Thanks for helping keep compliance data correct. The most valuable contributions are **data corrections with an
official source**.

## Quick start

```sh
npm install
npm run check      # typecheck, lint, format check, tests
npm run test:update  # accept intentional snapshot changes, then review the diff
```

## Correcting or adding state data

1. Edit `data/states/<XX>.json`. Validate with `npm test` (the schema in `schema/state.schema.json` is enforced).
2. Use an **official** source (the state agency's own page or statute). Add its URL to `verification.sources`, set
   `verification.checkedOn` to today's date, and remove the field from `verification.unconfirmed` if you confirmed it.
3. Write the fee once, in `feeDetail`: the numbers (`amount`, `online`/`paper`, `perUnit`, `min`/`max`, `rate`) and, for
   what numbers cannot say, a short `note` such as `annual tax` or `$0 for nonprofit corporations`. There is no separate fee
   text: it is generated ("$30 online ($45 paper)"), and a test fails if a `note` repeats one of the fee's own numbers.
   `flat` and `none` need an `amount`, `per_partner`/`per_member` a `perUnit`, `percent` a `rate`.
4. Write the schedule as one iCalendar recurrence rule in `rrule` (see "Schedules" below); do not also write
   `frequency`, `due` or a `deadline` that merely repeats it.
5. Run `npm run test:update` and check the snapshot diff in `test/__snapshots__` shows only what you intended.
6. Add a line to the **Unreleased** section of `CHANGELOG.md`.

## Fields stored once

The file name is the state: state files have no `code`, city and county files have no `state` per entry, and
`wageWithholding` follows from `links.withholding`. A license's page is `businessLicense.url` (required). The unemployment-insurance data year is `data/ui-source.json`, not a per-state field. Allowed values
(entity types, industries, categories, ...) live in `src/enums.ts`; the JSON schemas must list the same values, and a
test checks that.

In a state file the keys follow the order of `schema/state.schema.json` (a test fails otherwise), `workersComp.threshold`
is written only when it says more than the employee count (it is generated from `trigger` otherwise), and
`verification.scope` only when it differs from `data/verification.json`. List a field in `verification.unconfirmed`
by its dotted path; a test checks the path exists, and `dbaFiling` there marks the DBA level as unconfirmed.

A `note` that several cities or counties share word for word is stored once in `data/local-notes.json` and referenced
with `"reason": "<code>"` instead (use one or the other). Reuse a code when your entry says exactly the same; a test fails
if a code is used by fewer than two entries or a note repeats a shared text.

## Schedules

A repeating deadline is stored once, as an iCalendar (RFC 5545) recurrence rule in `rrule`. The frequency, the
machine-readable due rule and the display text ("September 30") are all derived from it, and calendar apps accept
the same string. Items that do not repeat on a date (`once`, `ongoing`, `per_event`) keep `frequency` and `deadline`.

| Schedule                               | `rrule`                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Every September 30                     | `FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=30`                                                                              |
| Last day of February                   | `FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1`                                                                              |
| Quarterly, last day of Jan/Apr/Jul/Oct | `FREQ=YEARLY;BYMONTH=1,4,7,10;BYMONTHDAY=-1`                                                                       |
| Every second year                      | `FREQ=YEARLY;INTERVAL=2;BYMONTH=4;BYMONTHDAY=1` plus `"anchor": "2026-04-01"` (even years) or `"2027-04-01"` (odd) |
| Every second year from formation       | add `"anchor": "formation_year"` or `"year_after_formation"`                                                       |
| Anniversary of formation               | `FREQ=YEARLY` (`;BYMONTHDAY=1` or `-1` for the first or last day of the anniversary month)                         |

The date is written once, in the `rrule`; the deadline text is generated from it. Add a qualifier with `deadlineNote`
(`"calendar-year filers"` gives "April 15 (calendar-year filers)"), and a filing window's opening day with
`opens: { "month": 1, "day": 1 }` ("January 1 – May 1"). Write a full `deadline` only for what the rule cannot say
("Before the first day of the anniversary month", "15th day of the 4th month after fiscal year end"). Tests fail if a
`deadline` or `deadlineNote` repeats the rule's date, if both are given, or if a late fee is quoted in the text instead
of `lateFee`. Other `RRULE` parts are rejected.

Dates: use ISO `YYYY-MM-DD` in every date field (`checkedOn`, `effective`, ...) and spell months out in text
("April 15", not "Apr 15", "4/15" or "April 15th"); a test fails otherwise.

Cite the **specific page** for the obligation, never an agency home page: put it in the state's `links` block (or
the rule's `url`) and run `npm run check:links`. A test fails when an item cites a bare domain.

Do not copy text from commercial compliance-guide sites; summarise the requirement and cite the agency.

## Recording a rule change

When a fee, deadline, threshold or requirement changes (or is announced), add an entry to `data/changes.json` and bump
`rulesetVersion`:

- `effective` is the date it takes effect; `status` is `enacted` or `proposed` (proposed changes are never applied).
- `scope.state` and `scope.rules` (rule-id prefixes such as `state.annual-report`) decide which items get the notice.
- For an **enacted change in the future**, add `patches` (dotted paths into `data/states/<XX>.json`, e.g.
  `llcReport.feeDetail.amount`; the fee text follows the number) so the engine applies it automatically from `effective`. Leave the base data at today's value.
- For a change that already took effect, update the base data and record the entry **without** `patches` (history).
- Include a `source` URL. `npm test` validates the registry against `schema/changes.schema.json`.

## Adding or changing rules

- Rules live in `src/rules/` (`federal`, `state`, `industry`, `local`). Each rule declares `id`, `description`, the
  profile fields it reads (`inputs`), `when` and `items`.
- A rule must be a **pure function of the profile**. If an obligation depends on a fact the profile does not capture,
  add an input (and to `schema/business-profile.schema.json` and the README table) instead of hedging in the output.
- Item ids must be stable. Use `state` and `key` on the draft to keep ids stable across profiles.
- Add tests: a focused test in `test/` and, for data changes, the per-state snapshots update automatically.

## Adding or correcting a profession board

Edit `data/professions.json` (one entry per state per profession). Use the board's own site for `url`; the
data test requires all 51 jurisdictions for every profession.

## Adding a county

Counties live in `data/counties/<STATE>.json`, one file per state and DC. An entry has `county` (the name as
the ZIP data spells it, without "County"), optional `aliases`, and `items` in the same shape as city items. Use
`"status": "none"` (with `sourceUrl`) or `"unverified"` (with `note`) and `"checkedOn"` when the county has no
obligation of its own or you could not confirm one. Cite the county's own page for each obligation, not a bare domain.

A county entry covers **every county-level business obligation**, not only property tax. Check each of these before
you call a county `none`:

- a general business license, business tax or occupational tax (for example Florida's local business tax receipt,
  Tennessee's county business tax, Kentucky and Georgia occupational taxes, Maryland's trader's license);
- a lodging, occupancy or tourism tax, and any registration for it;
- a business personal property return or similar assessor filing;
- county clerk filings (assumed names, publication, certificates) beyond what the state file already records;
- county health, environmental, fire or building permits that apply to businesses generally (record activity-specific
  ones only when they apply to a common business type such as food service);
- county sales or use tax registrations, where the county rather than the state administers them.

`none` means all of these were checked. If you checked only some (for example only the personal property return),
use `unverified` and say in the `note` what was checked and what was not. A test fails if a `none` county's text
mentions only personal property.

## Adding a city

Cities live in `data/cities/<STATE>.json` (one file per state and DC). Each entry has `city`, optional `counties` and `aliases` (neighbourhood or borough names that resolve to the city), and `items`:

```json
{
  "id": "xyz.business-tax",
  "title": "Pay the XYZ business tax",
  "category": "payment",
  "authority": "City of XYZ Finance Department",
  "description": "One or two sentences, in your own words.",
  "rrule": "FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=30",
  "url": "https://www.xyz.gov/business-tax",
  "appliesTo": ["all"]
}
```

A city that has no general business license or tax of its own is still worth recording, so nobody has to check
again: set `"status": "none"`, `"items": []`, `"checkedOn"` (YYYY-MM-DD), `"sourceUrl"` (the official page, or a list of pages) and a
short `"note"` on what the city requires instead.

When the city's rule conflicts with or replaces a state default, record it on the item: `supersedes` lists the ids
(`state.annual-report:TX`) or rule ids (`state.trade-name`) it replaces, and the replaced items come back with
`preemptedBy` set. `appliesWhen` (`{ "field": "annualRevenue", "op": ">=", "value": 50000 }`) is checked against the
business profile: the item is returned only when every condition holds, and a profile that leaves the field out does
not match (except for `!=`). A list field such as `activities` matches when any entry does, so an obligation that only
lodging operators have is `{ "field": "activities", "op": "in", "value": ["lodging"] }`. `exemptions` lists who is
excluded, in plain text. Activity tags in use: `lodging` (hotels, motels and short-term rentals) and `home_improvement` (residential repair and remodelling work, which several counties license). Cite the ordinance or
page in `url`.

`appliesTo` takes `all`, `employees`, `sells_goods`, `corporation`, `unincorporated` or `trade_name`. Use the city's own
page for `url`, run `npm run check`, and add a line to the Unreleased section of `CHANGELOG.md`.

## Adding industry rules

What a state requires of particular industries (a barbershop license, a pesticide business registration) lives in
`data/industries/<STATE>.json`: a list of the same items as a city file, each with `naics` (code prefixes, 2 to 6
digits, such as `["8111"]` for all automotive repair), `checkedOn` and the official page in `url`. An item appears only
for a business whose NAICS code starts with one of the prefixes, so it needs the code to be given. Every prefix must
belong to a real 2022 NAICS code (the tests check it), and `npm run check` validates the file against
`schema/industry-items.schema.json`. A new state's file also needs a line in `src/data/industries.ts`.

An item issued by a city or county rather than the state (New York City's DCWP, DOHMH and TLC licences) sets
`"jurisdiction": "city"` and scopes itself with `appliesWhen` on `county`, so it shows only inside that place.

## Adding employer mandates

What a state requires of employers by headcount (state retirement plan registration, E-Verify, harassment training) lives
in `data/employers/<STATE>.json`: the same items as a city file, with `appliesTo: ["employees"]`, `checkedOn` and the
official page in `url`. The headcount goes in `appliesWhen` on `employeeCount` (`{ "field": "employeeCount", "op": ">=",
"value": 5 }`), and it is counted in that state, so a multi-state business gets a state's items only when it has enough
employees there. Ids start with the state code (`ca.calsavers-registration`). Phase-in dates that have passed belong in
the description, because the obligation continues for new employers. `npm run check` validates the file against
`schema/employer-items.schema.json`; a new state's file also needs a line in `src/data/employers.ts`.

## Adding a country

Add a rule pack under `src/rules/<country>/`, register it in `RULE_PACKS` in `src/engine.ts`, extend the `Country`
type and the input schema. Open an issue first to agree on the profile shape.

## Style

TypeScript strict mode, Prettier (`npm run format`), ESLint (`npm run lint`). Keep comments for the _why_.

## Reporting problems

Use the issue templates. For security issues see [SECURITY.md](SECURITY.md).

## Node versions

The library and CLI support Node 20+. The repository's tooling (ESLint 10, Vitest, Next.js) needs Node 20.19+, and
`.nvmrc` pins the current LTS (22) for day-to-day work (`nvm use`). CI runs the built package on 20, 22 and 24 and the
full check on 20.19, so don't add dependencies or syntax that need newer.

## Playground

The playground lives in `apps/web` (Next.js, React, Tamagui). `npm run dev` builds the library and starts it at http://localhost:3000.
Prefer Tamagui's default components and tokens over custom styling.

## Researching a place thoroughly

A place is `unverified` only after a real search came up empty: the jurisdiction's own pages, its codified ordinance
(Municode, American Legal, Code Publishing, eCode360 and similar), and PDFs (fee schedules, applications, ordinances).
`node packages/core/scripts/read-pdf.mjs <https-url> [--find "business license"] [--pages 3-7]` prints a PDF's text
(needs `pdftotext` from poppler). When a page says an ordinance or fee exists but does not give it, find the ordinance
number, the fee schedule or the council minutes that adopted it. The weekly coverage bot follows the same checklist,
lists what it tried in its pull request, and also re-researches the oldest `unverified` entries
(`node packages/core/scripts/missing-local.mjs --revisit 5` lists them).

## Coverage

There is no generated report to refresh: the JSON in `data/` is the record, and `COVERAGE.md` only says where to look.
`npm run coverage` prints counts and a per-state table from the JSON on demand (`-- --json` for machine-readable).

## Bundle size

`npm run build && npm run size` fails when a bundle exceeds its gzip budget (`scripts/size.mjs`). Prefer adding data to
JSON files over code; raise a budget only with a reason in the pull request.

## Local coverage bot

`.github/workflows/local-coverage-bot.yml` runs weekly (or on demand from the Actions tab). It uses
`packages/core/scripts/missing-local.mjs` to find the biggest cities and counties in the ZIP data that have no seed,
asks Claude to research them on official sites, and opens one pull request that a maintainer reviews like any other
data change. It never merges. Prefer `unverified` over guesses: reject bot PRs that cite aggregator sites or
unreadable sources. Places that are not real jurisdictions are recorded in `scripts/local-skip.json` so they are not
proposed again. Run the finder yourself with `node packages/core/scripts/missing-local.mjs --cities 10 --counties 10`.

## Releasing to npm (maintainers)

One-time setup:

1. Create or sign in to an npm account with 2FA enabled. The package name `business-obligations` is currently free.
2. Pick one way for GitHub Actions to publish:
   - **Trusted publishing (recommended, no secret to leak):** publish `0.x` once by hand with
     `npm login && npm publish -w business-obligations --access public`, then on npmjs.com open the package,
     Settings, Trusted Publisher, GitHub Actions, and enter owner `Alisa007`, repository
     `business-obligations`, workflow `release.yml`, environment `npm`.
   - **Token:** create a granular access token (publish rights for this package only, short expiry) and store it as
     the `NPM_TOKEN` secret of the **`npm` environment** (Settings, Environments, npm). The workflow uses it when present.
3. Already configured on this repository: the publish job runs in the `npm` environment, which needs a required
   reviewer's approval, and the build job installs dependencies with scripts disabled and never holds publish rights.
   Tags `v*` cannot be changed or deleted (ruleset "Protect release tags"); pushing a tag does not publish anything.

Releases are automatic and need no extra secrets. Contributing a releasable change is all it takes:

1. **Title your PR as a Conventional Commit** (CI checks it, and squash merge makes it the commit subject):
   `feat(scope): ...` bumps the minor version, `fix(...)`, `perf(...)` and `revert(...)` bump the patch version, and
   `feat!: ...` (or a `BREAKING CHANGE:` footer) is breaking: major, or minor while the version is below 1.0.
   `docs`, `chore`, `ci`, `build`, `test`, `refactor` and `style` do not release by themselves. Only commits that
   touch `packages/core` count, so playground-only changes never release the library.
2. Right after such a PR merges, the Release workflow opens (or updates) **one** pull request,
   `chore(release): vX.Y.Z`, that sets the version in `packages/core/package.json` and adds the generated section to
   `CHANGELOG.md`. Hand-written notes under Unreleased are kept and merged into that section. Its CI run starts on
   its branch and, when it passes, the same job merges it and dispatches the release.
3. Merging that PR publishes: the workflow runs the checks, packs and smoke-tests the tarball, waits for approval of the
   `npm` environment, publishes to npm with provenance and creates the `vX.Y.Z` GitHub release (which creates the tag
   at the release commit). Version, changelog, tag and npm always agree.
4. Merging, releasing and deploying are event-driven (no polling). A push made by the Actions token starts no
   workflows, so the workflow that merges also dispatches Release and Playground itself: the Auto-merge workflow does
   it for pull requests from people and Dependabot (when their CI run succeeds), and the Release and coverage-bot jobs
   do it for the pull requests they open (`.github/scripts/merge-when-green.sh`). Add the label `no-automerge` to keep a PR from merging by itself.
5. Rehearse any time: Actions, Release, Run workflow with "dry run" on prints the version it would release; turn dry
   run off to open the release pull request on demand.
6. To publish without waiting for approval, remove the required reviewer from the `npm` environment (Settings,
   Environments, npm).

Other one-time setup: enable GitHub Pages (Settings, Pages, Source: GitHub Actions) so the playground deploys on each
push to `main`.
