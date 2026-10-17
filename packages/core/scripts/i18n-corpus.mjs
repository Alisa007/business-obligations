// Collects the English text the engine can show, so a translation catalog can be checked against it.
//   node scripts/i18n-corpus.mjs [out.json]
// Output: { "<english text>": { field, ruleId, example } }. Feed it to i18n-missing.mjs, i18n-residue.mjs and
// i18n-preview.mjs. The same collector runs in the test suite (test/helpers/i18n-corpus.ts).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "i18n-")), "corpus.mjs");
await build({
  entryPoints: [path.join(root, "test", "helpers", "i18n-corpus.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: out,
  loader: { ".json": "json" },
  logLevel: "silent",
  define: { "import.meta.dirname": JSON.stringify(path.join(root, "test", "helpers")) },
});
const { collectCorpus } = await import(pathToFileURL(out).href);
const { corpus, runs } = collectCorpus(root);
const file = process.argv[2];
if (file) fs.writeFileSync(file, JSON.stringify(Object.fromEntries(corpus), null, 1));
console.error(`${runs} profiles, ${corpus.size} distinct texts`);
