/**
 * Post-build verification.
 *
 * Checks the properties that are easy to break silently and impossible to
 * see in a screenshot:
 *   1. every executed inline script is covered by a CSP hash
 *   2. the policy never falls back to 'unsafe-inline'
 *   3. no page references a third-party origin
 *   4. the compressed payload stays inside the performance budget
 *   5. no page carries a `style` attribute, which the CSP blocks
 *   6. robots.txt, the sitemaps and each page's identity links name only our origin
 *   7. every internal link and every self-referencing <link> resolves in dist/
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
// `</script\s*>` y no `</script>`: el navegador cierra el elemento tambien con
// `</script >`, y un verificador que no lo reconoce deja pasar un script entero.
const SCRIPT_TAG = /<script([^>]*)>([\s\S]*?)<\/script[^>]*>/gi;

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
    // A browser IGNORES frame-ancestors in a <meta> policy and logs a console
    // error on every page load. The real protection is the response header that
    // vercel.json sends, so the directive must not travel here.
    if (/frame-ancestors/.test(csp)) {
      fail(`${name}: the meta CSP declares frame-ancestors, which browsers ignore there and report as an error`);
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
  // Without these a browser tab shows a blank icon and a shared link shows no
  // picture, while twitter:card still promised a large one.
  if (!/<link[^>]*rel="icon"/.test(html)) fail(`${name}: no <link rel="icon">`);
  if (!/<meta[^>]*property="og:image"/.test(html)) fail(`${name}: no og:image`);

  // ---- No inline style attributes ----
  //
  // La CSP es `style-src 'self'` con hashes, y eso **bloquea los atributos
  // `style`**: medido en Chromium, que ademas lo dice en consola con «Applying
  // inline style violates the following Content Security Policy directive». Un
  // `style="width: 5rem"` bloqueado no es un matiz de estilo, es un campo que se
  // queda sin su ancho; un `margin-block-start` bloqueado es un bloque pegado al
  // anterior. Se comprueba aca para que no vuelva: las utilidades de
  // `src/styles/utilities.css` existen justamente para esto.
  const inlineStyles = [...html.matchAll(/\sstyle="[^"]*"/g)];
  if (inlineStyles.length > 0) {
    fail(
      `${name}: ${inlineStyles.length} atributo(s) style en el marcado, que la CSP bloquea; usa una utilidad de utilities.css`,
    );
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

// ---- 5: delegated-interaction wiring ----
// A delegated listener only fires when its root CONTAINS the elements it
// delegates for. ArborLab shipped with the listener on ".bench" while the tree
// type buttons sat in a sibling <nav>, so every type button silently did
// nothing and the page stayed on its default type. Nothing failed: the page
// built, the tests passed, and the only symptom was a control that never
// responded.
//
// This walks the real HTML nesting and asserts containment.
const DELEGATION = {
  "arboles/index.html": {
    root: "data-arborlab",
    hooks: [
      "data-tree-type",
      "data-tree-draw",
      "data-tree-clear",
      "data-tree-input",
      "data-tree-example",
      "data-mode",
      "data-export",
      "data-script",
    ],
  },
  "fono/index.html": {
    root: "data-ipachart",
    hooks: ["data-symbol", "data-ipa-filter"],
  },
  "tools/index.html": {
    root: "data-station",
    hooks: ["data-tab", "data-analyse", "data-sample", "data-clear", "data-export"],
  },
  "glosario/index.html": {
    root: "data-catalogue",
    hooks: ["data-facet"],
  },
  "bibliografia/index.html": {
    root: "data-catalogue",
    hooks: ["data-facet"],
  },
};

/** Attribute names on every open element, tracked as a stack while parsing. */
function attributesWithAncestors(html) {
  const VOID = new Set(["meta","link","img","br","hr","input","source","area","base","col","embed","param","track","wbr"]);
  const found = new Map();
  const stack = [];
  const tag = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g;

  for (let match = tag.exec(html); match !== null; match = tag.exec(html)) {
    const [, closing, name, rawAttrs, selfClosing] = match;
    const lower = name.toLowerCase();

    if (closing === "/") {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].name === lower) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const attrs = [...rawAttrs.matchAll(/([a-zA-Z][\w:.-]*)(?==|\s|$)/g)].map((m) => m[1]);
    for (const attr of attrs) {
      if (!attr.startsWith("data-")) continue;
      if (!found.has(attr)) found.set(attr, []);
      found.get(attr).push(stack.map((frame) => frame.attrs).flat());
    }

    if (!selfClosing && !VOID.has(lower)) stack.push({ name: lower, attrs });
  }

  return found;
}

