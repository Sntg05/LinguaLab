/**
 * Etiquetado de categorías gramaticales (UPOS) con un perceptrón promediado.
 *
 * MÉTODO
 *
 * El perceptrón promediado para etiquetar secuencias de Collins (2002): para
 * cada palabra se calculan rasgos (la palabra, sus sufijos, las palabras de
 * alrededor y las dos etiquetas anteriores), cada rasgo vota por cada etiqueta
 * con un peso, y gana la etiqueta con más votos. Se entrena corrigiendo los
 * pesos cada vez que se equivoca, y al final se promedian todos los pesos que
 * tuvo: el promedio generaliza mejor que el último. Se etiqueta de izquierda a
 * derecha, sin búsqueda: es el diseño de los etiquetadores «ligeros» que se
 * enseñan en los cursos de lingüística computacional.
 *
 * Las categorías son las 17 UPOS de Universal Dependencies, las mismas que usa
 * ArborLab. El modelo se entrena fuera del sitio (`scripts/train-pos.mts`) y la
 * página solo etiqueta.
 *
 * LO QUE NO HACE
 *
 * No tokeniza: recibe las palabras ya separadas. No da probabilidades, solo la
 * etiqueta ganadora. Y su precisión es la medida en el conjunto de prueba del
 * treebank, con la tokenización del treebank: en otro tipo de texto será menor.
 */
import { err, ok, type Result } from "../result";

export const UPOS_TAGS = [
  "ADJ",
  "ADP",
  "ADV",
  "AUX",
  "CCONJ",
  "DET",
  "INTJ",
  "NOUN",
  "NUM",
  "PART",
  "PRON",
  "PROPN",
  "PUNCT",
  "SCONJ",
  "SYM",
  "VERB",
  "X",
] as const;

export type Upos = (typeof UPOS_TAGS)[number];

export interface PosModel {
  readonly tags: readonly string[];
  /** rasgo → pesos por etiqueta (índice de `tags`). */
  readonly weights: ReadonlyMap<string, ReadonlyMap<number, number>>;
  /** Palabras frecuentes que en el entrenamiento llevaron casi siempre la misma etiqueta. */
  readonly dictionary: ReadonlyMap<string, string>;
}

/**
 * La forma de la palabra que ven los rasgos: minúsculas, y los números y las
 * palabras con guion agrupados, porque cada número concreto es casi siempre
 * desconocido pero su clase no.
 */
export const normalizeWord = (word: string): string => {
  if (word.includes("-") && !word.startsWith("-")) return "!HYPHEN";
  if (/^\d{4}$/.test(word)) return "!YEAR";
  if (/^\d/.test(word)) return "!DIGITS";
  return word.toLowerCase();
};

/** Mayúscula inicial, todo mayúsculas, cifra o minúscula: ayuda con los nombres propios. */
const shape = (word: string): string => {
  if (/^\p{Lu}+$/u.test(word)) return "XX";
  if (/^\p{Lu}/u.test(word)) return "Xx";
  if (/^\d/.test(word)) return "d";
  return "x";
};

const START = ["-START-", "-START2-"] as const;
const END = ["-END-", "-END2-"] as const;

/** Los rasgos de la palabra `i` (en el contexto ya rellenado con marcas de inicio y fin). */
const featuresAt = (
  i: number,
  context: readonly string[],
  original: string,
  prev: string,
  prev2: string,
): string[] => {
  const word = context[i] ?? "";
  const suffix = (value: string): string => value.slice(-3);
  return [
    "bias",
    `s:${suffix(word)}`,
    `p:${word.slice(0, 1)}`,
    `t-1:${prev}`,
    `t-2:${prev2}`,
    `t-1t-2:${prev} ${prev2}`,
    `w:${word}`,
    `t-1w:${prev} ${word}`,
    `w-1:${context[i - 1] ?? ""}`,
    `s-1:${suffix(context[i - 1] ?? "")}`,
    `w-2:${context[i - 2] ?? ""}`,
    `w+1:${context[i + 1] ?? ""}`,
    `s+1:${suffix(context[i + 1] ?? "")}`,
    `w+2:${context[i + 2] ?? ""}`,
    `sh:${shape(original)}`,
  ];
};

