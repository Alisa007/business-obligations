import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { messages } from "../index";

type Tree = { [key: string]: unknown };
const en = messages.en as unknown as Tree;
const es = messages.es as unknown as Tree;

/** Every leaf of a message table as `path`: its value. */
function leaves(tree: Tree, path = ""): Array<[string, unknown]> {
  return Object.entries(tree).flatMap(([key, value]) =>
    value && typeof value === "object" ? leaves(value as Tree, `${path}${key}.`) : [[`${path}${key}`, value]],
  );
}

/** Strings that are the same in both languages on purpose: words, acronyms and numbers that need no translating. */
const SAME_IN_BOTH = new Set([
  "no", // "no" in Spanish too
  "pdf", // " (PDF)"
  "jurisdictions.federal",
  "profileForm.ownersPlaceholder", // "1"
  "profile.answers.no", // "No"
  "profile.entityTypes.llc",
  "profile.entityTypes.pllc",
  "profile.entityTypes.lp",
  "profile.entityTypes.llp",
]);

describe("message tables", () => {
  const english = leaves(en);
  const spanish = new Map(leaves(es));

  it("have the same keys in English and Spanish", () => {
    expect(english.map(([path]) => path).sort()).toEqual([...spanish.keys()].sort());
  });

  it("have the same kind of value for every key (text, or a function of the same arity)", () => {
    for (const [path, value] of english) {
      const other = spanish.get(path);
      expect(typeof other, path).toBe(typeof value);
      if (typeof value === "function")
        expect((other as (...args: unknown[]) => unknown).length, path).toBe(value.length);
    }
  });

  it("do not leave English text in the Spanish table, except what is the same in both languages", () => {
    const untranslated = english
      .filter(([path, value]) => typeof value === "string" && value === spanish.get(path))
      .map(([path]) => path)
      .filter((path) => !SAME_IN_BOTH.has(path));
    expect(untranslated).toEqual([]);
  });

  it("give text, not 'undefined' or 'NaN', from every function", () => {
    for (const table of [english, [...spanish]] as const) {
      for (const [path, value] of table) {
        if (typeof value !== "function") continue;
        const text = (value as (...args: unknown[]) => unknown)(
          ...Array.from({ length: value.length }, () => 3),
        );
        expect(typeof text, path).toBe("string");
        expect(text as string, path).not.toMatch(/undefined|NaN|\[object/);
      }
    }
  });

  it("have no key that no component reads", () => {
    const sources: string[] = [];
    const read = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "messages") read(path);
        } else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name))
          sources.push(readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""));
      }
    };
    read(join(__dirname, ".."));
    const code = sources.join("\n");
    // A key is read by its name (`m.fee`), or, for a table indexed by something computed (`m.frequencies[item.frequency]`),
    // through the table's name followed by `[`.
    const unused = english
      .map(([path]) => path.split("."))
      .filter((parts) => {
        const key = parts[parts.length - 1] as string;
        const table = parts[parts.length - 2];
        return (
          !new RegExp(`\\b${key}\\b`).test(code) && !(table && new RegExp(`\\b${table}\\s*\\[`).test(code))
        );
      })
      .map((parts) => parts.join("."));
    expect(unused).toEqual([]);
  });
});
