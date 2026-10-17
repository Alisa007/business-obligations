# Changelog

All notable changes to `business-obligations-ui` are documented here.

## [Unreleased]

### Added

- `TypeInput`, `IndustryInput`, `EmployeesInput` and `DetailsInput` (every yes/no detail except "not formed yet"), with
  options from `business-obligations` and English and Spanish labels
- the inputs read and write the URL query (`?type=`, `?industry=`, `?employees=`, `?sells=`, ...) themselves
- `useProfileChoices`, `ProfileQueryProvider`, `readProfileQuery`, `writeProfileQuery`, `setProfileQuery`,
  `PROFILE_PARAMS`, `PROFILE_DEFAULTS` and `DETAIL_FIELDS`
- `messages.<locale>.profile`

## [0.2.1] - 2026-10-17

### Fixed

- **ui:** one heading hierarchy and labeled planning dates versus statutory deadlines

## [0.2.0] - 2026-10-17

### Added

- `locale` and `messages` props on `LaunchList` and `ObligationsList`; bundled English and Spanish interface text
  (`messages`, `getMessages`)
- dates, money and relative times are formatted for the locale; `es` uses US conventions
- search ignores case and accents

### Added

- English and Spanish translations for core and ui
