// Builds data/naics.json (six-digit 2022 NAICS codes and titles) from the Census Bureau's code list.
// Usage: node scripts/build-naics.mjs path/to/6-digit_2022_Codes.xlsx
//   (download: https://www.census.gov/naics/2022NAICS/6-digit_2022_Codes.xlsx; needs the `unzip` command)
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/build-naics.mjs path/to/6-digit_2022_Codes.xlsx");
  process.exit(1);
}
const unzip = (part) => execFileSync("unzip", ["-p", file, part], { encoding: "utf8", maxBuffer: 1 << 26 });
const text = (xml) =>
  xml
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .trim();
const strings = [...unzip("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => text(m[1]));
const sheet = unzip("xl/worksheets/sheet1.xml");
const cell = (row, col) => {
  const m = row.match(new RegExp(`<c r="${col}\\d+"([^>]*?)>([\\s\\S]*?)</c>`));
  const v = m?.[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
  return v === undefined ? undefined : /t="s"/.test(m[1]) ? strings[Number(v)] : v;
};
const codes = [];
for (const [row] of sheet.matchAll(/<row [\s\S]*?<\/row>/g)) {
  const code = cell(row, "A")?.trim();
  const title = cell(row, "B")?.trim();
  if (code && title && /^\d{6}$/.test(code)) codes.push([code, title.replace(/T$/, "")]);
}
codes.sort((a, b) => a[0].localeCompare(b[0]));
writeFileSync(new URL("../data/naics.json", import.meta.url), JSON.stringify(codes) + "\n");
console.log(`${codes.length} codes`);
