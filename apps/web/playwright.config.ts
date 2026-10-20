import { defineConfig } from "@playwright/test";

const PORT = 4173;

/**
 * Browser tests of the built site: `npm run e2e` (once: `npx playwright install chromium`). They serve the static
 * export in `out/`, so build it first with `npm run build:web` from the repository root.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: `npx serve out -l ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
