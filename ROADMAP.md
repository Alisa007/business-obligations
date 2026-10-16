# Roadmap

Where the project is going, roughly in priority order. Everything here is open to contributions; the linked issues
have details.

## Now

- **Keep the data fresh:** scheduled source verification that flags dead links and changed pages
  ([#7](https://github.com/Alisa007/business-obligations/issues/7)).
- **City data outside the core bundle:** the 300 seeded cities and counties take about 30 KB gzip of the 120 KB budget, so further
  cities should ship as a separate subpath loaded with `seededCityRule(indexCities(seeds))` rather than in the core.
- **More county data:** counties' own business licenses and taxes (Florida local business tax receipts, county
  business licenses in Nevada, Alabama and Kentucky), and county pages for the entries still marked unconfirmed.
- **More cities:** the 300 largest are covered; next are cities 301 and up, then county-level rules. City data is
  sharded per state and indexed, so adding cities is a data-only change
  ([#8](https://github.com/Alisa007/business-obligations/issues/8)).
- **More industries:** contractors, cosmetology, food trucks, money transmission and more
  ([#9](https://github.com/Alisa007/business-obligations/issues/9)).

## Next

- Structured formation fees per state, so the launch plan can total one-time costs.
- Entity-level tax thresholds for the remaining gross-receipts and franchise-tax states (TN, WA, KY, DE, PA, ...).
- Per-state dissolution requirements (tax clearance, final reports) and fees.
- Translation catalogs (Spanish first).

## Later

- Additional countries (the engine already selects rule packs by `country`).
- A hosted, embeddable widget built on the playground.

## Not planned

- Legal advice, filing on a user's behalf, or accounts and servers: this stays a pure library.
