/* ============================================================
   LinguaLab — estación de texto: reglas de la página
   Rótulos, filas de cada panel, avisos y el contenido de la exportación,
   sin DOM, para que tengan prueba. El cableado vive en `station.ts`.
   ============================================================ */

import type { Locale } from "../../i18n";
import { byteLength } from "../core/guardrails";
import { type LexicalStats, frequency, ngrams, statistics } from "./analysis";
import type { NgramSettings, NgramSortKey } from "./ngram-settings";
import { type ReadabilityResult, readability } from "./readability";
import type { StopwordMode, Token } from "./tokenize";

/** Las filas que muestra la tabla de frecuencias. */
const FREQUENCY_ROWS = 50;
/** Las que entran en la exportación. */
const EXPORT_FREQUENCY_ROWS = 200;
/** Las concordancias que se muestran; el resto solo se cuenta. */
export const KWIC_ROWS = 100;
const BYTES_PER_KB = 1024;

/** «bigramas», «trigramas», «4-gramas»… para el tamaño dado. */
export const gramLabel = (n: number, es: boolean): string => {
  if (n === 2) return es ? "bigramas" : "bigrams";
  if (n === 3) return es ? "trigramas" : "trigrams";
  return es ? `${n}-gramas` : `${n}-grams`;
};

/** Lo mismo en singular, para encabezados y frases. */
export const gramLabelSingular = (n: number, es: boolean): string => {
  if (n === 2) return es ? "Bigrama" : "Bigram";
  if (n === 3) return es ? "Trigrama" : "Trigram";
  return es ? `${n}-grama` : `${n}-gram`;
};

export const measureLabel = (key: NgramSortKey, es: boolean): string => {
  switch (key) {
    case "logDice":
      return "log-Dice";
    case "pmi":
      return "PMI";
    case "tScore":
      return "t-score";
    case "count":
      return es ? "recuento" : "count";
    default:
      return "G²";
  }
};

/**
 * Las medidas de asociación necesitan pares repetidos, así que un texto corto
 * puede no dar nada con todo derecho. Se dice por qué y qué ajuste lo explica.
 */
export const noRepeatsMessage = (n: number, minCount: number, es: boolean): string => {
  const gram = gramLabelSingular(n, es).toLowerCase();
  const times = minCount === 1 ? (es ? "vez" : "time") : es ? "veces" : "times";
  return es
    ? `Ningún ${gram} se repite al menos ${minCount} ${times}. Las medidas de asociación necesitan n-gramas repetidos: baja la frecuencia mínima, reduce n o prueba con un texto más largo.`
    : `No ${gram} repeats at least ${minCount} ${times}. Association measures need repeated n-grams: lower the minimum frequency, reduce n, or try a longer text.`;
};

export const concordanceNote = (count: number, es: boolean): string => {
  const capped = count > KWIC_ROWS ? (es ? ` (primeras ${KWIC_ROWS})` : ` (first ${KWIC_ROWS})`) : "";
  return `${count} ${es ? "concordancias" : "concordances"}${capped}`;
};

export interface FrequencyRow {
  /** Rango, forma, recuento, frecuencia relativa y dispersión, ya con su formato. */
  readonly cells: readonly string[];
  /** El recuento, para la barra. */
  readonly count: number;
}

export const frequencyRows = (
  tokens: readonly Token[],
  stopwords: StopwordMode,
): readonly FrequencyRow[] =>
  frequency(tokens, { stopwords })
    .slice(0, FREQUENCY_ROWS)
    .map((entry) => ({
      cells: [
        String(entry.rank),
        entry.display,
        String(entry.count),
        entry.relative.toFixed(4),
        entry.dispersion.toFixed(2),
      ],
      count: entry.count,
    }));

export const statsRows = (stats: LexicalStats, es: boolean): readonly [string, string][] => [
  [es ? "Palabras (tokens)" : "Tokens", String(stats.tokens)],
  [es ? "Formas (types)" : "Types", String(stats.types)],
  ["TTR", stats.ttr.toFixed(4)],
  ["MSTTR", stats.msttr.toFixed(4)],
  ["Hapax", `${stats.hapax} (${(stats.hapaxRatio * 100).toFixed(1)} %)`],
  ["Dis legomena", String(stats.dislegomena)],
  [es ? "Entropía (bits)" : "Entropy (bits)", stats.entropy.toFixed(3)],
  [es ? "Pendiente de Zipf" : "Zipf slope", stats.zipfSlope.toFixed(3)],
  [es ? "Oraciones" : "Sentences", String(stats.sentences)],
  [es ? "Palabras por oración" : "Words per sentence", stats.avgWordsPerSentence.toFixed(2)],
  [es ? "Letras por palabra" : "Letters per word", stats.avgWordLength.toFixed(2)],
  [es ? "Palabra más larga" : "Longest word", stats.longestWord],
];

