# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the
project follows [Semantic Versioning](https://semver.org/) with the data-aware policy described in the README.

## [Unreleased]

### Added

- **core:** Syracuse Certificate of Use, and Rochester business permits, food truck and towing licenses, each scoped by NAICS code, with Spanish text
- **core:** New York State Liquor Authority brewery, distillery and winery licenses (with bond amounts), with Spanish text

### Changed

- **core:** the New York retail food store license now states its $250 application fee and two-year term

## [0.9.0] - 2026-10-18

### Changed

- `zip` is optional when `state` is given: a place is named by `city`, `county` and `state`, and the local authority
  names then leave the ZIP out. A profile with neither still fails validation

### Added

- **core:** zip is optional when state is given

## [0.8.0] - 2026-10-18

### Fixed

- `fullTimeEmployeeCount` is no longer compared with a head count that is not given; the full-time employees are then
  the employees that are known

### Added

- **ui:** ProfileForm, Select and Collapse; one source for the profile

## [0.7.0] - 2026-10-18

### Added

- **core:** Spanish names for places with one, state entity-tax descriptions and more local authority labels

### Fixed

- **data:** correct city-to-county mappings

## [0.6.0] - 2026-10-17

### Added

- **i18n:** a bundled Spanish catalog (`business-obligations/locales/es`) covering every rule, label and the text of all
  bundled state, city and county items, and English labels (`business-obligations/locales/en`)
- **i18n:** `localizePlan` for launch plans and `localizeText` for single strings
- **i18n:** catalogs can translate exact text (`strings`), text with variable parts (`patterns`), bare date lists
  (`months`, `monthDay`), and name entity types, filing methods and data confidence
- **i18n:** `LocalizedItem.labels` includes `filingMethod` and `confidence`

### Added

- English and Spanish translations for core and ui

## [0.5.0] - 2026-10-16

### Added

- **data:** freelance contract laws, contractor classification and breach notification
- **data:** New York charity registration and CHAR500, and waste combustion permits
- **data:** New York title agents, notaries, opticians and wider NAICS reach
- federal ACA reporting, EEO-1 and OSHA recordkeeping by headcount
- unclaimed property holder reports for every state
- **data:** NYC individual DCWP licences for tow, process, pedicab and ticket staff
- state employer mandates: retirement plan registration, E-Verify and harassment training
- **data:** NYC hotel, newsstand, stoop line stand and horse drawn cab licences
- **data:** remaining NYC DOHMH permits and registrations
- **data:** NYC DOB trade licences and the remaining FDNY permits
- **data:** NYC DOB, FDNY and cooling tower obligations
- **data:** NYC licence fees and the missing TLC, pool and FDNY items
- **data:** county food establishment health permits for six large counties
- **data:** New York City licences by NAICS code (DCWP, DOHMH, TLC)
- **data:** Alabama county and Louisiana parish sales tax returns
- **data:** local payroll taxes: Pennsylvania, Kentucky and Oregon
- **data:** Pennsylvania and Ohio county lodging tax returns
- **data:** California county transient occupancy tax returns
- **data:** New York lodging taxes for Otsego, Albany, Chemung and Tioga
- **data:** New York controlled substance activity licence
- **data:** New York college alcohol permit, real estate course approval and tour bus licence
- **data:** Indiana county innkeeper's tax returns
- **data:** Nevada, Kentucky and Louisiana county lodging tax returns
- **data:** New York bait, wildlife, preserve, tax preparer and ATV dealer items
- **data:** Tennessee county hotel/motel occupancy tax returns
- **data:** Florida counties: tourist development tax, business tax receipts, all 67 counties
- **data:** Virginia county and city business property returns and licenses
- **data:** Georgia county property tax returns, occupation tax and hotel tax
- **data:** Maryland county hotel tax returns
- **data:** business personal property returns for 32 more counties
- **data:** South Carolina and Alabama county lodging tax returns
- **data:** New York mold licensing and OPWDD operating certificate
- **data:** New York insurer annual statement
- **data:** New York professional entity and geologist items
- **data:** New York livestock dealer, fur breeder, dispatch, mass gathering and film permits
- **data:** New York mortgage servicer, fund raiser, gaming supplier and lab items
- **data:** New York telephone, manufactured home park and ELAP items
- **data:** New York assisted living, service bureau and SLA permit items
- **data:** New York hospice, snowmobile dealer, guide and SLA permit items
- **data:** New York farm dealer, nursery, labor and tramway items
- **data:** New York alcohol, opioid, TNC and tire fee tax filings
- **data:** New York DMV boat dealer, salvage pool and wholesale dealer items
- **data:** New York DEC waste, water well and CAFO permits
- **data:** New York DEC fishing, wildlife, fuel and pesticide permits
- **data:** New York Department of State licensing items
- **data:** New York nursing home operating certificate
- **data:** New York banking, meat, DFS, PBM and professions items
- **data:** New York apparel registration and model management items
- **data:** New York fishing, charter boat, bail enforcement and bottled water items
- **data:** New York firearms dealer, DFS finance and pet dealer items
- **data:** New York construction, elevator, cable and redemption-centre items
- **data:** New York industry rules, batch 9 (4 items)
- **data:** New York industry rules, batch 8 (8 items)
- **data:** New York industry rules, batch 7 (10 items)
- **data:** New York industry rules, batch 6 (12 items)
- **data:** New York industry rules, batch 5 (11 items)
- **data:** New York industry rules, batch 4 (15 items)
- **data:** New York industry rules, batch 3 (11 items)
- **data:** New York industry rules, batch 2 (13 items)
- **data:** state industry rules by NAICS code, New York batch 1
- **data:** New York county MCTMT payroll tax and home improvement licenses
- NAICS code as the main way to say what the business does
- **data:** New York county lodging taxes, batch F
- **data:** New York cities, batch 6 (6 cities)
- **data:** New York county lodging taxes, batch E
- **data:** New York cities, batch 5 (10 cities)
- **data:** New York county lodging taxes, batch D
- **data:** New York cities, batch 4 (9 cities)
- **data:** New York county lodging taxes, batch C
- **data:** New York cities, batch 3 (10 cities)
- **data:** New York county lodging taxes, batch B
- **data:** New York cities, batch 2 (10 cities)
- **data:** New York county lodging taxes, batch A
- **data:** New York cities, batch 1 (10 cities)
- **data:** New York counties, batch 3 of 3
- **data:** New York counties, batch 2 of 3
- **data:** New York counties, batch 1 of 3
- **data:** seed local data for the states that had none

### Fixed

- **data:** give deadlines that were text only a machine-readable date
- **data:** repair dead NYC source links and cover the last DOB and DCWP licences
- **data:** drop unused shared note code that fails the data test
- biennial report due dates, rule-change relevance, new-business playground views
- corporate estimated-tax dates, leap-year last day, launch date validation
- enforce appliesWhen on seeded city and county items
- **data:** a county is none only when every county-level obligation was checked
- **data:** seed missing cities and counties (local coverage bot)
- **data:** remove notes that only restate the item; fix a broken deadline note

### Changed

- make the core bundle tree-shakable

## [0.4.0] - 2026-10-16

### Breaking changes

- **data:** one fee source (feeDetail, text generated); required fields where data always has them
- **data:** store fees, state codes, withholding and enum values once

### Added

- **data:** sourceUrl may be a list of official pages
- **data:** stricter, documented state schema in a logical key order; fewer stored duplicates
- **data:** iCalendar rrule as the single source for schedules; schemas for city, county and profession data

### Fixed

- **data:** write each deadline date once, in the rrule

## [0.3.1] - 2026-10-16

### Fixed

- **data:** Minneapolis sick and safe time, Nashville license fee, Austin sourcing

## [0.3.0] - 2026-10-16

### Fixed

- "Today" is now the local calendar date, not the UTC date. Default start dates, "days until" figures and the CLI's
  `--upcoming` were a day ahead in the evening in US time zones.

### Changed

- **Releases are automatic.** Merging a PR with a `feat`, `fix`, `perf`, `revert` or breaking Conventional Commit title
  opens a release pull request that sets the version and generates the changelog; merging it publishes to npm and
  tags the release. PR titles are checked in CI.

- **Renamed to `business-obligations`** (was `compliance-rules-engine`): npm package, CLI command, repository and
  playground address. Import from `business-obligations` and `business-obligations/zip`; the CLI is now
  `business-obligations`. Calendar exports use `@business-obligations` in event UIDs.
- Minnesota SOS links no longer go through a bot-challenge redirect.

- Release tooling: `npm run release` prepares a version, the Release workflow smoke-tests the packed tarball, supports
  npm trusted publishing and creates the GitHub release. The published tarball no longer ships sourcemaps (about 40%
  smaller) and its README links are absolute.

- **Minimum Node is now 20** for the library and CLI; the repository's tooling needs Node 20.19 or newer.
  CI checks both floors (library on 20, 22 and 24; repository on 20.19). `.nvmrc` pins Node 22 for development.
- The repository is now an npm-workspaces monorepo (`packages/core`, `apps/web`). The published package is unchanged.
- The playground is rebuilt with Next.js (static export), React and Tamagui, and reports usage, the form values you enter
  when generating a plan, and unhandled errors with PostHog when configured (no cookies, no session recording).
- Local data: seeds for Huntington, WV and Shreveport, LA cities and for Fayette and Schuylkill counties, PA.

### Added

- **Seed data can express precedence.** City and county seed items accept `appliesWhen`, `exemptions`, `supersedes`
  (item ids or rule ids), `preemptedBy`, `formId`, `filingMethod`, `processingTime` and `renewal`; they are passed
  through to the emitted items. Superseded items come back marked `preemptedBy`.
- **`provenance.compiledOn` on every item**, the date of the bundled dataset, so items that were never individually
  checked still have an age. `reviewBy` and `stale` now apply to every item (counted from `checkedOn`, or from
  `compiledOn` when never checked).
- **Seeded city and county items inherit the seed's `checkedOn`** and are reported as `checked` (they were `compiled`
  with no date although the seed records when it was checked against the official pages).

