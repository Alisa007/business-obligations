// Prints random English -> translated pairs from a corpus, to review a translation by eye.
//   node scripts/i18n-preview.mjs es corpus.json <field> [count] [seed] [ruleId-filter]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [locale, corpusFile, field, count = "15", seedArg = "1", filter] = process.argv.slice(2);
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "i18n-")), "catalog.mjs");
await build({
  entryPoints: [path.join(root, "src", "locales", `${locale}/index.ts`)],
  bundle: true,
  format: "esm",
  outfile: out,
  loader: { ".json": "json" },
  logLevel: "silent",
});
const catalog = Object.values(await import(pathToFileURL(out).href)).find((v) => v && v.locale === locale);
const { localizeText } = await import(pathToFileURL(path.join(root, "dist", "index.js")).href);

const corpus = JSON.parse(fs.readFileSync(corpusFile, "utf8"));
let seed = Number(seedArg);
const random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
Object.entries(corpus)
  .filter(([, meta]) => meta.field === field && (!filter || meta.ruleId.includes(filter)))
  .map((entry) => [random(), entry])
  .sort((a, b) => a[0] - b[0])
  .slice(0, Number(count))
  .forEach(([, [text, meta]]) =>
    console.log(`[${meta.ruleId}]\n  EN ${text}\n  ES ${localizeText(text, catalog)}`),
  );
