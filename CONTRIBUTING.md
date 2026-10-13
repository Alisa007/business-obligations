# Contributing

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

## Adding a city

Add an entry to `data/local.json`: `state`, `city`, `counties` (optional) and `items` with an `appliesTo` tag list
(`all`, `employees`, `sells_goods`, `corporation`, `unincorporated`, `trade_name`); add `aliases` for
neighbourhood or borough names. Cite the city's own page in `url`.

## Adding a country

Add a rule pack under `src/rules/<country>/`, register it in `RULE_PACKS` in `src/engine.ts`, extend the `Country`
type and the input schema. Open an issue first to agree on the profile shape.

## Style

TypeScript strict mode, Prettier (`npm run format`), ESLint (`npm run lint`). Keep comments for the _why_.

## Reporting problems

Use the issue templates. For security issues see [SECURITY.md](SECURITY.md).

## Regenerating the coverage report

`COVERAGE.md` is generated from `data/`. After changing state or local data, run `npm run coverage`; a test fails when
the file is stale.

## Bundle size

`npm run build && npm run size` fails when a bundle exceeds its gzip budget (`scripts/size.mjs`). Prefer adding data to
JSON files over code; raise a budget only with a reason in the pull request.
