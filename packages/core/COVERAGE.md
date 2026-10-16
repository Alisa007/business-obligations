# Coverage

What the bundled data covers and how well each part was checked is recorded in the data itself. This page explains
where to look; it holds no figures of its own, so it cannot go out of date.

| Question                                                        | Look at                                                                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| When was a state last checked, and what could not be confirmed? | [`data/states/<XX>.json`](data/states), `verification.checkedOn` and `verification.unconfirmed`                                      |
| Which entity reports does a state have?                         | The `llcReport`, `corpReport`, `lpReport` and `llpReport` keys of the same file                                                      |
| Which cities are seeded, and with what?                         | [`data/cities/<XX>.json`](data/cities): `items` (rules), `status` (`none` or `unverified` when empty), `checkedOn`                   |
| Which counties?                                                 | [`data/counties/<XX>.json`](data/counties), same shape                                                                               |
| Which large cities and counties are still missing?              | Compare [`data/top-cities.json`](data/top-cities.json) and [`data/top-counties.json`](data/top-counties.json) with the folders above |
| How is each answer sourced?                                     | `provenance` on every returned item (`checked`, `compiled` or `unconfirmed`, with sources and dates)                                 |

"Checked" means confirmed against an official page on the date shown. Everything not marked checked is compiled from
public knowledge. An entry with `status: "unverified"` was researched but no official page confirmed either way; one
with `status: "none"` has an official page saying there is nothing.

To get counts and a per-state table straight from the JSON, run `npm run coverage` (or `npm run coverage -- --json`
for machine-readable output). Nothing is generated or committed. To improve an entry, see
[CONTRIBUTING.md](../../CONTRIBUTING.md).
