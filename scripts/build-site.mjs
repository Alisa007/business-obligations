// Assembles the static playground into _site/ (requires `npm run build` first).
import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("_site", { recursive: true, force: true });
mkdirSync("_site/lib", { recursive: true });
cpSync("site", "_site", { recursive: true });
cpSync("dist/index.js", "_site/lib/index.js");
cpSync("dist/zip.js", "_site/lib/zip.js");
console.log("Site written to _site/ (serve it with any static server)");
