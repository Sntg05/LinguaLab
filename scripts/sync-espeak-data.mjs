/**
 * Copies the parts of `espeak-phonemizer` the site actually serves.
 *
 * WHY THIS EXISTS AT ALL
 *
 * The phonemizer runs in the browser, and `initialize()` needs three files by
 * URL: the wasm binary, the language manifest and the dictionary bundle. If the
 * bundle is not reachable under the base path we give it, the package quietly
 * falls back to fetching it from jsDelivr — which the site's `connect-src 'self'`
 * blocks, so the tool would stop working. The files are served from this
 * origin, always.
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
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "node_modules/espeak-phonemizer/dist");
// La version va en la ruta para que el servidor pueda cachear los datos como
// inmutables (ver src/config/engines.ts). Debe ser la del paquete instalado.
const VERSION = JSON.parse(readFileSync(join(ROOT, "src/config/engines.json"), "utf8")).espeakPhonemizer;
const INSTALLED = JSON.parse(readFileSync(join(SOURCE, "..", "package.json"), "utf8")).version;
if (VERSION !== INSTALLED) {
  console.error(`engines.json dice espeak-phonemizer ${VERSION} y node_modules tiene ${INSTALLED}.`);
  process.exit(1);
}
const TARGET = join(ROOT, "public/espeak-phonemizer", VERSION);

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

console.log(`espeak-phonemizer data: ${FILES.length} files copied into public/espeak-phonemizer/${VERSION}/`);
