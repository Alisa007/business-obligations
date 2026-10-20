import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", "theme-script": "src/theme/script.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  external: ["business-obligations", "react", "react-dom", "tamagui"],
});
