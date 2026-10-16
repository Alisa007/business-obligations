// Copies the repository-level README, LICENSE and NOTICE into the package so `npm publish` ships them.
// Relative links in the README point at repository paths (packages/core/...), which would 404 on npmjs.com, so they
// are rewritten to absolute GitHub URLs in the copy that ships.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const REPO = "https://github.com/Alisa007/business-obligations";

/** Rewrites `](relative/path)` and `](./path#frag)` Markdown link targets to absolute repository URLs. */
export function absolutizeLinks(markdown, repo = REPO) {
  return markdown.replace(/\]\((?!https?:|mailto:|#|\/\/)([^)\s]+)\)/g, (_, target) => {
    const [path, hash = ""] = target.split(/(?=#)/);
    const clean = path.replace(/^\.\//, "").replace(/^\//, "");
    const last = clean.split("/").pop() ?? "";
    const kind = clean.endsWith("/") || !last.includes(".") ? "tree" : "blob";
    return `](${repo}/${kind}/main/${clean}${hash})`;
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const name of ["README.md", "LICENSE", "NOTICE"]) {
    const from = here(`../../../${name}`);
    if (existsSync(from)) copyFileSync(from, here(`../${name}`));
  }
  const readme = here("../README.md");
  if (existsSync(readme)) writeFileSync(readme, absolutizeLinks(readFileSync(readme, "utf8")));
}
