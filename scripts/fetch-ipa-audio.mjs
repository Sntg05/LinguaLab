/**
 * Fetch licensed IPA audio samples from Wikimedia Commons.
 *
 * Run once, by hand: `node scripts/fetch-ipa-audio.mjs`
 *
 * The downloads are committed, so the site build never touches the network.
 *
 * This script is the guardrail the project documents: a sample is only
 * written if its licence appears on the allowlist, and every accepted file
 * gets an attribution row. Files whose licence cannot be established are
 * skipped and reported, never silently included.
 *
 * Rate limiting: Commons throttles anonymous API use, so requests are
 * spaced and each file is looked up once.
 */
import { mkdirSync, writeFileSync, existsSync, unlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const OUT_DIR = "public/audio/ipa";
const MANIFEST = "src/data/ipa-samples.json";
const ATTRIBUTION = "public/audio/ATTRIBUTION.md";
const FORCE = process.argv.includes("--force");
/** Licence metadata cache, so a re-run does not need the API at all. */
const CACHE = "scripts/.ipa-audio-cache.json";
const USER_AGENT = "LinguaLab/2.0 (https://github.com/; educational IPA audio)";

/** Licences the project accepts. Anything else is rejected. */
const ALLOWED_LICENCE = /^(CC0|CC BY(-SA)?( \d|$)|Public domain|PD-)/i;

/**
 * Symbol -> Wikimedia Commons file title (without the extension).
 * Only entries whose Commons name is well established are listed; anything
 * missing simply falls back to speech synthesis at runtime.
 */
const SOURCES = {
  p: "Voiceless bilabial plosive",
  b: "Voiced bilabial plosive",
  t: "Voiceless alveolar plosive",
  d: "Voiced alveolar plosive",
  k: "Voiceless velar plosive",
  "ɡ": "Voiced velar plosive",
  q: "Voiceless uvular plosive",
  "ʔ": "Glottal stop",
  f: "Voiceless labiodental fricative",
  v: "Voiced labiodental fricative",
  "θ": "Voiceless dental fricative",
  "ð": "Voiced dental fricative",
  s: "Voiceless alveolar fricative",
  z: "Voiced alveolar fricative",
  "ʃ": "Voiceless postalveolar fricative",
  "ʒ": "Voiced postalveolar fricative",
  x: "Voiceless velar fricative",
  "ɣ": "Voiced velar fricative",
  h: "Voiceless glottal fricative",
  m: "Bilabial nasal",
  n: "Alveolar nasal",
  "ŋ": "Velar nasal",
  "ɲ": "Palatal nasal",
  l: "Alveolar lateral approximant",
  "ɾ": "Alveolar tap",
  r: "Alveolar trill",
  j: "Palatal approximant",
  // No Commons sample found under any known title; falls back to speech.
  // w: "Labial-velar approximant",
  i: "Close front unrounded vowel",
  u: "Close back rounded vowel",
  a: "Open front unrounded vowel",
  o: "Close-mid back rounded vowel",
  e: "Close-mid front unrounded vowel",
  "ɛ": "Open-mid front unrounded vowel",
  "ɔ": "Open-mid back rounded vowel",
  "ə": "Mid central vowel",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Normalise a downloaded sample to mono Ogg Vorbis.
 * The Commons originals are uncompressed WAV, which is ~10x larger than the
 * site needs for a single phoneme. Falls back to keeping the original if
 * ffmpeg is unavailable, so the script still works without it.
 */
function toOgg(sourcePath, targetPath) {
  try {
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error",
      "-i", sourcePath,
      "-ac", "1", "-ar", "22050",
      "-c:a", "libvorbis", "-q:a", "2",
      targetPath,
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Look up many files in ONE request.
 * MediaWiki accepts up to 50 titles per query; issuing one request per file
 * tripped the anonymous rate limit almost immediately.
 */
async function lookupMany(titles) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo" +
    "&iiprop=url|extmetadata|mime" +
    `&titles=${titles.map((t) => encodeURIComponent(`File:${t}.ogg`)).join("|")}`;

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  const text = await res.text();
  if (!text.startsWith("{")) {
    throw new Error(`API refused the request: ${text.slice(0, 80)}`);
  }

  const pages = JSON.parse(text).query?.pages ?? {};
  const byTitle = new Map();
  const strip = (html) => String(html ?? "").replace(/<[^>]+>/g, "").trim();

  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const meta = info.extmetadata ?? {};
    // The API returns the normalised title, so key on it.
    byTitle.set(page.title.replace(/^File:/, "").replace(/\.ogg$/, ""), {
      url: info.url,
      mime: info.mime,
      licence: strip(meta.LicenseShortName?.value) || "(unspecified)",
      author: strip(meta.Artist?.value) || "(unknown)",
      page: `https://commons.wikimedia.org/wiki/${page.title.replace(/ /g, "_")}`,
    });
  }
  return byTitle;
}

/** Retry with backoff, because Commons throttles bursts. */
async function withRetry(fn, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const wait = 4000 * (i + 1);
      console.log(`      retrying in ${wait / 1000}s (${error.message.slice(0, 50)})`);
      await sleep(wait);
    }
  }
  throw lastError;
}

