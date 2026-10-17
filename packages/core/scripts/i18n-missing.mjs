// Lists the English engine text a locale has no translation for.
//   node scripts/i18n-corpus.mjs corpus.json && node scripts/i18n-missing.mjs es corpus.json [--field=title] [--limit=60]
// Texts that are official agency names (the `authority` field) stay in English on purpose and are only listed with
// --field=authority. Exit code 1 when anything else is missing.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [locale, corpusFile, ...flags] = process.argv.slice(2);
if (!locale || !corpusFile) {
  console.error("usage: node scripts/i18n-missing.mjs <locale> <corpus.json> [--field=name] [--limit=n]");
  process.exit(2);
}
const opt = (name) => flags.find((f) => f.startsWith(`--${name}=`))?.split("=")[1];
const only = opt("field");
const limit = Number(opt("limit") ?? 60);

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "i18n-")), "catalog.mjs");
await build({
  entryPoints: [path.join(root, "src", "locales", locale === "en" ? "en.ts" : `${locale}/index.ts`)],
  bundle: true,
  format: "esm",
  outfile: out,
  loader: { ".json": "json" },
  logLevel: "silent",
});
const catalog = Object.values(await import(pathToFileURL(out).href)).find((v) => v && v.locale === locale);
const { localizeText } = await import(pathToFileURL(path.join(root, "dist", "index.js")).href);

const corpus = JSON.parse(fs.readFileSync(corpusFile, "utf8"));
const missing = {};
let total = 0;
for (const [text, meta] of Object.entries(corpus)) {
  if (only ? meta.field !== only : meta.field === "authority") continue;
  total++;
  if (localizeText(text, catalog) === text && !/^[\d\s$.,%()/-]*$/.test(text))
    (missing[meta.field] ??= []).push([text, meta.ruleId]);
}
const count = Object.values(missing).reduce((n, l) => n + l.length, 0);
for (const [field, list] of Object.entries(missing)) {
  console.log(`\n## ${field}: ${list.length} missing`);
  for (const [text, rule] of list.slice(0, limit)) console.log(`- [${rule}] ${text}`);
}
console.log(`\n${count} of ${total} texts have no ${locale} translation`);
process.exit(count ? 1 : 0);
