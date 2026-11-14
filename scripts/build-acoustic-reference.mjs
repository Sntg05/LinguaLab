/**
 * Genera las referencias de Praat con las que se valida el análisis acústico.
 *
 * POR QUÉ EXISTE
 *
 * El visor acústico mide F0 y formantes con praatfan, una reimplementación de
 * los algoritmos de Praat. «Coincide con Praat» no se puede afirmar sin correr
 * el mismo audio por el Praat oficial y comparar: este script hace la mitad de
 * Praat y deja el resultado en `e2e/fixtures/reference/`; la otra mitad es el
 * arnés `packages/adapters/src/acoustic/validation/`.
 *
 * Se versionan los resultados y no solo el script, para que la validación
 * corra en CI, donde no hay Praat. Volver a generarlos exige `praat` y `ffmpeg`
 * en la máquina.
 *
 * LOS AUDIOS
 *
 * Tres vocales cardinales ([a], [e], [i]) de las grabaciones del AFI que el
 * sitio ya publica en `public/audio/ipa/` (Wikimedia Commons, CC BY-SA 3.0;
 * atribución en `public/audio/ATTRIBUTION.md`). Se convierten de Ogg a WAV PCM
 * de 16 bits sin cambiar la frecuencia de muestreo, y Praat y el arnés leen
 * ESE mismo WAV: así la comparación no depende de dos decodificadores de Ogg.
 *
 * QUÉ SE MIDE
 *
 * En tres marcos del análisis de formantes (al 30 %, 50 % y 70 % del tramo con
 * voz, que es la vocal: las grabaciones traen silencio alrededor): F1 y F2 en el instante exacto del marco, y F0 del marco de tono
 * más cercano. El arnés toma el marco más cercano, así que medir en instantes
 * de marco evita comparar dos interpolaciones distintas.
 *
 * Uso: node scripts/build-acoustic-reference.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "e2e", "fixtures", "reference");
const SCRATCH = join(ROOT, "node_modules", ".cache", "acoustic-reference");

const VOWELS = [
  { name: "vocal-a", source: "61.ogg" },
  { name: "vocal-e", source: "65.ogg" },
  { name: "vocal-i", source: "69.ogg" },
];
const PITCH = { floorHz: 75, ceilingHz: 600 };
/** 5000 Hz y cinco formantes: el ajuste estándar de Praat para una voz masculina adulta. */
const FORMANT = { maxFormantHz: 5000, count: 5 };

const PRAAT_SCRIPT = `
form: "Referencia"
  sentence: "wav", ""
endform
sound = Read from file: wav$
duration = Get total duration
selectObject: sound
pitch = To Pitch: 0, ${PITCH.floorHz}, ${PITCH.ceilingHz}
selectObject: sound
formant = To Formant (burg): 0, ${FORMANT.count}, ${FORMANT.maxFormantHz}, 0.025, 50
selectObject: pitch
frames = Get number of frames
first = 0
last = 0
for k from 1 to frames
  value = Get value in frame: k, "Hertz"
  if value <> undefined
    if first = 0
      first = k
    endif
    last = k
  endif
endfor
start = Get time from frame number: first
end = Get time from frame number: last
for i from 1 to 3
  selectObject: formant
  frame = Get frame number from time: start + (end - start) * (0.1 + 0.2 * i)
  t = Get time from frame number: round (frame)
  f1 = Get value at time: 1, t, "hertz", "linear"
  f2 = Get value at time: 2, t, "hertz", "linear"
  selectObject: pitch
  f0 = Get value at time: t, "Hertz", "nearest"
  writeInfoLine: fixed$ (t, 6), tab$, fixed$ (f0, 4), tab$, fixed$ (f1, 4), tab$, fixed$ (f2, 4)
  appendFileLine: wav$ + ".tsv", info$ ()
endfor
`;

mkdirSync(OUT, { recursive: true });
mkdirSync(SCRATCH, { recursive: true });
const scriptPath = join(SCRATCH, "reference.praat");
writeFileSync(scriptPath, PRAAT_SCRIPT);

const praatVersion = execFileSync("praat", ["--version"], { encoding: "utf8" })
  .match(/Praat (\S+)/)?.[1];
if (!praatVersion) throw new Error("build-acoustic-reference: no se pudo leer la versión de Praat");

for (const { name, source } of VOWELS) {
  const wav = join(OUT, `${name}.wav`);
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    "-i", join(ROOT, "public", "audio", "ipa", source),
    "-ac", "1", "-c:a", "pcm_s16le", "-bitexact", "-map_metadata", "-1",
    wav,
  ]);
  const tsv = `${wav}.tsv`;
  writeFileSync(tsv, "");
  execFileSync("praat", ["--run", scriptPath, wav]);
  const points = readFileSync(tsv, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [time, f0, f1, f2] = line.split("\t").map(Number);
      if (![time, f0, f1, f2].every(Number.isFinite)) {
        throw new Error(`build-acoustic-reference: ${name} tiene un valor indefinido: «${line}»`);
      }
      return { time, f0, f1, f2 };
    });
  rmSync(tsv);
  if (points.length !== 3) throw new Error(`build-acoustic-reference: ${name} dio ${points.length} puntos`);
  writeFileSync(
    join(OUT, `${name}.json`),
    `${JSON.stringify({ praatVersion, audio: `${name}.wav`, source: `public/audio/ipa/${source}`, pitch: PITCH, formant: FORMANT, points }, null, 2)}\n`,
  );
  process.stdout.write(`build-acoustic-reference: ${name} ${JSON.stringify(points)}\n`);
}
