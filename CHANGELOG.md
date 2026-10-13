# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the
project follows [Semantic Versioning](https://semver.org/) with the data-aware policy described in the README.

## [Unreleased]

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