const padded = (tokens: readonly string[]): string[] => [
  ...START,
  ...tokens.map(normalizeWord),
  ...END,
];

const best = (model: PosModel, features: readonly string[]): number => {
  const scores = new Float64Array(model.tags.length);
  for (const feature of features) {
    const row = model.weights.get(feature);
    if (row === undefined) continue;
    for (const [tag, weight] of row) scores[tag] = (scores[tag] ?? 0) + weight;
  }
  let winner = 0;
  for (let tag = 1; tag < scores.length; tag += 1) {
    // Empate: gana la etiqueta que aparece antes en la lista, para ser estable.
    if ((scores[tag] ?? 0) > (scores[winner] ?? 0)) winner = tag;
  }
  return winner;
};

/** Una etiqueta por palabra, en orden. */
export const tagTokens = (model: PosModel, tokens: readonly string[]): string[] => {
  const context = padded(tokens);
  let prev: string = START[0];
  let prev2: string = START[1];
  return tokens.map((token, index) => {
    const known = model.dictionary.get(normalizeWord(token));
    const tag =
      known ?? model.tags[best(model, featuresAt(index + 2, context, token, prev, prev2))] ?? "X";
    prev2 = prev;
    prev = tag;
    return tag;
  });
};

/* ---------------------------------------------------------------
   Entrenamiento (fuera del sitio, desde scripts/train-pos.mts)
   --------------------------------------------------------------- */

export type TaggedSentence = readonly (readonly [string, string])[];

export interface TrainOptions {
  readonly iterations: number;
  /** Semilla del barajado: la misma semilla da el mismo modelo. */
  readonly seed: number;
  /** Pesos promediados con valor absoluto menor que esto se descartan. */
  readonly prune?: number;
}

/** Generador congruencial: barajado reproducible sin depender de Math.random. */
const random = (seed: number): (() => number) => {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
};

/** Palabras frecuentes (≥ 20) que llevaron la misma etiqueta al menos el 97 % de las veces. */
const buildDictionary = (corpus: readonly TaggedSentence[]): Map<string, string> => {
  const counts = new Map<string, Map<string, number>>();
  for (const sentence of corpus) {
    for (const [word, tag] of sentence) {
      const key = normalizeWord(word);
      const row = counts.get(key) ?? new Map<string, number>();
      row.set(tag, (row.get(tag) ?? 0) + 1);
      counts.set(key, row);
    }
  }
  const dictionary = new Map<string, string>();
  for (const [word, row] of counts) {
    const total = [...row.values()].reduce((a, b) => a + b, 0);
    const [tag, top] = [...row].reduce((a, b) => (b[1] > a[1] ? b : a));
    if (total >= 20 && top / total >= 0.97) dictionary.set(word, tag);
  }
  return dictionary;
};

