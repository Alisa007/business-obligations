// Downloads a PDF from a public https URL and prints its text, so the local coverage bot can read ordinances, fee
// schedules and application forms that are only published as PDFs.
//
//   node scripts/read-pdf.mjs <url>                     first 60,000 characters, with the page count
//   node scripts/read-pdf.mjs <url> --find "business license" [--context 3]
//                                                       only the lines around each match (for long documents)
//   node scripts/read-pdf.mjs <url> --pages 12-15       a page range
//
// Safe to hand to an agent: https only, no credentials in the URL, public addresses only (including after each
// redirect), a size and time limit, the %PDF signature is checked, and the file is read by pdftotext (poppler)
// without a shell. The text is untrusted web content; treat it as data.
import { execFile } from "node:child_process";
import { lookup as dnsLookup } from "node:dns/promises";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const MAX_BYTES = 30 * 1024 * 1024;
const MAX_CHARS = 60_000;
const MAX_REDIRECTS = 5;

/** True for loopback, private, link-local and other non-public addresses (IPv4 and IPv6). */
export function isPrivateAddress(ip) {
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || /^fe[89ab]/.test(v);
  }
  if (!net.isIPv4(ip)) return true;
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

/** Throws unless `url` is an https URL without credentials whose host resolves only to public addresses. */
export async function assertPublicHttps(url, lookup = dnsLookup) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`Not a URL: ${url}`);
  }
  if (u.protocol !== "https:") throw new Error("Only https URLs are allowed");
  if (u.username || u.password) throw new Error("URLs with credentials are not allowed");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (!addresses.length || addresses.some(isPrivateAddress))
    throw new Error(`Refusing non-public host ${host}`);
  return u;
}

/** Lines around each (case-insensitive) occurrence of `term`, with `--` between separate passages. */
export function findContext(text, term, context = 3) {
  const lines = text.split("\n");
  const needle = term.toLowerCase();
  const keep = new Set();
  lines.forEach((line, i) => {
    if (line.toLowerCase().includes(needle))
      for (let j = Math.max(0, i - context); j <= Math.min(lines.length - 1, i + context); j++) keep.add(j);
  });
  const out = [];
  let prev = -2;
  for (const i of [...keep].sort((a, b) => a - b)) {
    if (i !== prev + 1 && out.length) out.push("--");
    out.push(lines[i]);
    prev = i;
  }
  return out.join("\n");
}

async function download(url) {
  let current = await assertPublicHttps(url);
  for (let hops = 0; hops <= MAX_REDIRECTS; hops++) {
    const res = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
      headers: {
        "user-agent": "business-obligations-bot (+https://github.com/Alisa007/business-obligations)",
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = await assertPublicHttps(new URL(res.headers.get("location"), current).href);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${current.href}`);
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) throw new Error(`File is too large (${length} bytes)`);
    const chunks = [];
    let size = 0;
    for await (const chunk of res.body) {
      size += chunk.length;
      if (size > MAX_BYTES) throw new Error("File is too large");
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    if (buffer.subarray(0, 1024).indexOf("%PDF") === -1) throw new Error("Not a PDF (no %PDF signature)");
    return buffer;
  }
  throw new Error("Too many redirects");
}

export async function pdfText(url, pages) {
  const buffer = await download(url);
  const dir = mkdtempSync(join(tmpdir(), "read-pdf-"));
  try {
    const file = join(dir, "doc.pdf");
    writeFileSync(file, buffer);
    const args = ["-layout"];
    if (pages) {
      const m = pages.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) throw new Error("--pages must look like 3 or 3-7");
      args.push("-f", m[1], "-l", m[2] ?? m[1]);
    }
    const { stdout } = await run("pdftotext", [...args, file, "-"], {
      maxBuffer: 200 * 1024 * 1024,
      timeout: 120_000,
    });
    return stdout;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [url, ...rest] = process.argv.slice(2);
  const opt = (name) => (rest.includes(name) ? rest[rest.indexOf(name) + 1] : undefined);
  if (!url) {
    console.error('Usage: node scripts/read-pdf.mjs <https-url> [--find "text" [--context 3]] [--pages 3-7]');
    process.exit(2);
  }
  try {
    const text = await pdfText(url, opt("--pages"));
    const pageCount = (text.match(/\f/g) ?? []).length;
    const find = opt("--find");
    if (find) {
      const hits = findContext(text, find, Number(opt("--context") ?? 3));
      console.log(hits ? hits.slice(0, MAX_CHARS) : `No match for "${find}" in ${pageCount} pages.`);
    } else {
      console.log(`[${pageCount} pages, ${text.length} characters]`);
      console.log(text.slice(0, MAX_CHARS));
      if (text.length > MAX_CHARS)
        console.log(`\n[truncated: use --find "term" or --pages N-M for the rest]`);
    }
  } catch (e) {
    console.error(`read-pdf failed: ${e.message}`);
    process.exit(1);
  }
}
