import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS module
import { bumpVersion, decideBump, parseSubject, renderGenerated } from "../scripts/auto-release.mjs";

const c = (subject: string, body = "") => parseSubject(subject, body);

describe("auto-release", () => {
  it("parses conventional subjects and ignores the rest", () => {
    expect(c("feat(ics): add reminders (#12)")).toEqual({
      type: "feat",
      scope: "ics",
      breaking: false,
      description: "add reminders",
    });
    expect(c("fix!: drop Node 18")).toMatchObject({ type: "fix", breaking: true });
    expect(c("chore: tidy", "BREAKING CHANGE: x")).toMatchObject({ breaking: true });
    expect(c("Bump eslint from 9 to 10")).toBeUndefined();
  });

  it("decides the highest bump", () => {
    const list = (...s: string[]) => s.map((x) => c(x));
    expect(decideBump(list("fix: a", "docs: b"), "1.2.3")).toBe("patch");
    expect(decideBump(list("fix: a", "feat: b"), "1.2.3")).toBe("minor");
    expect(decideBump(list("feat!: a", "fix: b"), "1.2.3")).toBe("major");
    expect(decideBump(list("docs: a", "chore: b", "ci: c"), "1.2.3")).toBeNull();
    expect(decideBump([], "1.2.3")).toBeNull();
  });

  it("keeps breaking changes to a minor bump before 1.0", () => {
    expect(decideBump([c("feat!: rename")], "0.2.0")).toBe("minor");
    expect(decideBump([c("feat!: rename")], "1.0.0")).toBe("major");
  });

  it("bumps versions", () => {
    expect(bumpVersion("0.2.9", "patch")).toBe("0.2.10");
    expect(bumpVersion("0.2.9", "minor")).toBe("0.3.0");
    expect(bumpVersion("0.2.9", "major")).toBe("1.0.0");
  });

  it("renders grouped release notes", () => {
    const commits = [
      c("feat(cli): add --json"),
      c("fix: ZIP lookup"),
      c("docs: readme"),
      c("feat!: rename x"),
    ];
    expect(renderGenerated(commits)).toBe(
      "### Breaking changes\n\n- rename x\n\n### Added\n\n- **cli:** add --json\n\n### Fixed\n\n- ZIP lookup",
    );
    expect(renderGenerated([c("docs: readme")])).toBe("");
  });
});