export const trainPosModel = (
  corpus: readonly TaggedSentence[],
  options: TrainOptions,
): PosModel => {
  const tags = [...new Set(corpus.flatMap((sentence) => sentence.map(([, tag]) => tag)))].sort();
  const tagIndex = new Map(tags.map((tag, index) => [tag, index]));
  const dictionary = buildDictionary(corpus);
  const weights = new Map<string, Map<number, number>>();
  const totals = new Map<string, number>();
  const stamps = new Map<string, number>();
  let instances = 0;

  const model: PosModel = { tags, weights, dictionary: new Map() };
  const update = (feature: string, tag: number, delta: number): void => {
    const key = `${feature}\u0000${tag}`;
    const row = weights.get(feature) ?? new Map<number, number>();
    const current = row.get(tag) ?? 0;
    totals.set(key, (totals.get(key) ?? 0) + (instances - (stamps.get(key) ?? 0)) * current);
    stamps.set(key, instances);
    row.set(tag, current + delta);
    weights.set(feature, row);
  };

  const order = corpus.map((_, index) => index);
  const next = random(options.seed);
  for (let iteration = 0; iteration < options.iterations; iteration += 1) {
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [order[i], order[j]] = [order[j] as number, order[i] as number];
    }
    for (const index of order) {
      const sentence = corpus[index] ?? [];
      const words = sentence.map(([word]) => word);
      const context = padded(words);
      let prev: string = START[0];
      let prev2: string = START[1];
      for (const [position, [word, gold]] of sentence.entries()) {
        const truth = tagIndex.get(gold) ?? 0;
        let guess = dictionary.has(normalizeWord(word)) ? truth : -1;
        if (guess < 0) {
          const features = featuresAt(position + 2, context, word, prev, prev2);
          guess = best(model, features);
          instances += 1;
          if (guess !== truth) {
            for (const feature of features) {
              update(feature, truth, 1);
              update(feature, guess, -1);
            }
          }
        }
        prev2 = prev;
        prev = tags[guess] ?? gold;
      }
    }
  }

  // Promedio: cada peso pesa por el tiempo que estuvo vigente.
  const prune = options.prune ?? 0;
  const averaged = new Map<string, Map<number, number>>();
  for (const [feature, row] of weights) {
    const out = new Map<number, number>();
    for (const [tag, weight] of row) {
      const key = `${feature}\u0000${tag}`;
      const total = (totals.get(key) ?? 0) + (instances - (stamps.get(key) ?? 0)) * weight;
      const value = Math.round((total / Math.max(1, instances)) * 1000) / 1000;
      if (Math.abs(value) > prune) out.set(tag, value);
    }
    if (out.size > 0) averaged.set(feature, out);
  }
  return { tags, weights: averaged, dictionary };
};

/* ---------------------------------------------------------------
   Archivo del modelo
   --------------------------------------------------------------- */

const HEADER = "lingualab-pos\t1";

/**
 * Texto con una línea por rasgo: `F\trasgo\tetiqueta:peso,…`, y una por palabra
 * del diccionario: `D\tpalabra\tetiqueta`. Las líneas van ordenadas, así que el
 * mismo modelo da siempre el mismo archivo.
 */
export const serializePosModel = (model: PosModel): string => {
  const lines = [HEADER, `T\t${model.tags.join(" ")}`];
  for (const [word, tag] of [...model.dictionary].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    lines.push(`D\t${word}\t${tag}`);
  }
  for (const feature of [...model.weights.keys()].sort()) {
    const row = model.weights.get(feature) ?? new Map<number, number>();
    const cells = [...row].sort(([a], [b]) => a - b).map(([tag, weight]) => `${tag}:${weight}`);
    lines.push(`F\t${feature}\t${cells.join(",")}`);
  }
  return `${lines.join("\n")}\n`;
};

export const parsePosModel = (text: string): Result<PosModel, "not-a-model"> => {
  const lines = text.split("\n");
  if (lines[0] !== HEADER || !(lines[1] ?? "").startsWith("T\t")) return err("not-a-model");
  const tags = (lines[1] ?? "").slice(2).split(" ");
  const weights = new Map<string, Map<number, number>>();
  const dictionary = new Map<string, string>();
  for (const line of lines.slice(2)) {
    if (line === "") continue;
    const [kind, key, value] = line.split("\t");
    if (key === undefined || value === undefined) return err("not-a-model");
    if (kind === "D") dictionary.set(key, value);
    else if (kind === "F") {
      const row = new Map<number, number>();
      for (const cell of value.split(",")) {
        const [tag, weight] = cell.split(":");
        row.set(Number(tag), Number(weight));
      }
      weights.set(key, row);
    } else return err("not-a-model");
  }
  return ok({ tags, weights, dictionary });
};