- **Trust and review fields on every item.** `provenance.reviewBy` and `provenance.stale` (data checked more than a year
  before `asOf` is stale), `provenance.sourceDetails` (kind, retrieval date and an Internet Archive link per source),
  `jurisdictionId` (`US`, `US-TX`, `US-TX/city/austin`), `stateFips`, and `feedbackUrl` (a pre-filled data-correction
  issue). `npm run report:stale -w business-obligations` lists states that need re-verification.
- **Applicability and precedence fields:** `appliesWhen` (machine-readable conditions), `exemptions`, `supersedes` and
  `preemptedBy`, available to rules and data packs. The new stormwater rule is the first to populate them.
- **Filing mechanics:** optional `formId`, `filingMethod`, `processingTime` and `renewal` on items (set for the EIN).
- **Census FIPS codes and incorporated status.** County items carry a 5-digit `fips`, city items a 7-digit place `fips`
  and `incorporated`, for the 310 of 312 counties and 305 of 307 cities in `data/` that match the 2020 Census (consolidated city-counties
  such as Nashville and independent cities such as Baltimore are matched explicitly; Honolulu, Edison and two
  Connecticut planning regions are not in the Census place or county files and are left out). Regenerate with
  `node scripts/build-places.mjs <census dir>`.
- **Precedence is resolved.** An item listing another item's id in `supersedes` marks it `preemptedBy`.
- **New rules for the new inputs:** sign permit (`hasSignage`), building permit (`projectValueUsd`), food permit for
  non-restaurants (`foodService`); the certificate-of-occupancy and contractor items now use `floorAreaSqFt` and
  `licenseClass`; `naics` implies an industry for construction, food service, retail, real estate and healthcare.
