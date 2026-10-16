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
3. If a deadline is computable, set the machine-readable `due` (see existing entries): `fixed` month/day (with
   `parity` or `cycleFrom` for biennial filings), or `anniversary`.
4. Run `npm run test:update` and check the snapshot diff in `test/__snapshots__` shows only what you intended.
5. Add a line to the **Unreleased** section of `CHANGELOG.md`.

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
  `llcReport.fee`) so the engine applies it automatically from `effective`. Leave the base data at today's value.
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

Counties live in `data/counties/<STATE>.json`, one file per state and DC. An entry has `state`, `county` (the name as
the ZIP data spells it, without "County"), optional `aliases`, and `items` in the same shape as city items. Use
`"status": "none"` (with `sourceUrl`) or `"unverified"` (with `note`) and `"checkedOn"` when the county has no
filing of its own or you could not confirm one. Cite the county's own page for the filing, not a bare domain.

## Adding a city

Add an entry to `data/cities/<STATE>.json`: `state`, `city`, `counties` (optional) and `items` with an `appliesTo` tag list
(`all`, `employees`, `sells_goods`, `corporation`, `unincorporated`, `trade_name`); add `aliases` for
neighbourhood or borough names. Cite the city's own page in `url`.

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

## Regenerating the coverage report

`COVERAGE.md` is generated from `data/`. After changing state or local data, run `npm run coverage`; a test fails when
the file is stale.

## Bundle size

`npm run build && npm run size` fails when a bundle exceeds its gzip budget (`scripts/size.mjs`). Prefer adding data to
JSON files over code; raise a budget only with a reason in the pull request.

## Adding a city

Cities live in `data/cities/<STATE>.json` (one file per state and DC). Each entry has `state`, `city`, optional `counties` and `aliases`, and `items`:

```json
{
  "id": "xyz.business-tax",
  "title": "Pay the XYZ business tax",
  "category": "payment",
  "authority": "City of XYZ Finance Department",
  "description": "One or two sentences, in your own words.",
  "frequency": "annual",
  "deadline": "September 30",
  "due": { "type": "fixed", "month": 9, "day": 30 },
  "url": "https://www.xyz.gov/business-tax",
  "appliesTo": ["all"]
}
```

A city that has no general business license or tax of its own is still worth recording, so nobody has to check
again: set `"status": "none"`, `"items": []`, `"checkedOn"` (YYYY-MM-DD), `"sourceUrl"` (the official page) and a
short `"note"` on what the city requires instead.

`appliesTo` takes `all`, `employees`, `sells_goods`, `corporation`, `unincorporated` or `trade_name`. Use the city's own
page for `url`, run `npm run coverage` and `npm run check`, and add a line to the Unreleased section of `CHANGELOG.md`.

## Local coverage bot

`.github/workflows/local-coverage-bot.yml` runs weekly (or on demand from the Actions tab). It uses
`packages/core/scripts/missing-local.mjs` to find the biggest cities and counties in the ZIP data that have no seed,
asks Claude to research them on official sites, and opens one pull request that a maintainer reviews like any other
data change. It never merges. Prefer `unverified` over guesses: reject bot PRs that cite aggregator sites or
unreadable sources. Places that are not real jurisdictions are recorded in `scripts/local-skip.json` so they are not
proposed again. Run the finder yourself with `node packages/core/scripts/missing-local.mjs --cities 10 --counties 10`.

## Releasing to npm (maintainers)

One-time setup:

1. Create or sign in to an npm account with 2FA enabled. The package name `compliance-rules-engine` is currently free.
2. Pick one way for GitHub Actions to publish:
   - **Trusted publishing (recommended, no secret to leak):** publish `0.x` once by hand with
     `npm login && npm publish -w compliance-rules-engine --access public`, then on npmjs.com open the package,
     Settings, Trusted Publisher, GitHub Actions, and enter owner `Alisa007`, repository
     `compliance-rules-engine`, workflow `release.yml`, environment `npm`.
   - **Token:** create a granular access token (publish rights for this package only, short expiry) and store it as
     the `NPM_TOKEN` secret of the **`npm` environment** (Settings, Environments, npm). The workflow uses it when present.
3. Already configured on this repository: tags `v*` can only be created by admins (ruleset "Protect release tags"),
   and the publish job runs in the `npm` environment, which needs a required reviewer's approval. The build job installs
   dependencies with scripts disabled and never holds publish rights; the publish job only uploads the built tarball.

Each release:

1. `npm run release -- patch` (or `minor`, `major`, or an explicit `X.Y.Z`). It bumps `packages/core/package.json` and
   turns the Unreleased changelog section into a dated version section. Open a PR with that change and merge it.
2. Optional rehearsal: Actions, Release, Run workflow with "dry run" on. It checks, builds, packs and installs the
   tarball without publishing.
3. Tag the merged commit on `main` and push the tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. The Release workflow verifies the tag is on `main` and matches the package version, runs the checks and a packed-install
   smoke test, then waits for approval of the `npm` environment before it publishes with provenance and creates the
   GitHub release from the changelog section.

Other one-time setup: enable GitHub Pages (Settings, Pages, Source: GitHub Actions) so the playground deploys on each
push to `main`.
