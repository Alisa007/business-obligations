import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts", zip: "src/zip-entry.ts", naics: "src/naics-entry.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    target: "es2022",
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    platform: "node",
    target: "node20",
    clean: false,
    sourcemap: false,
    // Self-contained executable: the ZIP data is bundled so `--zip` works without extra files.
    noExternal: [/.*/],
  },
]);
