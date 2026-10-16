// Lists the state data files whose verification is older than a year (or was never done), oldest first, so
// contributors know which rules need another look. Usage: npm run report:stale [-- --days 365]
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../data/states/", import.meta.url));
const arg = process.argv.indexOf("--days");
const days = arg > 0 ? Number(process.argv[arg + 1]) : 365;
const now = Date.now();

const rows = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => {
    const v = JSON.parse(readFileSync(dir + f, "utf8")).verification ?? {};
    const age = v.checkedOn ? Math.floor((now - Date.parse(v.checkedOn)) / 86_400_000) : Infinity;
    return {
      state: f.replace(".json", ""),
      checkedOn: v.checkedOn ?? "never",
      age,
      unconfirmed: v.unconfirmed?.length ?? 0,
    };
  })
  .sort((a, b) => b.age - a.age);

const stale = rows.filter((r) => r.age > days);
console.log(`${stale.length} of ${rows.length} states not verified in the last ${days} days`);
for (const r of stale)
  console.log(`${r.state}  last checked ${r.checkedOn}  (${r.unconfirmed} unconfirmed fields)`);
const open = rows.filter((r) => r.age <= days && r.unconfirmed > 0);
if (open.length) console.log(`\n${open.length} recently checked states still list unconfirmed fields:`);
for (const r of open) console.log(`${r.state}  ${r.unconfirmed} unconfirmed`);
