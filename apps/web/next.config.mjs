import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

// The repository's .env lives at the monorepo root.
loadEnvConfig(fileURLToPath(new URL("../..", import.meta.url)));

// GitHub Pages serves the site under /compliance-rules-engine; keep the root path in development.
const basePath =
  process.env.BASE_PATH ?? (process.env.NODE_ENV === "production" ? "/compliance-rules-engine" : "");

/** @type {import('next').NextConfig} */
export default {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
      "react-native-svg": "@tamagui/react-native-svg",
    },
  },
};
