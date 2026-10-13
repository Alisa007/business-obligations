// Checks that source URLs resolve and are specific pages rather than bare domains.
//
//   node scripts/check-urls.mjs --data            every URL in data/ (reports bare domains and broken links)
//   node scripts/check-urls.mjs candidates.json   [{ id, url, keywords?: string[] }] with a content check
//
// Exit code is 1 when a bare domain or an unreachable URL is found (only with --data).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const UA =
  "Mozilla/5.0 (compatible; compliance-rules-engine link check; +https://github.com/Alisa007/compliance-rules-engine)";

export const isBareDomain = (url) => {
  const u = new URL(url);
  return (u.pathname === "/" || u.pathname === "") && !u.search;
};

export async function check(url, keywords = []) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,*/*" },
      signal: AbortSignal.timeout(25_000),
    });
    const text = res.ok ? (await res.text()).slice(0, 400_000) : "";
    const hit = keywords.length ? keywords.some((k) => new RegExp(k, "i").test(text)) : undefined;
    return {
      url,
      status: res.status,
      finalUrl: res.url,
      moved: res.url.replace(/\/$/, "") !== url.replace(/\/$/, ""),
      bareAfterRedirect: isBareDomain(res.url) && !isBareDomain(url),
      keywordHit: hit,
      bytes: text.length,
    };
  } catch (e) {
    return { url, status: 0, error: String(e.cause?.code ?? e.message) };
  }
}

async function pool(items, worker, size = 8) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await worker(items[i], i);
      }
    }),
  );
  return out;
}

function collectDataUrls(root = "data") {
  const found = new Map();
  const walk = (v, where) => {
    if (typeof v === "string" && /^https?:\/\//.test(v)) found.set(v, [...(found.get(v) ?? []), where]);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
  };
  const files = [
    ...readdirSync(join(root, "states")).map((f) => join(root, "states", f)),
    join(root, "local.json"),
    join(root, "professions.json"),
    join(root, "changes.json"),
  ];
  for (const f of files) walk(JSON.parse(readFileSync(f, "utf8")), f.replace(`${root}/`, ""));
  return found;
}

async function main() {
  const arg = process.argv[2];
  if (arg === "--data") {
    const urls = collectDataUrls();
    const bare = [...urls.keys()].filter(isBareDomain);
    const results = await pool([...urls.keys()], (u) => check(u));
    const broken = results.filter((r) => r.status === 0 || r.status >= 400);
    for (const u of bare) console.log(`BARE    ${u}  (${urls.get(u)[0]})`);
    for (const r of broken) console.log(`BROKEN  ${r.status || r.error}  ${r.url}  (${urls.get(r.url)[0]})`);
    console.log(`${urls.size} urls, ${bare.length} bare domains, ${broken.length} unreachable`);
    process.exit(bare.length || broken.length ? 1 : 0);
  }
  const candidates = JSON.parse(readFileSync(arg, "utf8"));
  const results = await pool(candidates, (c) => check(c.url, c.keywords));
  for (let i = 0; i < candidates.length; i++) {
    const r = results[i];
    const ok = r.status >= 200 && r.status < 300 && !r.bareAfterRedirect && r.keywordHit !== false;
    console.log(
      `${ok ? "OK  " : "FAIL"} ${candidates[i].id}\t${r.status || r.error}\t${r.url}${r.moved ? `\t-> ${r.finalUrl}` : ""}${
        r.keywordHit === false ? "\t(keywords missing)" : ""
      }${r.bareAfterRedirect ? "\t(redirects to a bare domain)" : ""}`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