async function download(url, destination) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  writeFileSync(destination, bytes);
  return bytes.length;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const manifest = {};
  const attribution = [];
  const skipped = [];

  const entries = Object.entries(SOURCES);
  console.log(`Looking up ${entries.length} samples on Wikimedia Commons in one batch...\n`);

  let cache = {};
  if (existsSync(CACHE)) {
    try {
      cache = JSON.parse(readFileSync(CACHE, "utf8"));
    } catch {
      cache = {};
    }
  }

  const unknown = entries.map(([, title]) => title).filter((t) => !(t in cache));
  const found = new Map(Object.entries(cache));

  if (unknown.length > 0) {
    console.log(`  ${unknown.length} title(s) not in cache; querying Commons once...`);
    const fetched = await withRetry(() => lookupMany(unknown));
    for (const [k, v] of fetched) cache[k] = v;
    writeFileSync(CACHE, JSON.stringify(cache, null, 2) + "\n");
    for (const [k, v] of Object.entries(cache)) found.set(k, v);
  } else {
    console.log("  all titles are cached; no API request needed.");
  }

  for (const [symbol, title] of entries) {
    const info = found.get(title);

    if (!info) {
      skipped.push([symbol, title, "file not found"]);
      console.log(`  skip  ${symbol.padEnd(3)} ${title} — not found`);
      continue;
    }

    if (!ALLOWED_LICENCE.test(info.licence)) {
      skipped.push([symbol, title, `licence ${info.licence}`]);
      console.log(`  skip  ${symbol.padEnd(3)} ${title} — licence ${info.licence}`);
      continue;
    }

    const stem = symbol.codePointAt(0).toString(16);
    const oggName = `${stem}.ogg`;
    const wavName = `${stem}.wav`;
    const oggPath = join(OUT_DIR, oggName);

    try {
      if (existsSync(oggPath)) {
        // Already normalised from an earlier run.
        manifest[symbol] = oggName;
        attribution.push({ symbol, filename: oggName, title, ...info });
        console.log(`  keep  ${symbol.padEnd(3)} ${oggName.padEnd(10)} already present`);
        continue;
      }

      if (existsSync(join(OUT_DIR, wavName))) {
        // Converted in place, so no re-download is needed.
        if (toOgg(join(OUT_DIR, wavName), oggPath)) {
          unlinkSync(join(OUT_DIR, wavName));
          manifest[symbol] = oggName;
          attribution.push({ symbol, filename: oggName, title, ...info });
          console.log(`  ogg   ${symbol.padEnd(3)} ${oggName.padEnd(10)} converted`);
          continue;
        }
      }

      const ext = info.mime === "audio/ogg" ? "ogg" : info.mime === "audio/mpeg" ? "mp3" : "wav";
      const downloaded = join(OUT_DIR, `${stem}.${ext}`);
      const size = await withRetry(() => download(info.url, downloaded));

      if (ext !== "ogg" && toOgg(downloaded, oggPath)) {
        unlinkSync(downloaded);
        manifest[symbol] = oggName;
        attribution.push({ symbol, filename: oggName, title, ...info });
        console.log(
          `  ok    ${symbol.padEnd(3)} ${oggName.padEnd(10)} ${(size / 1024).toFixed(0)} KB -> ogg  ${info.licence}`,
        );
      } else {
        manifest[symbol] = `${stem}.${ext}`;
        attribution.push({ symbol, filename: `${stem}.${ext}`, title, ...info });
        console.log(`  ok    ${symbol.padEnd(3)} ${stem}.${ext}  ${info.licence}`);
      }
    } catch (error) {
      skipped.push([symbol, title, `failed: ${error.message}`]);
      console.log(`  error ${symbol.padEnd(3)} ${title} — ${error.message.slice(0, 60)}`);
    }
  }

  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  const lines = [
    "# IPA audio — attribution and licences",
    "",
    "Every file in `public/audio/ipa/` is listed here with its source and",
    "licence. `scripts/fetch-ipa-audio.mjs` writes both this file and the",
    "manifest, and refuses any file whose licence is not on the allowlist",
    "(CC0, CC BY, CC BY-SA, public domain).",
    "",
    "Symbols without a sample fall back to the browser's speech synthesis at",
    "runtime, so no audio is ever played without a verified licence.",
    "",
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "Attribution is required by every licence below. Where the author is not",
    "stated in machine-readable form on Commons, the linked source page is the",
    "canonical attribution record and carries the full file history.",
    "",
    "| Symbol | File | Source | Licence | Author |",
    "| --- | --- | --- | --- | --- |",
  ];

  // Many Commons files carry no machine-readable author. Naming a guessed
  // author would be worse than saying so: the source page is the canonical
  // attribution record and is always linked.
  const authorOf = (a) =>
    /^(\(unknown\)|\(none\)|)$/.test(a.author.trim())
      ? "not stated on Commons — see source page"
      : a.author;

  for (const a of attribution) {
    lines.push(
      `| ${a.symbol} | \`${a.filename}\` | [${a.title}](${a.page}) | ${a.licence} | ${authorOf(a)} |`,
    );
  }

  if (skipped.length > 0) {
    lines.push("", "## Not included", "", "| Symbol | Commons title | Reason |", "| --- | --- | --- |");
    for (const [symbol, title, reason] of skipped) {
      lines.push(`| ${symbol} | ${title} | ${reason} |`);
    }
  }

  lines.push("");
  writeFileSync(ATTRIBUTION, lines.join("\n"));

  console.log(`\nWrote ${Object.keys(manifest).length} samples to ${OUT_DIR}`);
  console.log(`Wrote ${MANIFEST}`);
  console.log(`Wrote ${ATTRIBUTION}`);
  if (skipped.length > 0) console.log(`${skipped.length} skipped (see the attribution file)`);

  if (!existsSync(OUT_DIR)) process.exitCode = 1;
}

await main();
