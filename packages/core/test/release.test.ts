import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS modules
import { absolutizeLinks } from "../scripts/prepack.mjs";
// @ts-expect-error plain JS modules
import { nextVersion, rollChangelog } from "../scripts/release.mjs";

describe("release helpers", () => {
  it("computes the next version", () => {
    expect(nextVersion("0.2.0", "patch")).toBe("0.2.1");
    expect(nextVersion("0.2.9", "minor")).toBe("0.3.0");
    expect(nextVersion("0.2.9", "major")).toBe("1.0.0");
    expect(nextVersion("0.2.0", "1.4.2")).toBe("1.4.2");
    expect(() => nextVersion("0.2.0", "soon")).toThrow(/Usage/);
  });

  it("rolls the Unreleased section into a dated version", () => {
    const log =
      "# Changelog\n\n## [Unreleased]\n\n### Added\n\n- A thing.\n\n## [0.2.0] - 2026-10-13\n\n- Older.\n";
    const out = rollChangelog(log, "0.3.0", "2026-11-01");
    expect(out).toContain("## [Unreleased]\n\n## [0.3.0] - 2026-11-01\n\n### Added\n\n- A thing.\n");
    expect(out).toContain("## [0.2.0] - 2026-10-13");
    expect(out.indexOf("[Unreleased]")).toBeLessThan(out.indexOf("[0.3.0]"));
  });

  it("refuses to release an empty Unreleased section", () => {
    expect(() => rollChangelog("## [Unreleased]\n\n## [0.2.0] - x\n", "0.3.0", "2026-11-01")).toThrow(
      /empty/,
    );
  });

  it("makes relative README links absolute and leaves others alone", () => {
    const md = [
      "[dir](packages/core/examples)",
      "[file](./packages/core/COVERAGE.md)",
      "[anchor](#running)",
      "[ext](https://example.org/x)",
      "[frag](CONTRIBUTING.md#style)",
    ].join(" ");
    const out = absolutizeLinks(md, "https://github.com/o/r");
    expect(out).toContain("(https://github.com/o/r/tree/main/packages/core/examples)");
    expect(out).toContain("(https://github.com/o/r/blob/main/packages/core/COVERAGE.md)");
    expect(out).toContain("(#running)");
    expect(out).toContain("(https://example.org/x)");
    expect(out).toContain("(https://github.com/o/r/blob/main/CONTRIBUTING.md#style)");
  });
});
