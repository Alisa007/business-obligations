// Fails when the built bundles exceed their gzip budgets. Run after `npm run build`.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const budgets = [
  {
    file: "dist/index.js",
    // Local data grows with every county and city researched, so the budget leaves room for it (it was 120 KB when the
    // bundle was 115 KB). If the data outgrows this, split it into per-state shards that load on demand, like the ZIP
    // lookup.
    maxGzipKb: 300,
    note: "core engine with all 51 jurisdictions' data and the seeded cities and counties",
  },
  {
    file: "dist/zip.js",
    maxGzipKb: 450,
    note: "ZIP -> city/county/state lookup (subpath, loaded on demand)",
  },
  {
    file: "dist/locales/es.cjs",
    maxGzipKb: 130,
    note: "Spanish catalog: labels, rule text and the text of every bundled state, city and county item (subpath, loaded on demand)",
  },
  {
    file: "dist/naics.js",
    maxGzipKb: 40,
    note: "NAICS code search (subpath, loaded on demand)",
  },
];

let failed = false;
for (const b of budgets) {
  const raw = readFileSync(b.file);
  const gz = gzipSync(raw).length;
  const kb = (n) => (n / 1024).toFixed(1);
  const ok = gz / 1024 <= b.maxGzipKb;
  if (!ok) failed = true;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${b.file}: ${kb(raw.length)} KB raw, ${kb(gz)} KB gzip (budget ${b.maxGzipKb} KB) — ${b.note}`,
  );
}
// Tree-shaking: a consumer importing one small function must not drag in the rule and place data.
// A new top-level call or array spread over data keeps it alive; mark such calls `/* @__PURE__ */`.
const { build } = await import("esbuild");
const shaken = await build({
  stdin: {
    contents: 'export { nextDueDate, dueToRRule } from "./dist/index.js";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  minify: true,
  format: "esm",
  write: false,
  logLevel: "error",
});
const shakenKb = shaken.outputFiles[0].contents.length / 1024;
const shakenOk = shakenKb <= 20;
if (!shakenOk) failed = true;
console.log(
  `${shakenOk ? "ok  " : "FAIL"} tree-shaking: importing nextDueDate + dueToRRule bundles to ${shakenKb.toFixed(1)} KB (budget 20 KB)`,
);

process.exit(failed ? 1 : 0);
