# business-obligations-ui

Reusable React/Tamagui components for `business-obligations` data.

```tsx
import { LaunchList, ObligationsList } from "business-obligations-ui";
import { planLaunch, evaluate } from "business-obligations";

<LaunchList plan={plan} done={done} onToggle={setDone} />
<ObligationsList items={result.items} asOf={result.asOf} filters={filters} onFilters={setFilters} />
```

The components are controlled: the host owns completed steps and obligation filters.

## The whole form: `ProfileForm`

```tsx
import { ProfileForm, useProfileChoices, lookupPlace, profileFromChoices } from "business-obligations-ui";

<ProfileForm />                                          // everything a person can tell about the business
<ProfileForm values={{ zip: "85234", entityType: "llc" }} />  // what the host already knows is not asked again

const [choices] = useProfileChoices();                  // the answers, read from the address
const place = await lookupPlace(choices.zip);            // { city, county, state }
const profile = profileFromChoices(choices, place!);     // a `BusinessProfile` for `evaluate` / `planLaunch`
```

It asks for the ZIP code (with the place it stands for), type, industry, profession (when it applies), people, money,
tax details, the yes/no details, and the dates of the plan, in groups. Nothing is submitted: every answer goes into the
address, so a link shares the form, and a host that reads `useProfileChoices()` sees each change.

**Values the host passes are not asked.** Each value in `values` replaces what the address says, `useProfileChoices`
returns it, and its field (and its heading, when all of its fields are gone) is not shown. To read the same values
outside the form, give them to `ProfileQueryProvider values={...}`, which the form picks up. The single fields
(`TypeField`, `IndustryField`, `EmployeesField`, `DetailsField`) follow the same rule.

Old links keep working: `entity=`, `goods=`, `dba=` and `industry=restaurant` are read, and not written again.

### How the package is laid out

```
src/index.ts            the public API: everything is exported by name from here
src/i18n/               messages (en, es), the one set of formatters (money, dates, relative days), the locale context
src/shared/             styles of the controls, the small pieces the lists are made of, URL checks
src/plan/               LaunchList, ObligationsList, the item cards and filters
src/profile/choices.ts  every choice of the profile, described once: its type, default, URL parameter, reading, writing
src/profile/store.tsx   the address as state: provider, hooks, `setProfileQuery`
src/profile/place.ts    ZIP code to place, and choices to a `BusinessProfile`
src/profile/fields/     one file per field; ProfileForm.tsx puts them together
```

`choices.ts` is the single source for the profile: the `ProfileChoices` type, `PROFILE_DEFAULTS`, `PROFILE_PARAMS`, the
lists of details and numbers, and reading and writing the address are all derived from one table, so adding a choice
means adding one line there (and its field). The formatters in `i18n/format.ts` are exported, so a host formats
money and dates the same way the lists do.

## Business details in the URL

Fields collect the details the engine needs, and keep them in the address bar, so a link shares the whole setup:

```tsx
import { TypeField, IndustryField, EmployeesField, DetailsField, useProfileChoices } from "business-obligations-ui";

<TypeField />      {/* ?type=pllc */}
<IndustryField />  {/* ?naics=621111 */}
<EmployeesField /> {/* ?employees=12 */}
<DetailsField />   {/* ?sells=1&home=1&tradeName=1&exempt=1&signage=1&food=1 */}

const [choices] = useProfileChoices(); // { entityType, naics, employeeCount, sellsTaxableGoods, ... }
```

- `IndustryField` takes a NAICS code, or searches the code list by word and fills in the code of the result. The list
  (`business-obligations/naics`) is a separate bundle, loaded when the person starts typing.
- The options come from the engine (`ENTITY_TYPES`), so a new type there shows up here.
- The inputs own the query string. A change goes in with `history.replaceState` (no page load, no history entry), keeps
  the other parameters and the hash, and updates every input and hook on the page. A value equal to its default is left
  out, and an invalid or missing one falls back to the default.