for (const [page, spec] of Object.entries(DELEGATION)) {
  const file = join(DIST, page);
  if (!existsSync(file)) continue;

  const found = attributesWithAncestors(readFileSync(file, "utf8"));
  const roots = found.get(spec.root) ?? [];

  if (roots.length === 0) {
    fail(`${page}: delegation root [${spec.root}] is missing from the HTML`);
    continue;
  }

  for (const hook of spec.hooks) {
    const occurrences = found.get(hook) ?? [];
    if (occurrences.length === 0) {
      fail(`${page}: [${hook}] is handled by a delegated listener but absent from the HTML`);
      continue;
    }
    const inside = occurrences.some((ancestors) => ancestors.includes(spec.root));
    if (!inside) {
      fail(
        `${page}: [${hook}] is NOT inside [${spec.root}], so the delegated listener can never fire for it`,
      );
    }
  }
}

// ---- Own domain only ----
// robots.txt announced the sitemap on a domain that belongs to someone else
// for weeks after every canonical link had been corrected (ADR 0009), because
// it was a hand-written file that no check read. What a crawler takes as the
// site's identity must name the site's own origin: every URL in robots.txt and
// in the sitemaps, and canonical, hreflang, og:url and og:image in each page.
// Ordinary <a> links to other sites (the catalogue's external tools) are fine.
const indexHtml = readFileSync(join(DIST, "index.html"), "utf8");
const siteOrigin = new URL(
  indexHtml.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1] ?? "https://invalid.local",
).origin;

const crawlerFiles = readdirSync(DIST).filter((entry) => /^(robots\.txt|sitemap.*\.xml)$/.test(entry));
if (!crawlerFiles.includes("robots.txt")) fail("robots.txt is missing from the build");
for (const entry of crawlerFiles) {
  const text = readFileSync(join(DIST, entry), "utf8");
  // Only the addresses a crawler follows: <loc> in a sitemap, Sitemap: in
  // robots.txt. XML namespace URIs are identifiers, not addresses.
  const urls = entry.endsWith(".xml")
    ? [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    : [...text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  if (urls.length === 0) fail(`${entry}: declares no URL at all`);
  for (const url of urls) {
    if (new URL(url).origin !== siteOrigin) fail(`${entry}: names ${url}, which is not this site (${siteOrigin})`);
  }
}

// The sitemap and the canonical links must name the same addresses: a page
// listed as `/acerca/` and declared canonical as `/acerca` hands a crawler two
// URLs for one page.
const sitemapUrls = new Set(
  crawlerFiles
    .filter((entry) => entry !== "sitemap-index.xml" && entry.endsWith(".xml"))
    .flatMap((entry) => [...readFileSync(join(DIST, entry), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])),
);
const canonicalUrls = new Set(
  pages
    .map((file) => readFileSync(file, "utf8").match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1])
    .filter((url) => url !== undefined),
);
for (const url of canonicalUrls) {
  if (!sitemapUrls.has(url)) fail(`canonical ${url} is not in the sitemap (check the trailing slash)`);
}
for (const url of sitemapUrls) {
  if (!canonicalUrls.has(url)) fail(`sitemap lists ${url}, which no page declares as canonical`);
}

const IDENTITY = /<link\b[^>]*\brel="(?:canonical|alternate)"[^>]*\bhref="([^"]+)"|<meta\b[^>]*\bproperty="og:(?:url|image)"[^>]*\bcontent="([^"]+)"/gi;
for (const file of pages) {
  for (const match of readFileSync(file, "utf8").matchAll(IDENTITY)) {
    const url = match[1] ?? match[2] ?? "";
    if (new URL(url, `${siteOrigin}/`).origin !== siteOrigin) {
      fail(`${relative(DIST, file)}: declares ${url} as itself, which is not this site (${siteOrigin})`);
    }
  }
}

// ---- Internal links resolve ----
// A static file passed through the locale prefix (/en/audio/ATTRIBUTION.md)
// and an English 404 that was never built (/en/404) shipped as dead links.
// Every <a href> on our own origin and every self-referencing <link> must name
// something that exists in dist/.
function resolvesInDist(pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\//, "");
  const candidates = clean === "" || clean.endsWith("/")
    ? [join(DIST, clean, "index.html")]
    : [join(DIST, clean), join(DIST, clean, "index.html"), join(DIST, `${clean}.html`)];
  return candidates.some((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

const LINK_ATTR = /<a\b[^>]*\bhref="([^"#][^"]*)"|<link\b[^>]*\brel="(?:canonical|alternate|icon)"[^>]*\bhref="([^"]+)"|<meta\b[^>]*\bproperty="og:image"[^>]*\bcontent="([^"]+)"/gi;
for (const file of pages) {
  const name = relative(DIST, file);
  const html = readFileSync(file, "utf8");
  for (const match of html.matchAll(LINK_ATTR)) {
    const href = match[1] ?? match[2] ?? match[3] ?? "";
    let url;
    try {
      url = new URL(href, `${siteOrigin}/`);
    } catch {
      fail(`${name}: unparseable link ${href}`);
      continue;
    }
    if (url.origin !== siteOrigin) continue;
    const pathname = BASE !== "" && url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : url.pathname;
    if (!resolvesInDist(pathname)) fail(`${name}: links to ${url.pathname}, which is not in the build`);
  }
}

// ---- 6: payload budget (worst page) ----
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
