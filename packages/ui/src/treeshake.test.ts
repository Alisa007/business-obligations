import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

const entry = path.join(path.dirname(fileURLToPath(import.meta.url)), "index.ts");

/** Bundles a consumer that imports only `names` from the package, with the peer dependencies left out. */
async function bundleOf(names: string[]): Promise<string> {
  const result = await build({
    stdin: {
      contents: `import { ${names.join(", ")} } from "business-obligations-ui"; console.log(${names.join(", ")});`,
      resolveDir: path.dirname(entry),
    },
    alias: { "business-obligations-ui": entry },
    bundle: true,
    write: false,
    minify: true,
    format: "esm",
    platform: "browser",
    jsx: "automatic",
    external: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "tamagui",
      "business-obligations",
      "business-obligations/*",
    ],
    logLevel: "silent",
  });
  return result.outputFiles[0]?.text ?? "";
}

// The package is a library: what an app does not import must not end up in its bundle (package.json says
// `sideEffects: false`, and nothing may run at the top level of a module that a bundler cannot drop).
describe("tree shaking", () => {
  it("keeps zod out unless a field that validates is used", async () => {
    for (const names of [
      ["LaunchList"],
      ["ObligationsList"],
      ["TypeField"],
      ["DetailsField"],
      ["filterObligations"],
    ])
      expect(await bundleOf(names), names.join()).not.toMatch(/zod/i);
    for (const names of [["EmployeesField"], ["IndustryField"]])
      expect(await bundleOf(names), names.join()).toMatch(/zod/i);
  });

  it("keeps each component out of a bundle that does not use it", async () => {
    const launch = await bundleOf(["LaunchList"]);
    expect(launch).not.toContain("obligation-category");
    expect(launch).not.toContain("combobox");
    const list = await bundleOf(["ObligationsList"]);
    expect(list).toContain("obligation-category");
    expect(list).not.toContain("combobox");
    const industry = await bundleOf(["IndustryField"]);
    expect(industry).toContain("combobox");
    expect(industry).not.toContain("obligation-category");
  });

  it("stays small for one component", async () => {
    expect((await bundleOf(["LaunchList"])).length).toBeLessThan(40_000);
  });
});
