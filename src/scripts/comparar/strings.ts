/* ============================================================
   LinguaLab — cadenas en tiempo de ejecución de la comparación de documentos

   Solo estas claves viajan al navegador, ya traducidas (ADR 0004). La lista es
   `satisfies readonly MessageKey[]`: una clave mal escrita rompe `npm run check`.
   ============================================================ */

import type { MessageKey } from "../../i18n";

const KEYS = [
  "cmp.status.ready",
  "cmp.status.reading",
  "cmp.status.loaded",
  "cmp.status.compared",
  "cmp.status.removed",
  "cmp.status.kwic",
  "cmp.error.tooMany",
  "cmp.error.tooFew",
  "cmp.error.duplicate",
  "cmp.error.unsupported-format",
  "cmp.error.too-large",
  "cmp.error.corrupt",
  "cmp.error.encrypted",
  "cmp.error.no-text",
  "cmp.error.read",
  "cmp.keywords.positive",
  "cmp.keywords.negative",
  "cmp.keywords.tested",
  "cmp.vocabulary.shared",
  "cmp.vocabulary.unique",
  "cmp.vocabulary.jaccard",
  "cmp.col.document",
  "cmp.col.measure",
  "cmp.col.word",
  "cmp.col.here",
  "cmp.col.rest",
  "cmp.col.herePer10k",
  "cmp.col.restPer10k",
  "cmp.col.g2",
  "cmp.col.p",
  "cmp.col.logRatio",
  "cmp.col.pair",
  "cmp.col.left",
  "cmp.col.node",
  "cmp.col.right",
  "cmp.measure.tokens",
  "cmp.measure.types",
  "cmp.measure.ttr",
  "cmp.measure.msttr",
  "cmp.measure.hapax",
  "cmp.measure.sentences",
  "cmp.measure.wordsPerSentence",
  "cmp.remove",
  "cmp.removeLabel",
  "cmp.pages",
  "cmp.words",
  "cmp.none",
] as const satisfies readonly MessageKey[];

export const COMPARE_STRING_KEYS: readonly MessageKey[] = KEYS;

export type CompareStringKey = (typeof KEYS)[number];

export interface CompareStrings {
  readonly text: (key: CompareStringKey) => string;
  readonly format: (key: CompareStringKey, values: Readonly<Record<string, string | number>>) => string;
}

const fill = (template: string, values: Readonly<Record<string, string | number>>): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });

/** Copia solo cadenas de claves conocidas: un atributo manipulado no llega a la página. */
export const parseCompareStrings = (raw: string | undefined): Readonly<Record<string, string>> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw ?? "");
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) return {};
  const record = parsed as Record<string, unknown>;
  const values: Record<string, string> = {};
  for (const key of KEYS) {
    const value = record[key];
    if (typeof value === "string") values[key] = value;
  }
  return values;
};

export const createCompareStrings = (values: Readonly<Record<string, string>>): CompareStrings => ({
  text: (key) => values[key] ?? key,
  format: (key, holes) => fill(values[key] ?? key, holes),
});
