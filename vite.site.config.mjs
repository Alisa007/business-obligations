// Dev server for the playground (`npm run dev`). It serves site/ and resolves the library from src/, so edits to
// the engine, its data or the page hot-reload with no build step. The published site still uses the built bundle.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: "site",
  resolve: {
    alias: [
      { find: "./lib/index.js", replacement: here("./src/index.ts") },
      { find: "./lib/zip.js", replacement: here("./src/zip-entry.ts") },
    ],
  },
  server: { port: 5173, fs: { allow: [here(".")] } },
});
