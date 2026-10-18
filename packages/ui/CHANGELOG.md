# Changelog

All notable changes to `business-obligations-ui` are documented here.

## [Unreleased]

### Changed

- `ProfileForm`: when the ZIP code is not asked (the host gave the place), the business type and the industry are half of
  the row each at any form width, instead of leaving a gap on the widest layout

### Changed

- `ProfileForm`: the industry field is no longer always a full row, so the business type and the industry share a row
  from 520px wide (the ZIP code joins them from 800px, and now comes after them); in a narrow sidebar they still stack. The money fields are narrower too (one column, two on the widest layout), so
  two fit on a row in a sidebar and four from 520px

### Added

- `LaunchList` takes an optional `conditional` list (the same `ConditionalItem[]` as `ObligationsList`) and shows those
  items after the phases, grouped by level with city first, each with what would bring it in

## [0.5.0] - 2026-10-18

### Changed

- `ObligationsList` lists the city first, then the county, the state and the federal rules (it was federal first), and
  the conditionally applicable items now sit inside the group of their own level, after the items that apply, instead
  of in a section at the end. Each group's heading shows how many of them there are

### Added

- **ui:** city first, conditional items inside their level's group

## [0.4.1] - 2026-10-18

### Fixed

- `Select` did not work on phones: the custom list opens under the finger that tapped it, so an option was picked or
  the list closed before it could be read. On a touch screen (`pointer: coarse`) it is now the browser's own
  `<select>`, with the same border and chevron

### Fixed

- **ui:** Select is the browser's own <select> on touch screens

## [0.4.0] - 2026-10-18

### Added

- `ProfileForm`: the whole business-details form, laid out by its own width. Any value passed in `values` (a choice, a
  `zip`, or `city`, `county` and `state`) hides its field. `useProfilePlace` gives the place for the engine
- `Select` and `Collapse` (animated, chevron on the left or the right)
- fields: `NumberField` kinds for owners and money (with a `$`), a clear button on every field, zod validation with
  red errors, tri-state yes/no details, and "Not formed yet" inside `DetailsField`
- a "Conditionally applicable" section in `ObligationsList`, drawn only from inputs the person has not answered
- `formatMoney`, `formatDate`, `relativeDays` and `todayIso`; the package is tree-shakable

### Changed

- **breaking:** `TypeInput`, `IndustryInput`, `EmployeesInput` and `DetailsInput` are now `TypeField`, `IndustryField`,
  `EmployeesField` and `DetailsField`; `industry` (`?industry=`) is replaced by a NAICS code (`?naics=`); the default
  head count is unset; `PROFILE_DEFAULTS` and `ProfileChoices` have many more keys
- **breaking:** `Disclosure` is replaced by `Collapse` (`open` is now `defaultOpen`); the native selects of the
  lists are replaced by `Select`
- whole dollars show without cents ("$1,250"); a date that is not ISO is shown as it is instead of throwing
- the source is split into `i18n`, `shared`, `plan` and `profile`; the profile type, defaults, URL parameters and
  reading and writing come from one table

### Fixed

- an unknown ZIP code is shown as an error; owners of 0 and dates that do not exist (`?formedOn=2020-02-30`) no longer
  make the engine refuse the profile; long text and chips wrap on phones; the empty progress bar looked like a
  scrollbar; a field inside a form no longer falls back to English in a Spanish form

### Added

- **ui:** ProfileForm, Select and Collapse; one source for the profile

## [0.3.0] - 2026-10-17

### Added

- `TypeInput`, `IndustryInput`, `EmployeesInput` and `DetailsInput` (every yes/no detail except "not formed yet"), with
  options from `business-obligations` and English and Spanish labels
- the inputs read and write the URL query (`?type=`, `?industry=`, `?employees=`, `?sells=`, ...) themselves
- `useProfileChoices`, `ProfileQueryProvider`, `readProfileQuery`, `writeProfileQuery`, `setProfileQuery`,
  `PROFILE_PARAMS`, `PROFILE_DEFAULTS` and `DETAIL_FIELDS`
- `messages.<locale>.profile`

### Added

- **ui:** business-detail inputs that keep their values in the URL

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
