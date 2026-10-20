# Changelog

All notable changes to `business-obligations-ui` are documented here.

## [Unreleased]

### Fixed

- `LaunchList` without `onToggle`: a step's box now checks and unchecks when it is pressed (the list keeps the steps done itself). Before, it looked like a working box but did nothing. The progress figure no longer says "Saved in this browser" then, because nothing is saved; pass `onToggle` and `done` to keep the steps
- checkboxes (the plan's steps and the yes/no details) are drawn in the page's colors: the accent color when checked, like the inputs otherwise, in light and dark. Tamagui's `Checkbox` put them in an inverse sub-theme, so a checked box was dark on a light page (light on a dark one) with a mark that hardly showed

## [0.8.0] - 2026-10-20

### Added

- `SidebarLayout`: a rail at the left, as tall as the page and kept in view, with the content beside it; as much room is kept at the right as the rail takes at the left when the window can spare it
- `PlanSummary` (dates, fees and progress of a launch plan) and `ObligationsSummary` (count by level, next deadline, what was checked, what is local), as two different cards; `LaunchList` takes `summary={false}` to leave out its own figures
- `LocationSummary` (what is specific to the smallest place given: city, else county, else state), `CalendarList` and `CalendarDownload`
- `ThemeProvider`, `ThemeToggle`, `useThemePreference` and `themeScript` (the latter at `business-obligations-ui/theme-script`, for a server component's `<head>`): light, dark and the device's, remembered in the browser, with the right theme on the first paint
- `ProfileForm` takes `compact`: every section opens and closes, only the business starts open, and a section opens for an answer the visitor gave (not one the host fixed)
- a condition on an item ("Applies if number of employees…") leads to the input that answers it; `focusProfileField`, `hasProfileField` and `onEditField`
- `useHydrated` and `useBeforePaint`

### Changed

- the form and the theme button stay hidden (their room kept) until the page has read the address and the saved setting, so they appear already filled instead of changing; controls are sized by CSS media rules, so nothing resizes after hydration
- a dropdown's list is as wide as its toggle and lines up with it; on iOS the native select no longer widens its field to its longest option
- an item card's header holds links and buttons, so only its chevron is the toggle button (no button inside a button); pressing blank space in the header still toggles it
- `ObligationsList` no longer shows the "Find an obligation / Showing N of M" heading; "Clear filters" sits beside the level buttons

### Removed

- **breaking:** the `findObligation`, `showing`, `planNote`, `plusPerMonth`, `confidence` and `profileForm.optional` messages, which no component read; a custom message table that has them must drop them

### Breaking changes

- **ui:** add SidebarLayout and summary cards, make the form compact and hydration-safe

### Added

- use shared calendar location and theme UI
- **ui:** mark non-government links nofollow

### Fixed

- compact summary and fee empty state
- link local location requirements
- move planning note to footer
- add checked official sources to obligations

## [0.7.0] - 2026-10-19

### Changed

- the fee chip of an item shows a fee that has no single amount ("From $50", "Varies", a tiered fee) instead of nothing

### Added

- **data:** due dates and fees for bare-rule items; twice-yearly and quarter-of-formation rrules
- **core:** tiered fees, appliesWhenAny and richer local data; update libraries

### Fixed

- **ui:** scope jurisdiction filters to available items

## [0.6.0] - 2026-10-18

### Changed

- `Select`: the list of options is at least as wide as the control and 240px (and never wider than the screen), instead
  of only as wide as its longest option
- `ProfileForm`: every group of fields is now a grid of as many equal columns as fit, each at least a minimum width, so
  there are no breakpoints and no gaps: the business type, the industry and the ZIP code share a row (the type and
  the industry at 50% each when the ZIP code is not asked), the employees, owners and full-time staff share a row, the
  fiscal year end and the LLC tax, and the start date and the target opening, are half a row each, and all five money
  amounts sit on one line when the form is wide (two to a row in a sidebar)
- `ProfileForm`: shorter labels ("Owners", "Full-time staff", "Net income", "Top contractor pay", "Last year's payroll
  tax", "Fiscal year end", "Start date") with a "?" tooltip beside the label of every field that needs an explanation,
  and example amounts as the placeholders of the money fields. `Messages` gains `profileForm.about`, `hints` and
  `examples`, which a custom translation must provide

### Added

- **ui:** fluid group layout, short labels with tooltips, example placeholders
- **ui:** fluid twelve-column profile form layout
- **ui:** conditionally applicable items in the launch list

### Fixed

- **ui:** the select list is at least as wide as its control
- **ui:** business type and industry half a row each without the ZIP code
- **ui:** narrower money fields so more fit on a row
- **ui:** business type and industry on the same row when wide enough

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