- `renewal` is derived for licences, permits and registrations that recur annually, every two years or every five
  years ("Renew every two years; due ...").
- Sourced facts: the Form 1023 / 1023-EZ item carries the IRS's published processing figures, and Florida
  construction items state that cities and counties cannot require their own license for scopes outside the state
  contractor categories (s. 163.211, Florida Statutes).
- `formId` and `filingMethod` on the federal income tax return, Form 941, Form 940, Form 1099-NEC and Form 1023.
- **New profile inputs:** `naics`, `activities`, `projectValueUsd`, `disturbedAcres`, `licenseClass`, `floorAreaSqFt`,
  `hasSignage`, `foodService`. `disturbedAcres` of 1 or more adds the NPDES construction stormwater permit for
  construction businesses; the others are accepted and validated for upcoming local rules.

- Local seeds: Charleston, WV (registration, B&O tax and City Service Fee items from the city's own page), Des Moines, IA and Kanawha County, WV (unverified); Western Connecticut is skipped as a planning region.

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
- Command line (`business-obligations`), bundle-size budgets (`npm run size`) and a CI smoke test.
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

### Added

- **cli:** add --version flag
- precedence in seed data, compiledOn on every item
- Census FIPS codes, rules for new profile inputs, precedence and renewal

## [0.2.0] - 2026-10-13

### Added

- MIT license, package metadata, CI, contribution and security docs, issue/PR templates.
- Per-state data moved to `data/states/*.json` with a JSON Schema; city seeds in `data/local.json`.
- `evaluate()` returning items with the resolved profile, `asOf`, `dataVersion` and a disclaimer; `listRules()`.
- Structured due dates and `nextDue`, with `asOf`, `formationDate` and `fiscalYearEndMonth` inputs.
- `business-obligations/zip` subpath with exact ZIP → city/county/state lookup (GeoNames, CC BY 4.0).
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
