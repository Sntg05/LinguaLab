/**
 * Entrena los etiquetadores POS de la estación de texto y mide su precisión.
 *
 * POR QUÉ EXISTE
 *
 * Una etiqueta gramatical no se puede publicar sin decir cuánto acierta. Este
 * script entrena el perceptrón de `packages/core/src/pos/tagger.ts` con la parte
 * `train` de dos treebanks de Universal Dependencies, lo mide con la parte
 * `test`, que el modelo nunca vio, y escribe el modelo y la cifra.
 *
 * DATOS (commits fijos, sha256 comprobado; si no coincide, no escribe nada)
 *   - español: UD_Spanish-AnCora, CC BY 4.0
 *   - inglés:  UD_English-EWT, CC BY-SA 4.0 (el modelo derivado se publica con
 *     la misma licencia)
 *
 * SALIDA
 *   public/pos/<versión>/{es,en}.tsv, LICENSE y README.md
 *   src/data/pos-accuracy.json (la página muestra esta cifra)
 *
 * Uso: node scripts/run-ts.mjs scripts/train-pos.mts
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeWord,
  serializePosModel,
  type TaggedSentence,
  tagTokens,
  trainPosModel,
} from "../packages/core/src/pos/tagger";

const ROOT = process.cwd();
const VERSION = "2026.11.20";
const CACHE = join(ROOT, "node_modules", ".cache", "ud");
const OUT = join(ROOT, "public", "pos", VERSION);

const TREEBANKS = {
  es: {
    repo: "UD_Spanish-AnCora",
    commit: "3ea1f747220979d91787a6d04b85734a42bf22a4",
    license: "CC BY 4.0",
    files: {
      "es_ancora-ud-train.conllu": "acb96e0b3d28d8ae0288e0fb0a2d5243bd352c86bcecc0773deef5f40e612f83",
      "es_ancora-ud-test.conllu": "4d74d95cfe5a53eacaa7adf3b7ae6ef76a7df9806fd519113e25d74c43ad2b9c",
    },
  },
  en: {
    repo: "UD_English-EWT",
    commit: "491be069d36e378f67c29f183699eea88308ea42",
    license: "CC BY-SA 4.0",
    files: {
      "en_ewt-ud-train.conllu": "fa6b2c9fc048273ee52f9609bcdc5880df366b6b72847e01a353259ea78c2a37",
      "en_ewt-ud-test.conllu": "5b5df91ca23677345b941dc58d81617753e0d2d8bee12094e2a25cead3c18973",
    },
  },
} as const;

const sha256 = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex");

const obtain = async (repo: string, commit: string, name: string, hash: string): Promise<string> => {
  const cached = join(CACHE, name);
  let data: Buffer | null = null;
  try {
    data = readFileSync(cached);
  } catch {
    data = null;
  }
  if (data === null || sha256(data) !== hash) {
    const url = `https://raw.githubusercontent.com/UniversalDependencies/${repo}/${commit}/${name}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`train-pos: ${url} responde ${response.status}`);
    data = Buffer.from(await response.arrayBuffer());
    if (sha256(data) !== hash) throw new Error(`train-pos: ${name} no tiene el sha256 esperado`);
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(cached, data);
  }
  return data.toString("utf8");
};

/**
 * Las oraciones de un CoNLL-U: palabra sintáctica (FORM) y su UPOS. Se saltan
 * las líneas de rango («2-3 del», que se analiza como «de» + «el») y los nodos
 * vacíos («8.1»): se etiqueta lo que analiza el treebank.
 */
const readConllu = (text: string): TaggedSentence[] => {
  const sentences: [string, string][][] = [];
  let current: [string, string][] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "") {
      if (current.length > 0) sentences.push(current);
      current = [];
      continue;
    }
    if (line.startsWith("#")) continue;
    const cols = line.split("\t");
    if (!/^\d+$/.test(cols[0] ?? "")) continue;
    current.push([cols[1] ?? "", cols[3] ?? "X"]);
  }
  if (current.length > 0) sentences.push(current);
  return sentences;
};