- `DetailsField` shows a three-state checkbox for every yes/no detail except "not formed yet": sells taxable goods, run
  from home, trade name, tax-exempt status, exterior signage and food service. The S election appears for professional
  and benefit corporations. Each is **yes** (✓, `?sells=1`), **no** (✕, `?sells=0`) or **not answered yet** (a dash with
  a dashed border, no parameter, the checkbox's "indeterminate" state); pressing it goes round in that order, and the
  answer is written beside it. In `ProfileChoices` they are `true`, `false` and `undefined`, and `undefined` is what
  the engine treats as unknown. `legend={false}` hides the group title visually when the host has its own heading.
- `useProfileChoices()` returns the current choices and a setter. Use it to build the plan:
  `planLaunch({ ...place, ...choices })`.
- To preselect something, wrap the inputs in `<ProfileQueryProvider defaults={{ naics: "722", employeeCount: 3 }}>`.
  (A value the host will not let the person change is `values`, above.) `readProfileQuery`, `writeProfileQuery`, `setProfileQuery`, `PROFILE_PARAMS` and `PROFILE_DEFAULTS` are exported for
  server code and links.
- Nothing is chosen by default: `choices.entityType` is `undefined` until a type is picked (the engine needs one, so
  decide what to analyze when it is missing) and `employeeCount` is `undefined` until a number is typed. Every field
  except the checkboxes has a ✕ that empties it. Pass `defaults` to the provider to preselect something.
- Typed values are checked with [zod](https://zod.dev) (`profile/validation.ts`): a head count must be a whole number from 0 to
  10,000, and a NAICS code needs 2 to 6 digits and must be in the code list. A field with a problem gets a red border
  and a message from `messages.<locale>.profile.errors`; a bad head count is kept in the box but not written to the
  address. Choosing a business type is optional, so an empty one is never an error.
- On the server, and while hydrating, the inputs show the defaults; they pick up the URL right after.
- Labels follow the `locale` prop like the lists do (`<TypeField locale="es" />`), from `messages.<locale>.profile`.

## Conditionally applicable obligations

`ObligationsList` takes an optional `conditional` list and shows it in its own section after the others: items that are
not in `items` now, but would be if a detail that was left blank turned out a certain way. Each is a `ConditionalItem`,
`{ item, when: [{ field, values }] }`, and its card says what would bring it in ("Applies if number of employees: 1, 2,
3 …"). The package does not compute them; the playground does, from `analyzeInputs` and `evaluate`
(`conditionalItems` in `apps/web/src/lib/plan.ts`). The list's filters apply to the section too.

## Bundle size

The package is ESM with `sideEffects: false`, and nothing runs when a module loads, so a bundler keeps only what an app
imports: `LaunchList` alone is about 17 KB minified (the peer dependencies are not counted), and zod comes along only with
`EmployeesField` and `IndustryField`, which validate. `src/treeshake.test.ts` bundles small consumers to keep it so.
Keep new top-level calls out of the modules (or mark them `/* @__PURE__ */`).

## Languages

English is the default and Spanish ships with the package. Two things are translated, by two packages:

- **Interface text** (labels, buttons, chips, filters) and the formatting of dates, money and relative times, here, with
  the `locale` prop.
- **Data text** (titles, descriptions, reasons, deadlines) in `business-obligations`, with `localizePlan` or `localize`
  and the bundled Spanish catalog.

```tsx
import { planLaunch, localizePlan, localize } from "business-obligations";
import { es } from "business-obligations/locales/es";

const plan = localizePlan(planLaunch(profile), es);
const result = localize(evaluate(profile), es);

<LaunchList plan={plan} costs={plan.costs} locale="es" />
<ObligationsList items={result.items} asOf={result.asOf} filters={filters} onFilters={setFilters} locale="es" />
```

`locale="es"` formats like US Spanish (`$1,250.00`, `15 oct 2026`). Search ignores case and accents, so "licencia"
finds "Licencia". For another language pass its tag and a full table:

```tsx
import { messages, type Messages } from "business-obligations-ui";

const fr: Messages = { ...messages.en, fileFormation: "Constitution", knownFees: "Frais connus" /* ... */ };
<LaunchList plan={plan} locale="fr" messages={fr} />;
```

`messages.en` and `messages.es` are the bundled tables, and `getMessages("es-MX")` picks one from a locale code.
Text from the data stays in English until it goes through `localize` / `localizePlan`.
