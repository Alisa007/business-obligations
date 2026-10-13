# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the
project follows [Semantic Versioning](https://semver.org/) with the data-aware policy described in the README.

## [Unreleased]

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
