import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS modules
import { absolutizeLinks } from "../scripts/prepack.mjs";

describe("prepack helpers", () => {
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
