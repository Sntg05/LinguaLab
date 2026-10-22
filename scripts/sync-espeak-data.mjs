/**
 * Copies the parts of `espeak-phonemizer` the site actually serves.
 *
 * WHY THIS EXISTS AT ALL
 *
 * The phonemizer runs in the browser, and `initialize()` needs three files by
 * URL: the wasm binary, the language manifest and the dictionary bundle. If the
 * bundle is not reachable under the base path we give it, the package quietly
 * falls back to fetching it from jsDelivr — which the site's `connect-src 'self'`
 * blocks, and which would break the promise that the tool works offline after
 * the first load. So the files are served from this origin, always.
 *
 * WHAT IS COPIED, AND WHY NOT MORE
 *
 * `dist/data/data.data` (5.6 MB) holds the shared tables plus every dictionary
 * except Russian. Unlike the dictionaries of the other package, this bundle is
 * not split per language, so there is nothing to prune: shipping Spanish and
 * English costs the same as shipping one. `ru.data` (9 MB) is a separate,
 * opt-in file and is not copied — we never call `initialize()` with
 * `includeRussian`.
 *
 * Run with `node scripts/sync-espeak-data.mjs`. The output is committed, so a
 * fresh clone serves the tool without running this first; rerun it when the
 * pinned version changes.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "node_modules/espeak-phonemizer/dist");
const TARGET = join(ROOT, "public/espeak-phonemizer");

/** The three files `initialize()` resolves under its base path. */
const FILES = [
  ["wasm/espeak-ng.wasm", "wasm/espeak-ng.wasm"],
  ["data/manifest.json", "data/manifest.json"],
  ["data/data.data", "data/data.data"],
];

for (const [from, to] of FILES) {
  const destination = join(TARGET, to);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(SOURCE, from), destination);
}

console.log(`espeak-phonemizer data: ${FILES.length} files copied into public/espeak-phonemizer/`);
