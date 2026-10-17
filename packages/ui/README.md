# business-obligations-ui

Reusable React/Tamagui components for `business-obligations` data.

```tsx
import { LaunchList, ObligationsList } from "business-obligations-ui";
import { planLaunch, evaluate } from "business-obligations";

<LaunchList plan={plan} done={done} onToggle={setDone} />
<ObligationsList items={result.items} asOf={result.asOf} filters={filters} onFilters={setFilters} />
```

The components are controlled: the host owns completed steps and obligation filters.

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
