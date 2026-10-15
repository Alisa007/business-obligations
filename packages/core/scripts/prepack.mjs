// Copies the repository-level README, LICENSE and NOTICE into the package so `npm publish` ships them.
import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

for (const name of ["README.md", "LICENSE", "NOTICE"]) {
  const from = here(`../../../${name}`);
  if (existsSync(from)) copyFileSync(from, here(`../${name}`));
}
