// Automatic versioning for continuous deployment. Reads the commit subjects that touched packages/core since the last
// v* tag and decides the next version from Conventional Commit titles. Nothing is committed: the version lives in the
// git tag and GitHub release; package.json is only set inside the release build.
//
//   node scripts/auto-release.mjs                    print { current, bump, version, commits } as JSON
//   node scripts/auto-release.mjs --apply            also set "version" in package.json (release build only)
//   node scripts/auto-release.mjs --notes FILE       also write generated release notes (Markdown) to FILE
//
// Rules (squash merges make each PR title the commit subject):
//   feat: -> minor    fix:, perf:, revert: -> patch    "type!:" or a BREAKING CHANGE footer -> major
//   Before 1.0.0 a breaking change bumps the minor version instead of the major one.
//   docs, chore, ci, build, test, refactor, style -> no release by themselves.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const pkgPath = here("../package.json");

const RELEASING = new Set(["feat", "fix", "perf", "revert"]);
const SECTIONS = [
  ["Breaking changes", (c) => c.breaking],
  ["Added", (c) => !c.breaking && c.type === "feat"],
  ["Fixed", (c) => !c.breaking && c.type === "fix"],
  ["Changed", (c) => !c.breaking && (c.type === "perf" || c.type === "revert")],
];

/** Parses `type(scope)!: description (#123)`; returns undefined for subjects that are not conventional. */
export function parseSubject(subject, body = "") {
  const m = /^(\w+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/.exec(subject.trim());
  if (!m) return undefined;
  const [, type, scope, bang, rest] = m;
  const description = rest.replace(/\s*\(#\d+\)\s*$/, "").trim();
  const breaking = Boolean(bang) || /^BREAKING[ -]CHANGE:/m.test(body);
  return { type: type.toLowerCase(), scope, breaking, description };
}

/** The highest bump the commits call for, or null when none of them is releasable. */
export function decideBump(commits, version) {
  const preMajor = /^0\./.test(version);
  let bump = null;
  for (const c of commits) {
    if (c.breaking) return preMajor ? "minor" : "major";
    if (c.type === "feat") bump = "minor";
    else if (RELEASING.has(c.type) && bump === null) bump = "patch";
  }
  return bump;
}

export function bumpVersion(version, bump) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) throw new Error(`"${version}" is not X.Y.Z`);
  const [maj, min, pat] = m.slice(1).map(Number);
  if (bump === "major") return `${maj + 1}.0.0`;
  if (bump === "minor") return `${maj}.${min + 1}.0`;
  if (bump === "patch") return `${maj}.${min}.${pat + 1}`;
  throw new Error(`Unknown bump "${bump}"`);
}

/** Changelog bullets for the releasable commits, grouped under Keep a Changelog headings. */
export function renderGenerated(commits) {
  const out = [];
  for (const [title, pick] of SECTIONS) {
    const items = commits.filter((c) => RELEASING.has(c.type) || c.breaking).filter(pick);
    if (!items.length) continue;
    out.push(`### ${title}\n`);
    for (const c of items) out.push(`- ${c.scope ? `**${c.scope}:** ` : ""}${c.description}`);
    out.push("");
  }
  return out.join("\n").trim();
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", cwd: here("..") }).trim();
}

/** The last v* tag, or undefined when the repository has none yet. */
export function lastTag() {
  try {
    return git("describe", "--tags", "--abbrev=0", "--match", "v*");
  } catch {
    return undefined;
  }
}

/** Commits that touched this package since the last v* tag (newest first). */
export function commitsSinceLastTag() {
  const tag = lastTag();
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const raw = git("log", range, "--format=%H%x1f%s%x1f%b%x1e", "--", ".");
  return raw
    .split("\x1e")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const [sha, subject, body] = r.split("\x1f");
      const parsed = parseSubject(subject ?? "", body ?? "");
      return parsed ? { sha, ...parsed } : undefined;
    })
    .filter(Boolean);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  // The tag is the source of truth for what is published; package.json only seeds the very first release.
  const tag = lastTag();
  const current = tag ? tag.replace(/^v/, "") : pkg.version;
  const commits = commitsSinceLastTag();
  const bump = decideBump(commits, current);
  const version = bump ? bumpVersion(current, bump) : null;
  if (version && process.argv.includes("--apply")) {
    writeFileSync(pkgPath, `${JSON.stringify({ ...pkg, version }, null, 2)}\n`);
  }
  const notesAt = process.argv.indexOf("--notes");
  if (version && notesAt > -1)
    writeFileSync(process.argv[notesAt + 1], `${renderGenerated(commits) || "Maintenance release."}\n`);
  console.log(JSON.stringify({ current, bump, version, commits: commits.length }));
}
