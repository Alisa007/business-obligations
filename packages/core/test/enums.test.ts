import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as enums from "../src/enums";

const schemaDir = path.join(__dirname, "..", "schema");
const schemas = fs
  .readdirSync(schemaDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => [f, JSON.parse(fs.readFileSync(path.join(schemaDir, f), "utf8"))] as const);

function collect(value: unknown, where: string, out: Array<[string, string[]]>): void {
  if (Array.isArray(value)) value.forEach((v, i) => collect(v, `${where}[${i}]`, out));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      if (k === "enum" && Array.isArray(v) && v.every((x) => typeof x === "string")) out.push([where, v]);
      else collect(v, `${where}.${k}`, out);
    }
}
const found: Array<[string, string[]]> = [];
for (const [file, schema] of schemas) collect(schema, file, found);

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

describe("enums.ts is the source of every enumerated value", () => {
  it.each(Object.entries(enums))("%s is an enum in the schemas, unchanged", (name, list) => {
    const copies = found.filter(([, values]) => same(values, list));
    expect(copies.length, `${name} is not an enum in any schema`).toBeGreaterThan(0);
  });
});