export const readabilityRows = (
  result: ReadabilityResult,
  locale: Locale,
): readonly [string, string][] => {
  const es = locale === "es";
  const { counts } = result;
  const indices = [
    ["Fernández-Huerta", result.spanish.fernandezHuerta],
    ["Szigriszt-Pazos", result.spanish.szigrisztPazos],
    ["Gutiérrez de Polini", result.spanish.gutierrezDePolini],
    ["INFLESZ", result.spanish.inflesz],
    ["Flesch Reading Ease", result.english.fleschReadingEase],
    ["Flesch–Kincaid", result.english.fleschKincaidGrade],
    ["Gunning Fog", result.english.gunningFog],
    ["SMOG", result.english.smog],
    ["ARI", result.english.ari],
    ["Coleman–Liau", result.english.colemanLiau],
  ] as const;

  return [
    [es ? "Oraciones" : "Sentences", String(counts.sentences)],
    [es ? "Palabras" : "Words", String(counts.words)],
    [es ? "Sílabas" : "Syllables", String(counts.syllables)],
    [es ? "Sílabas por palabra" : "Syllables per word", counts.syllablesPerWord.toFixed(2)],
    [es ? "Palabras por oración" : "Words per sentence", counts.wordsPerSentence.toFixed(2)],
    ...indices.map(
      ([label, index]): [string, string] => [label, `${index.score.toFixed(1)} · ${index.band[locale]}`],
    ),
  ];
};

const kilobytes = (bytes: number): string => (bytes / BYTES_PER_KB).toFixed(1);

export const sizeErrorMessage = (bytes: number, es: boolean): string =>
  es
    ? `El texto supera el límite de 100 KB (${kilobytes(bytes)} KB).`
    : `The text exceeds the 100 KB limit (${kilobytes(bytes)} KB).`;

export const fileErrorMessage = (messageKey: string, es: boolean): string => {
  if (messageKey === "guardrail.err.ext") return es ? "Extensión no permitida." : "Extension not allowed.";
  return es ? "El archivo supera el límite de 100 KB." : "The file exceeds the 100 KB limit.";
};

/** Tamaño en KB y palabras separadas por espacios; un texto en blanco tiene cero. */
export const counterLabel = (text: string, es: boolean): string => {
  const trimmed = text.trim();
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  return `${kilobytes(byteLength(text))} KB · ${words} ${es ? "palabras" : "words"}`;
};

export const analysisReady = (words: number, es: boolean): string =>
  es ? `Análisis listo: ${words} palabras.` : `Analysis ready: ${words} words.`;

export interface ExportInput {
  readonly tokens: readonly Token[];
  readonly sentences: number;
  readonly text: string;
  readonly locale: Locale;
  readonly stopwords: StopwordMode;
  readonly settings: NgramSettings;
  readonly readabilityLang: "es" | "en";
  /** La fecha ISO de la exportación: se pasa para que la prueba la fije. */
  readonly generated: string;
}

/** Lo que guarda «Exportar», con los ajustes que produjeron cada resultado. */
export const exportPayload = (input: ExportInput) => {
  const { tokens, stopwords, settings } = input;
  return {
    tool: "LinguaLab text station",
    generated: input.generated,
    lang: input.locale,
    stopwords,
    statistics: statistics(tokens, { stopwords, sentences: input.sentences }),
    frequency: frequency(tokens, { stopwords }).slice(0, EXPORT_FREQUENCY_ROWS),
    // Se conservan de antes del constructor para que las exportaciones viejas sigan leyéndose.
    bigrams: ngrams(tokens, 2, { stopwords, minCount: 2, limit: 100 }),
    trigrams: ngrams(tokens, 3, { stopwords, minCount: 2, limit: 100 }),
    // El resultado del constructor, con los ajustes que lo produjeron.
    ngrams: {
      ...settings,
      results: ngrams(tokens, settings.n, {
        stopwords,
        minCount: settings.minCount,
        limit: settings.limit,
        sortBy: settings.sortBy,
      }),
    },
    readability: readability(input.text, input.readabilityLang),
  };
};
