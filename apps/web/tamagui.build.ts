import type { TamaguiBuildOptions } from "tamagui";

export default {
  components: ["tamagui"],
  config: "./tamagui.config.ts",
  outputCSS: "./public/tamagui.generated.css",
} satisfies TamaguiBuildOptions;
