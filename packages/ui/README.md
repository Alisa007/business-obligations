# business-obligations-ui

Reusable React/Tamagui components for `business-obligations` data.

```tsx
import { LaunchList, ObligationsList } from "business-obligations-ui";
import { planLaunch, evaluate } from "business-obligations";

<LaunchList plan={plan} done={done} onToggle={setDone} />
<ObligationsList items={result.items} asOf={result.asOf} filters={filters} onFilters={setFilters} />
```

The components are controlled: the host owns completed steps and obligation filters.
