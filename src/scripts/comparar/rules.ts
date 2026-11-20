/* ============================================================
   LinguaLab — comparación de documentos: las decisiones de la página

   Sin DOM, con pruebas: la frase de cada fallo, cómo se escribe una cifra, qué
   documentos se aceptan y qué se descarga. `index.ts` solo conecta.
   ============================================================ */

import { type DocumentReadError, toCsv } from "@lingualab/core";
import {
  type KeywordList,
  type PreparedDocument,
  documentProfile,
  frequencyTable,
} from "../tools/compare";
import type { StopwordMode } from "../tools/tokenize";
import type { CompareStringKey, CompareStrings } from "./strings";

export const MAX_DOCUMENTS = 3;
export const MIN_DOCUMENTS = 2;

/** La frase de un fallo de lectura, con el nombre del archivo. */
export const describeReadError = (
  error: DocumentReadError,
  name: string,
  strings: CompareStrings,
): string => {
  const key: CompareStringKey = `cmp.error.${error.code}`;
  return strings.format(key, { name });
};

export type Admission = "ok" | "tooMany" | "duplicate";

/** Si un archivo más cabe: como máximo tres, y no dos veces el mismo nombre. */
export const admit = (loaded: readonly string[], name: string): Admission => {
  if (loaded.includes(name)) return "duplicate";
  return loaded.length >= MAX_DOCUMENTS ? "tooMany" : "ok";
};

const localeTag = (locale: string): string => (locale === "en" ? "en" : "es");

export const formatDecimal = (value: number, locale: string, digits = 2): string =>
  value.toLocaleString(localeTag(locale), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** p con tres cifras significativas; por debajo de 0,0001 se escribe como «< 0,0001». */
export const formatP = (p: number, locale: string): string =>
  p < 0.0001
    ? `< ${formatDecimal(0.0001, locale, 4)}`
    : p.toLocaleString(localeTag(locale), { maximumSignificantDigits: 3 });

/** Filas del perfil: una medida por fila, un documento por columna. */
export const profileRows = (
  documents: readonly PreparedDocument[],
  stopwords: StopwordMode,
  locale: string,
  strings: CompareStrings,
): readonly (readonly string[])[] => {
  const profiles = documents.map((document) => documentProfile(document, "none"));
  const content = documents.map((document) => documentProfile(document, stopwords));
  const row = (key: CompareStringKey, value: (index: number) => string): string[] => [
    strings.text(key),
    ...documents.map((_, index) => value(index)),
  ];
  return [
    row("cmp.measure.tokens", (index) => String(profiles[index]?.tokens ?? 0)),
    row("cmp.measure.types", (index) => String(content[index]?.types ?? 0)),
    row("cmp.measure.ttr", (index) => formatDecimal(content[index]?.ttr ?? 0, locale, 3)),
    row("cmp.measure.msttr", (index) => formatDecimal(content[index]?.msttr ?? 0, locale, 3)),
    row("cmp.measure.hapax", (index) => formatDecimal((content[index]?.hapaxRatio ?? 0) * 100, locale, 1)),
    row("cmp.measure.sentences", (index) => String(profiles[index]?.sentences ?? 0)),
    row("cmp.measure.wordsPerSentence", (index) =>
      formatDecimal(profiles[index]?.avgWordsPerSentence ?? 0, locale, 1),
    ),
  ];
};

/* ---------------------------------------------------------------
   Descargas: CSV con punto decimal y cifras completas, para R o una hoja
   de cálculo. La página redondea; el archivo no.
   --------------------------------------------------------------- */

export const keywordsCsv = (
  documents: readonly PreparedDocument[],
  lists: readonly KeywordList[],
): string =>
  toCsv([
    ["document", "direction", "word", "here", "rest", "here_per_10k", "rest_per_10k", "g2", "p", "log_ratio"],
    ...lists.flatMap((list, index) =>
      (["positive", "negative"] as const).flatMap((direction) =>
        list[direction].map((row) => [
          documents[index]?.name ?? "",
          direction,
          row.display,
          String(row.here),
          String(row.rest),
          String(row.herePer10k),
          String(row.restPer10k),
          String(row.g2),
          String(row.p),
          String(row.logRatio),
        ]),
      ),
    ),
  ]);

export const frequencyCsv = (
  documents: readonly PreparedDocument[],
  stopwords: StopwordMode,
  top: number,
): string =>
  toCsv([
    [
      "word",
      ...documents.flatMap((document) => [`${document.name}_count`, `${document.name}_per_10k`]),
    ],
    ...frequencyTable(documents, stopwords, top).map((row) => [
      row.display,
      ...row.counts.flatMap((count, index) => [String(count), String(row.per10k[index] ?? 0)]),
    ]),
  ]);

export const profileCsv = (documents: readonly PreparedDocument[], stopwords: StopwordMode): string => {
  const all = documents.map((document) => documentProfile(document, "none"));
  const content = documents.map((document) => documentProfile(document, stopwords));
  return toCsv([
    ["document", "words", "types", "ttr", "msttr", "hapax_share", "sentences", "words_per_sentence"],
    ...documents.map((document, index) => [
      document.name,
      String(all[index]?.tokens ?? 0),
      String(content[index]?.types ?? 0),
      String(content[index]?.ttr ?? 0),
      String(content[index]?.msttr ?? 0),
      String(content[index]?.hapaxRatio ?? 0),
      String(all[index]?.sentences ?? 0),
      String(all[index]?.avgWordsPerSentence ?? 0),
    ]),
  ]);
};
