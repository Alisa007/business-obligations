import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

// The repository's .env lives at the monorepo root.
loadEnvConfig(fileURLToPath(new URL("../..", import.meta.url)));

// The site is served from the root of its custom domain (business-obligations.com). Set BASE_PATH when hosting
// under a subpath, e.g. BASE_PATH=/business-obligations for github.io/business-obligations/.
const basePath = process.env.BASE_PATH ?? "";

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
