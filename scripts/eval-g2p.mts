/**
 * Mide los transcriptores propios contra un diccionario de pronunciación ajeno.
 *
 * POR QUÉ EXISTE
 *
 * «Transcribe bien» no es una afirmación que se pueda publicar sin una cifra.
 * Este script compara la salida de `packages/core/src/g2p/` con `ipa-dict`
 * (open-dict-data, licencia MIT) sobre una muestra determinista, y la cifra se
 * anota en `odd/tasks/rework-v4.md`.
 *
 * QUÉ MIDE Y QUÉ NO
 *
 * Compara solo los segmentos: el acento y los límites de sílaba se quitan,
 * porque el diccionario de referencia no silabea. Las diferencias de notación
 * que no son diferencias de análisis se igualan antes de comparar (deslizadas,
 * `ɫ`/`l`, `ʌ`/`ə`, `ɚ`/`ɝ`, barras de unión).
 *
 * - Español (`es_MX`): es una medida de ACIERTO. La referencia es independiente
 *   de nuestras reglas.
 * - Inglés (`en_US`): es una medida de COHERENCIA, no de acierto. `ipa-dict`
 *   deriva su inglés del mismo CMUdict que usamos, así que solo comprueba que
 *   la conversión de ARPABET a AFI coincide con otra hecha por terceros.
 *
 * Uso:
 *   curl -o node_modules/.cache/es_MX.txt https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/es_MX.txt
 *   curl -o node_modules/.cache/en_US.txt https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_US.txt
 *   node scripts/run-ts.mjs scripts/eval-g2p.mts
 */
import { existsSync, readFileSync } from "node:fs";
import { transcribeEnglish } from "../packages/core/src/g2p/english.ts";
import { transcribeSpanish } from "../packages/core/src/g2p/spanish.ts";

const CACHE = "node_modules/.cache";
const SAMPLE_SIZE = 5000;

/** Una de cada N entradas: la misma muestra en cada corrida. */
const sampleOf = (file: string, word: RegExp): [string, string][] => {
  const lines = readFileSync(`${CACHE}/${file}`, "utf8").split("\n").filter(Boolean);
  const step = Math.floor(lines.length / SAMPLE_SIZE);
  return lines
    .filter((_, index) => index % step === 0)
    .map((line) => line.split("\t") as [string, string])
    .filter(([entry]) => word.test(entry));
};

const strip = (ipa: string): string => ipa.replace(/[/ˈˌ.\s͜͡]/g, "");

const normalizeSpanish = (ipa: string): string =>
  strip(ipa)
    .replace(/tʃ/g, "C")
    .replace(/g/g, "ɡ")
    .replace(/ʝ|ʎ|ɟʝ/g, "J")
    .replace(/β/g, "b")
    .replace(/ð/g, "d")
    .replace(/ɣ/g, "ɡ")
    .replace(/ŋ|ɱ/g, "n")
    .replace(/i̯|ɪ̯|j/g, "i")
    .replace(/u̯|ʊ̯|w/g, "u")
    .replace(/z/g, "s");

const normalizeEnglish = (ipa: string): string =>
  strip(ipa).replace(/g/g, "ɡ").replace(/ɫ/g, "l").replace(/ʌ/g, "ə").replace(/ɚ/g, "ɝ");

const measure = (
  label: string,
  sample: [string, string][],
  transcribe: (word: string) => string | null,
  normalize: (ipa: string) => string,
): void => {
  let hits = 0;
  let unknown = 0;
  const misses: string[] = [];
  for (const [word, reference] of sample) {
    const own = transcribe(word);
    if (own === null) {
      unknown++;
      continue;
    }
    const references = reference.split(",").map(normalize);
    if (references.includes(normalize(own))) hits++;
    else if (misses.length < 15) misses.push(`  ${word}: propio ${normalize(own)} | ref ${references[0]}`);
  }
  const compared = sample.length - unknown;
  process.stdout.write(
    `${label}: ${((hits / compared) * 100).toFixed(1)} % de ${compared} palabras` +
      `${unknown > 0 ? ` (${unknown} fuera de nuestro diccionario, no comparadas)` : ""}\n${misses.join("\n")}\n`,
  );
};

if (existsSync(`${CACHE}/es_MX.txt`)) {
  measure(
    "español (acierto)",
    sampleOf("es_MX.txt", /^[a-zñáéíóúü]+$/),
    (word) => transcribeSpanish(word).ipa,
    normalizeSpanish,
  );
}

const TSV = "public/cmudict/2025.10.24/en-us.tsv";
if (existsSync(`${CACHE}/en_US.txt`) && existsSync(TSV)) {
  const dictionary = new Map(
    readFileSync(TSV, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [word, phones] = line.split("\t") as [string, string];
        return [word, phones.split("|")] as const;
      }),
  );
  measure(
    "inglés (coherencia con otra conversión de CMUdict)",
    sampleOf("en_US.txt", /^[a-z]+$/),
    (word) => {
      const result = transcribeEnglish(word, (entry) => dictionary.get(entry));
      return result.skipped.length > 0 ? null : result.ipa;
    },
    normalizeEnglish,
  );
}
