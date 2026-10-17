import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.tsx" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  external: ["business-obligations", "react", "react-dom", "tamagui"],
});
