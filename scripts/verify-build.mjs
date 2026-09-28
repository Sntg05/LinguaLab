/**
 * Post-build verification.
 *
 * Checks the properties that are easy to break silently and impossible to
 * see in a screenshot:
 *   1. every executed inline script is covered by a CSP hash
 *   2. the policy never falls back to 'unsafe-inline'
 *   3. no page references a third-party origin
 *   4. the compressed payload stays inside the performance budget
 *
 * Run with: node scripts/verify-build.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

// fileURLToPath, not URL.pathname: the repository path may contain spaces
// or other characters that pathname percent-encodes.
const DIST = fileURLToPath(new URL("../dist/", import.meta.url));

/* A project repository is served from a subpath, so built asset URLs are
   prefixed with the base. Strip it before resolving against dist/. */
const BASE = (process.env.SITE_BASE ?? "/").replace(/\/+$/, "");

/** Turn a built URL into a path under dist/, or null when it is external. */
function assetPath(url) {
  if (!url.startsWith("/")) return null;
  const withoutBase = BASE !== "" && url.startsWith(BASE) ? url.slice(BASE.length) : url;
  return join(DIST, withoutBase.replace(/^\//, ""));
}

/** Per-page budget for HTML + JS + CSS, compressed. */
const PAYLOAD_BUDGET_BYTES = 60 * 1024;

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

/** Every .html file under dist/, recursively. */
function htmlFiles(dir = DIST) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

const pages = htmlFiles();
if (pages.length === 0) {
  console.error("No HTML found in dist/. Run `astro build` first.");
  process.exit(1);
}

/* Attributes that cause the browser to FETCH a subresource. An <a href> to
   the source repository is legitimate and is deliberately not matched. */
const SUBRESOURCE = /<(?:script|img|iframe|audio|video|source|embed)\b[^>]*\bsrc="((?:https?:)?\/\/[^"]+)"|<link\b[^>]*\bhref="((?:https?:)?\/\/[^"]+)"[^>]*\brel="stylesheet"/gi;
const SCRIPT_TAG = /<script([^>]*)>([\s\S]*?)<\/script>/gi;

for (const file of pages) {
  const name = relative(DIST, file);
  const html = readFileSync(file, "utf8");

  // ---- 1 + 2: CSP coverage ----
  const cspMeta = html.match(
    /<meta[^>]*http-equiv="content-security-policy"[^>]*content="([^"]*)"/i,
  );

  if (!cspMeta) {
    fail(`${name}: no Content-Security-Policy meta tag`);
  } else {
    const csp = cspMeta[1];

    if (/unsafe-inline/.test(csp)) {
      fail(`${name}: CSP contains 'unsafe-inline'`);
    }
    if (!/object-src 'none'/.test(csp)) {
      fail(`${name}: CSP is missing object-src 'none'`);
    }

    const allowed = new Set(
      [...csp.matchAll(/'sha256-([^']+)'/g)].map((m) => m[1]),
    );

    for (const [, attrs, body] of html.matchAll(SCRIPT_TAG)) {
      if (/\bsrc=/.test(attrs)) continue; // external file, governed by 'self'
      if (/type="application\/(json|ld\+json)"/.test(attrs)) continue; // data block

      const digest = createHash("sha256").update(body).digest("base64");
      if (!allowed.has(digest)) {
        fail(
          `${name}: an executed inline script is not covered by the CSP hash\n` +
            `    ${body.trim().slice(0, 120)}`,
        );
      }
    }
  }

  // ---- 3: third-party subresources ----
  // Absolute self-references (canonical, hreflang, og:url) are expected; what
  // matters is that the browser never fetches from an origin other than ours.
  const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i);
  const ownOrigin = canonical?.[1] ? new URL(canonical[1]).origin : null;

  for (const match of html.matchAll(SUBRESOURCE)) {
    const href = (match[1] ?? match[2] ?? "").replace(/^\/\//, "https://");
    if (ownOrigin && href.startsWith(ownOrigin)) continue;
    fail(`${name}: loads a subresource from an external origin (${href})`);
  }

  // ---- Structural expectations ----
  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1Count !== 1) {
    fail(`${name}: expected exactly one <h1>, found ${h1Count}`);
  }
  if (!/<html lang="/.test(html)) {
    fail(`${name}: <html> has no lang attribute`);
  }
  if (!/<meta name="description"/.test(html)) {
    fail(`${name}: no meta description`);
  }
}

// ---- 4: audio manifest integrity ----
// The project promises that audio is never played without a verified licence.
// That promise is only real if every manifest entry resolves to a file that
// was actually shipped, and if nothing ships that is not in the manifest.
const manifestPath = "src/data/ipa-samples.json";
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const audioDir = join(DIST, "audio", "ipa");

  if (!existsSync(audioDir)) {
    fail("audio: the manifest exists but dist/audio/ipa was not built");
  } else {
    const shipped = new Set(readdirSync(audioDir));
    const declared = Object.entries(manifest);

    for (const [symbol, file] of declared) {
      if (!shipped.has(file)) {
        fail(`audio: manifest lists "${symbol}" -> ${file}, which was not built`);
      }
    }

    const declaredFiles = new Set(Object.values(manifest));
    for (const file of shipped) {
      if (!declaredFiles.has(file)) {
        fail(`audio: ${file} ships but has no manifest entry, so it has no attribution`);
      }
    }

    notes.push(`audio samples shipped: ${declared.length}`);
  }
}

// ---- 5: payload budget (worst page) ----
// Charge each page only what IT loads: its own HTML, the scripts it
// references, and the stylesheets it links. Counting every file in
// dist/assets as shared made the figure grow with the site instead of with
// the page, which is the opposite of what a budget should measure.
function compressedSize(path) {
  return gzipSync(readFileSync(path)).length;
}

let worst = { name: "", bytes: 0 };
for (const file of pages) {
  const html = readFileSync(file, "utf8");
  let total = compressedSize(file);

  for (const [, url] of html.matchAll(/<script[^>]*src="([^"]+)"/g)) {
    const asset = assetPath(url);
    if (asset && existsSync(asset)) total += compressedSize(asset);
  }

  for (const [, url] of html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) {
    const asset = assetPath(url);
    if (asset && existsSync(asset)) total += compressedSize(asset);
  }

  if (total > worst.bytes) worst = { name: relative(DIST, file), bytes: total };
}

notes.push(`worst page (html + its scripts + its stylesheets): ${(worst.bytes / 1024).toFixed(1)} KB gz — ${worst.name}`);

if (worst.bytes > PAYLOAD_BUDGET_BYTES) {
  fail(
    `performance budget exceeded: worst page is ${(worst.bytes / 1024).toFixed(1)} KB gz, ` +
      `budget is ${PAYLOAD_BUDGET_BYTES / 1024} KB (${worst.name})`,
  );
}

for (const note of notes) console.log(`  ${note}`);

if (failures.length > 0) {
  console.error(`\nBuild verification FAILED (${failures.length}):\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log("\nBuild verification passed.");
