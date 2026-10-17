// Lists translated texts that still contain common English words, which usually means a part was left untranslated.
//   node scripts/i18n-residue.mjs <locale> <corpus.json> [--limit=40]
// Official agency names legitimately stay in English, so review the list rather than expecting it to be empty.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [locale, corpusFile, ...flags] = process.argv.slice(2);
const limit = Number(flags.find((f) => f.startsWith("--limit="))?.split("=")[1] ?? 40);
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

const ENGLISH =
  /\b(the|and|of|for|with|within|before|after|each|every|required|file|filed|return|returns|tax|business|license|licenses|renew|county|city|must|fee|fees|late|due|annual|monthly|quarterly)\b/gi;
const corpus = JSON.parse(fs.readFileSync(corpusFile, "utf8"));
const hits = [];
for (const [text, meta] of Object.entries(corpus)) {
  if (meta.field === "authority") continue;
  const translated = localizeText(text, catalog);
  if (translated === text) continue;
  const words = translated.match(ENGLISH);
  if (words?.length) hits.push({ words: words.length, meta, translated });
}
hits.sort((a, b) => b.words - a.words);
for (const h of hits.slice(0, limit))
  console.log(`[${h.meta.ruleId}] (${h.words}) ${h.translated.slice(0, 220)}`);
console.log(`\n${hits.length} translated texts contain English words`);
