# business-obligations-ui

Reusable React/Tamagui components for `business-obligations` data.

```tsx
import { LaunchList, ObligationsList } from "business-obligations-ui";
import { planLaunch, evaluate } from "business-obligations";

<LaunchList plan={plan} done={done} onToggle={setDone} />
<ObligationsList items={result.items} asOf={result.asOf} filters={filters} onFilters={setFilters} />
```

The components are controlled: the host owns completed steps and obligation filters.

## Business details in the URL

Four inputs collect the details the engine needs, and keep them in the address bar, so a link shares the whole setup:

```tsx
import { TypeInput, IndustryInput, EmployeesInput, DetailsInput, useProfileChoices } from "business-obligations-ui";

<TypeInput />      {/* ?type=pllc */}
<IndustryInput />  {/* ?industry=healthcare */}
<EmployeesInput /> {/* ?employees=12 */}
<DetailsInput />   {/* ?sells=1&home=1&tradeName=1&exempt=1&signage=1&food=1 */}

const [choices] = useProfileChoices(); // { entityType, industry, employeeCount, sellsTaxableGoods, ... }
```

- The options come from the engine (`ENTITY_TYPES`, `INDUSTRIES`), so a new type there shows up here.
- The inputs own the query string. A change goes in with `history.replaceState` (no page load, no history entry), keeps
  the other parameters and the hash, and updates every input and hook on the page. A value equal to its default is left
  out, and an invalid or missing one falls back to the default.
- `DetailsInput` shows a checkbox for every yes/no detail except "not formed yet": sells taxable goods, run from home,
  trade name, tax-exempt status, exterior signage and food service. The S election appears for professional and benefit
  corporations. Pass `fields={["homeBased", "foodService"]}` to show only some.
- `useProfileChoices()` returns the current choices and a setter. Use it to build the plan:
  `planLaunch({ ...place, ...choices })`.
- To start from other defaults, wrap the inputs in `<ProfileQueryProvider defaults={{ industry: "restaurant", employeeCount: 3 }}>`.
  `readProfileQuery`, `writeProfileQuery`, `setProfileQuery`, `PROFILE_PARAMS` and `PROFILE_DEFAULTS` are exported for
  server code and links.
- On the server, and while hydrating, the inputs show the defaults; they pick up the URL right after.
- Labels follow the `locale` prop like the lists do (`<TypeInput locale="es" />`), from `messages.<locale>.profile`.

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