mkdirSync(OUT, { recursive: true });
const accuracy: Record<string, { tokens: number; accuracy: number; unknownAccuracy: number }> = {};

for (const [lang, bank] of Object.entries(TREEBANKS)) {
  const [trainName, testName] = Object.keys(bank.files) as [string, string];
  const files = bank.files as Record<string, string>;
  const train = readConllu(await obtain(bank.repo, bank.commit, trainName, files[trainName] ?? ""));
  const test = readConllu(await obtain(bank.repo, bank.commit, testName, files[testName] ?? ""));
  process.stdout.write(`train-pos: ${lang}: ${train.length} oraciones de entrenamiento…\n`);
  const model = trainPosModel(train, { iterations: 5, seed: 13, prune: 0.3 });

  const seen = new Set(train.flatMap((sentence) => sentence.map(([word]) => normalizeWord(word))));
  let hits = 0;
  let total = 0;
  let unknownHits = 0;
  let unknown = 0;
  for (const sentence of test) {
    const predicted = tagTokens(model, sentence.map(([word]) => word));
    for (const [index, [word, gold]] of sentence.entries()) {
      const right = predicted[index] === gold;
      total += 1;
      if (right) hits += 1;
      if (!seen.has(normalizeWord(word))) {
        unknown += 1;
        if (right) unknownHits += 1;
      }
    }
  }
  const round = (value: number): number => Math.round(value * 10000) / 10000;
  accuracy[lang] = { tokens: total, accuracy: round(hits / total), unknownAccuracy: round(unknownHits / unknown) };
  const tsv = serializePosModel(model);
  writeFileSync(join(OUT, `${lang}.tsv`), tsv, { mode: 0o644 });
  process.stdout.write(
    `train-pos: ${lang}: ${(hits / total * 100).toFixed(2)} % en ${total} palabras de prueba; ` +
      `${(unknownHits / unknown * 100).toFixed(2)} % en ${unknown} desconocidas; ` +
      `modelo ${(tsv.length / 1024 / 1024).toFixed(2)} MB, sha256 ${sha256(Buffer.from(tsv))}\n`,
  );
}

const pct = (value: number | undefined): string => ((value ?? 0) * 100).toFixed(2);

writeFileSync(
  join(ROOT, "src", "data", "pos-accuracy.json"),
  `${JSON.stringify({ version: VERSION, ...accuracy }, null, 2)}\n`,
);
writeFileSync(
  join(OUT, "LICENSE"),
  `Modelos derivados de treebanks de Universal Dependencies.

es.tsv: entrenado con UD_Spanish-AnCora (commit ${TREEBANKS.es.commit}),
  licencia Creative Commons Attribution 4.0 International (CC BY 4.0).
en.tsv: entrenado con UD_English-EWT (commit ${TREEBANKS.en.commit}),
  licencia Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0).
  Como obra derivada, en.tsv se distribuye bajo CC BY-SA 4.0.

https://creativecommons.org/licenses/by/4.0/legalcode
https://creativecommons.org/licenses/by-sa/4.0/legalcode
`,
  { mode: 0o644 },
);
writeFileSync(
  join(OUT, "README.md"),
  `# pos ${VERSION}

Etiquetadores UPOS (perceptrón promediado, Collins 2002) de la estación de texto de LinguaLab. Los
genera \`scripts/train-pos.mts\`; no se editan a mano. Licencias y procedencia en \`LICENSE\`.

| Lengua | Treebank | Precisión en \`test\` | Palabras desconocidas |
|---|---|---|---|
| es | UD_Spanish-AnCora | ${pct(accuracy["es"]?.accuracy)} % de ${accuracy["es"]?.tokens} | ${pct(accuracy["es"]?.unknownAccuracy)} % |
| en | UD_English-EWT | ${pct(accuracy["en"]?.accuracy)} % de ${accuracy["en"]?.tokens} | ${pct(accuracy["en"]?.unknownAccuracy)} % |

La precisión se mide con la tokenización del treebank. Sobre otro tipo de texto, o con otra
tokenización, será menor.
`,
  { mode: 0o644 },
);
