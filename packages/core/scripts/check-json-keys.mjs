import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export function findDuplicateKeys(source) {
  const duplicates = [];
  let index = 0;
  let line = 1;

  const advance = () => {
    if (source[index] === "\n") line += 1;
    index += 1;
  };
  const skipWhitespace = () => {
    while (/\s/.test(source[index] ?? "")) advance();
  };
  const parseString = () => {
    const start = index;
    advance();
    while (index < source.length) {
      if (source[index] === "\\") {
        advance();
        advance();
      } else if (source[index] === '"') {
        advance();
        return JSON.parse(source.slice(start, index));
      } else {
        advance();
      }
    }
    throw new Error("Unterminated JSON string");
  };
  const parseValue = () => {
    skipWhitespace();
    if (source[index] === "{") return parseObject();
    if (source[index] === "[") return parseArray();
    if (source[index] === '"') {
      parseString();
      return;
    }
    while (index < source.length && !/[\s,}\]]/.test(source[index])) advance();
  };
  const parseArray = () => {
    advance();
    skipWhitespace();
    if (source[index] === "]") return advance();
    while (index < source.length) {
      parseValue();
      skipWhitespace();
      if (source[index] === "]") return advance();
      if (source[index] !== ",") throw new Error("Expected comma in JSON array");
      advance();
    }
    throw new Error("Unterminated JSON array");
  };
  const parseObject = () => {
    advance();
    const keys = new Set();
    skipWhitespace();
    if (source[index] === "}") return advance();
    while (index < source.length) {
      skipWhitespace();
      const keyLine = line;
      if (source[index] !== '"') throw new Error("Expected JSON object key");
      const key = parseString();
      if (keys.has(key)) duplicates.push({ key, line: keyLine });
      keys.add(key);
      skipWhitespace();
      if (source[index] !== ":") throw new Error("Expected colon after JSON object key");
      advance();
      parseValue();
      skipWhitespace();
      if (source[index] === "}") return advance();
      if (source[index] !== ",") throw new Error("Expected comma in JSON object");
      advance();
    }
    throw new Error("Unterminated JSON object");
  };

  parseValue();
  skipWhitespace();
  if (index !== source.length) throw new Error("Unexpected trailing JSON content");
  return duplicates;
}

function jsonFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? jsonFiles(path) : entry.name.endsWith(".json") ? [path] : [];
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../src/locales");
  const errors = [];
  for (const path of jsonFiles(root).sort()) {
    try {
      for (const duplicate of findDuplicateKeys(readFileSync(path, "utf8"))) {
        errors.push(`${path}:${duplicate.line}: duplicate object key ${JSON.stringify(duplicate.key)}`);
      }
    } catch (error) {
      errors.push(`${path}: ${error.message}`);
    }
  }
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  }
}
