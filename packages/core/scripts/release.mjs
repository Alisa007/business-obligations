// Prepares a release: bumps packages/core/package.json and turns the Unreleased changelog section into a dated
// version section. Usage: npm run release -- patch|minor|major|X.Y.Z
// It only edits files; review the diff, merge it, then tag `vX.Y.Z` (see CONTRIBUTING.md).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const pkgPath = here("../package.json");
const logPath = here("../CHANGELOG.md");

/** Next version for a bump keyword or an explicit X.Y.Z. */
export function nextVersion(current, arg) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) throw new Error(`Current version "${current}" is not X.Y.Z`);
  const [maj, min, pat] = m.slice(1).map(Number);
  if (arg === "major") return `${maj + 1}.0.0`;
  if (arg === "minor") return `${maj}.${min + 1}.0`;
  if (arg === "patch") return `${maj}.${min}.${pat + 1}`;
  if (/^\d+\.\d+\.\d+$/.test(arg ?? "")) return arg;
  throw new Error("Usage: npm run release -- patch|minor|major|X.Y.Z");
}

/** Moves the Unreleased entries under a new dated heading and leaves an empty Unreleased section. */
export function rollChangelog(log, version, date) {
  const marker = "## [Unreleased]";
  const start = log.indexOf(marker);
  if (start < 0) throw new Error("CHANGELOG.md has no [Unreleased] section");
  const after = start + marker.length;
  const next = log.indexOf("\n## [", after);
  const body = log.slice(after, next < 0 ? undefined : next).trim();
  if (!body) throw new Error("The [Unreleased] section is empty; nothing to release");
  const head = log.slice(0, start);
  const tail = next < 0 ? "" : log.slice(next);
  return `${head}${marker}\n\n## [${version}] - ${date}\n\n${body}\n${tail}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const version = nextVersion(pkg.version, process.argv[2]);
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  writeFileSync(logPath, rollChangelog(readFileSync(logPath, "utf8"), version, date));
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(
    `Prepared v${version}. Review the diff, open a PR, then tag and push: git tag v${version} && git push origin v${version}`,
  );
}
