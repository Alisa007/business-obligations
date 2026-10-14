# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the
project follows [Semantic Versioning](https://semver.org/) with the data-aware policy described in the README.

## [Unreleased]

### Added

- Counties: `data/counties/<STATE>.json` seeds county-level filings for the 300 largest US counties, mainly the
  annual business personal property return filed with the county assessor, property appraiser or appraisal district
  (with the state's due date and a county-specific page where one was confirmed). `findCounty`, `indexCounties` and
  `seededCountyRule` mirror the city API; items carry `jurisdiction: "county"`.

- Cities: the 300 largest US cities are covered (`data/top-cities.json` lists them). City seeds moved from
  `data/local.json` to `data/cities/<STATE>.json` with an indexed lookup (`findCity`), `status` (`rules`, `none`,
  `unverified`), `checkedOn`, `sourceUrl` and `note`, and `seededCityRule(indexCities(seeds))` to bring your own
  city data.

- Rule versioning: `RULESET_VERSION`, a dated change registry (`data/changes.json`), effective-dated patches applied
  by `asOf`, `upcomingChanges` / `recentChanges` on results and `upcomingChanges` on items, `previewChanges()`,
  `diffItems()` and `listChanges()`.
- Structured fees and penalties: every state report rule has a `feeDetail` (flat, per-member, per-partner, with
  online/paper amounts and min/max) and, where researched, a `lateFee`; items carry `cost` and `penalty`.
  `estimateCosts(items, { ownerCount, channel })` totals annual and one-time government fees. New `ownerCount` input.
- Calendar: `buildCalendar(profile, { from, to })` expands due dates into dated events (re-evaluating where an enacted
  change takes effect inside the window) and `toICS(events)` exports an iCalendar file. `occurrencesBetween()`.
- Provenance: every item has `provenance` (`confidence`: checked / compiled / unconfirmed, `checkedOn`, `sources`).
- Unemployment insurance: `unemployment` per state (taxable wage base, rate range and new-employer rate from the
  U.S. DOL's January 2026 table); the contribution item has a structured percent `cost`, and `estimateCosts` accepts
  `profile` to total it from payroll and headcount.
- `entityTaxDetail` for Texas (margin), Ohio and Oregon (CAT) and Nevada (Commerce Tax): threshold, rate and a
  comparison with `annualRevenue` in the item text.
- `COVERAGE.md`, generated from the data (`npm run coverage`), showing what was checked per state.
- Lifecycle API: `explainTransition()` / `applyEvent()` for hiring, new owners, revenue, conversion, expansion and
  relocation.
- Dissolution: `dissolutionDate` input and `dissolution.*` rules with dated deadlines; new `date` due type.
- Localization: `ruleId` on every item, `localize()` and `catalogTemplate()`.
- `schema/compliance-result.schema.json` for `evaluate()` output.
- Command line (`compliance-rules-engine`), bundle-size budgets (`npm run size`) and a CI smoke test.
- `planLaunch()`: ordered plan for opening a new business with phases, dependencies, planned dates, opening-date
  check and first-year fees; `launch` CLI command.
- Browser playground (`site/`, deployed by `.github/workflows/pages.yml`), runnable `examples/`, `ROADMAP.md`, an
  "Add a city" issue template and a reorganised README.
- `validateProfile()` and `InvalidProfileError.issues`: runtime validation of every profile field with suggestions
  for typos (`employes` -> `employeeCount`); `evaluate` now rejects unknown fields instead of ignoring them. A
  JavaScript quickstart (`examples/quickstart.cjs`) and README section.
- One date convention, enforced by tests: ISO `YYYY-MM-DD` for machine-readable dates (now rejecting impossible
  dates such as `2026-02-30`), spelled-out months in deadline text. `rulesetVersion` is now `YYYY-MM-DD.n` (was
  `YYYY.MM.DD-n`). Calendar windows are validated.
- Specific source citations: items cite the agency page for the obligation (formation, annual report, unemployment
  registration, withholding, sales tax, entity tax, workplace posters, DBA, business license, professional boards,
  city taxes), never a bare agency domain. New per-state `links` block; `npm run check:links` and a weekly workflow
  verify the links, and a test fails when an item cites a bare domain.
- Assumed names (DBA): California, Connecticut, Georgia, Massachusetts, Nevada and North Carolina file entity assumed
  names at the county or town level, not with the state (`dbaEntitiesFileLocally`).
- Clearer disclaimer wording.
- `analyzeInputs(profile)`: which optional inputs were defaulted and which values would change the returned items.

### Changed

- Resolved the last LP/LLP unknowns: Alabama and Oklahoma LLPs have no periodic report; Louisiana, Montana LP/LLP
  renewals (new `periodic` report frequency); Illinois LLP annual renewal. Only one fee amount remains unconfirmed (a best estimate is recorded)
  in the sources reviewed (Tennessee LP annual report); it is listed in
  `verification.unconfirmed`.

### Added

- `profession` input (attorney, CPA, physician, architect, engineer, other) with a bundled directory of all 255 state
  boards (`data/professions.json`); required for `pllc`, `pc`, `llp` and `professional_services`.
- Cannabis: `cannabis` industry, `cannabisActivity` input, per-state status and regulator, federal §280E item.
- Per-state `lpReport` and `llpReport` where LP/LLP reporting differs from the LLC report (FL, IL, IN, MN, PA, ...).
- `fullTimeEmployeeCount` input; workers' comp triggers for Michigan (hours test) and South Carolina (payroll floor).
- `localSalesTax` per state and a registration item where cities self-administer sales tax (AL, AK, AZ, CO, LA, MT).
- DBA filing level and office per state, verified for all 50 states and DC; `dbaFiling: "none"` where no registration
  is required (AL, HI, KS, MS, NE, NM, SC, WY).
- 18 more seeded cities (San Diego, San José, Oakland, Boston, Atlanta, Miami, Detroit, Columbus, Cleveland,
  Cincinnati, Pittsburgh, Louisville, Kansas City, St. Louis, Baltimore, New Orleans, Las Vegas, Phoenix); city
  aliases and a `trade_name` tag.
- `verification` block per state (`checkedOn`, `sources`, `unconfirmed`, `dba`).
- `every_five_years` report frequency (New York registered LLP statement) with next-due calculation.

### Changed

- Workers' comp 1-employee thresholds confirmed for DC, KY, LA, MA, MD, ME, MN, MT, NE, NH, NJ, NV, NY, OH, OR, PA, RI,
  UT, VT, WA, WV.
- Workers' comp is now marked elective for South Dakota (the Department of Labor and Regulation states coverage is
  not required by state law); Wyoming's threshold text notes it is mandatory only in extra-hazardous industries.
- Cannabis `cbd_only` status confirmed for ID, IN, KS, NC, SC, TN, WI, WY; regulators confirmed for PA (now Bureau of
  Medical Marijuana), RI, SD, TX, VA, VT, WA; corrected for UT (Department of Agriculture and Food) and WV (Department
  of Health).
- LP/LLP report data confirmed for AK, AR (LP fee is $15, not $0), DE ($400 flat tax, same as LLC), IA, ME, NE, NM.
- LP/LLP report data confirmed against Secretary of State sources: ND partnership annual report fee is $25 (was $50);
  Michigan LLPs renew annually for $100; CA, MS, NC, NH, AZ limited partnerships have no periodic report; SD limited
  partnerships file the same annual report as LLCs; SC LLP renewal is $100; WV LLP deadline is January 1 - July 1; Kansas
  LP/LLP fees corrected to $90 online ($110 paper).
- LLP report data: Virginia LLPs file an annual continuation report ($50, July 1); Missouri renewal is $105 plus $50
  per added partner (max $205); Illinois LLPs have an annual renewal statement (fee not yet confirmed); Iowa LLPs have no
  annual or biennial report; New York LLPs file a $20 statement every five years.
- More LP/LLP report data confirmed: no periodic report for NE, NM and OH limited partnerships; Tennessee LLP annual fee
  is $50 per partner ($250 minimum, $2,500 maximum); ID and SD LLPs file the same annual report as LLCs.
- LP/LLP report data accepted at high confidence: ID, IL and MA limited partnerships (MA now has an explicit $500 /
  $450 e-file fee), ME LLPs, NY limited partnerships (no biennial statement), TX LPs and LLPs (franchise tax).
- Resolved caveats: Illinois and North Dakota workers' comp thresholds, Oregon, New Mexico and Oklahoma report data
  confirmed; Alabama corporate annual report marked repealed (Oct 2024) per secondary sources; Kansas fees updated to
  the 2026 form amounts; cannabis regulators confirmed for 34 states with corrections for Louisiana (Agriculture and
  Forestry plus Board of Pharmacy), Iowa, Michigan, Montana, Mississippi and Arkansas.
- DBA registration authority corrected for many states (e.g. AL, KS, IN, IA, NH, RI from 2026, VA, WV, DE from 2026).
- Dead agency URLs replaced (FL, IA, LA, ME, NY, NH, VT, WY, MA) and city URLs repaired.
- Report data refined: MA/ME/HI corporate fees, NE occupation tax schedule, OK corporations (franchise tax repealed).

## [0.2.0] - 2026-10-13

### Added

- MIT license, package metadata, CI, contribution and security docs, issue/PR templates.
- Per-state data moved to `data/states/*.json` with a JSON Schema; city seeds in `data/local.json`.
- `evaluate()` returning items with the resolved profile, `asOf`, `dataVersion` and a disclaimer; `listRules()`.
- Structured due dates and `nextDue`, with `asOf`, `formationDate` and `fiscalYearEndMonth` inputs.
- `compliance-rules-engine/zip` subpath with exact ZIP → city/county/state lookup (GeoNames, CC BY 4.0).
- Entity types `pllc`, `lp`, `llp`, `pc`, `benefit_corp`; `country` selector and rule packs.
- State paid sick leave mandates, workplace notices (federal and state), professional entity and benefit report items.
- Seeded city rules: NYC, San Francisco, Los Angeles, Chicago, Seattle, Portland, Philadelphia, Denver.
- ESM and CommonJS builds.
- Snapshot tests for every state.

### Changed

- Annual/biennial report fees and deadlines for every state were re-checked against official pages (2026-10-13).
  Corrections include: CO fee $25, DE LLC tax $400, IA/KS/NE biennial schedules, OK LLC annual certificate $25,
  PA corporate deadline June 30, MT fee waiver, TX 2026 revenue threshold, VT/SD/LA fees, WV deadline June 30.
- Item ids now include the state (`state.employer:CA`). `needsVerification` was removed in 0.1.x; see README.

### Removed

- Build now uses tsup; the old `tsc`-only build and `tsconfig.build.json` are gone.

## [0.1.0]

Initial private release: US federal and state rules engine.
