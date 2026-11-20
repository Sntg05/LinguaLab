/* ============================================================
   LinguaLab — cadenas en tiempo de ejecución del análisis cualitativo

   El diccionario completo no llega al navegador (ADR 0004): el componente
   serializa solo estas claves, ya traducidas, y el controlador las usa. La
   lista es `satisfies readonly MessageKey[]`: una clave mal escrita rompe
   `npm run check` en vez de mostrarse cruda en la página.
   ============================================================ */

import type { MessageKey } from "../../i18n";

const KEYS = [
  "qual.status.ready",
  "qual.status.codeAdded",
  "qual.status.codeRemoved",
  "qual.status.codebookLoaded",
  "qual.status.split",
  "qual.status.resumed",
  "qual.status.example",
  "qual.status.agreement",
  "qual.status.textLoaded",
  "qual.status.restored",
  "qual.status.reset",
  "qual.status.notSaved",
  "qual.retrieve.count",
  "qual.memo",
  "qual.csv.unknownParent",
  "qual.csv.parentCycle",
  "qual.csv.invalidColor",
  "qual.error.codeEmpty",
  "qual.error.codeDuplicate",
  "qual.error.materialEmpty",
  "qual.error.codebook",
  "qual.error.coding",
  "qual.error.agreementFew",
  "qual.error.mismatch",
  "qual.error.file",
  "qual.csv.unclosedQuote",
  "qual.csv.missingCodeColumn",
  "qual.csv.emptyName",
  "qual.csv.duplicateName",
  "qual.csv.empty",
  "qual.csv.badHeader",
  "qual.csv.noCodes",
  "qual.csv.badCodeName",
  "qual.csv.duplicateSegment",
  "qual.csv.badMark",
  "qual.col.code",
  "qual.col.definition",
  "qual.col.segment",
  "qual.col.text",
  "qual.col.segments",
  "qual.col.share",
  "qual.col.complete",
  "qual.col.percent",
  "qual.col.kappa",
  "qual.col.alpha",
  "qual.col.actions",
  "qual.remove",
  "qual.removeLabel",
  "qual.markLabel",
  "qual.mine",
  "qual.notComputable",
  "qual.band.poor",
  "qual.band.slight",
  "qual.band.fair",
  "qual.band.moderate",
  "qual.band.substantial",
  "qual.band.almost-perfect",
  "qual.verdict.reliable",
  "qual.verdict.tentative",
  "qual.verdict.unreliable",
] as const satisfies readonly MessageKey[];

export const QUALITATIVE_STRING_KEYS: readonly MessageKey[] = KEYS;

export type QualitativeStringKey = (typeof KEYS)[number];

export interface QualitativeStrings {
  readonly text: (key: QualitativeStringKey) => string;
  readonly format: (
    key: QualitativeStringKey,
    values: Readonly<Record<string, string | number>>,
  ) => string;
}

/** Reemplaza `{nombre}`; un hueco sin valor queda como está, visible. */
export const fill = (template: string, values: Readonly<Record<string, string | number>>): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });

/** Copia solo lo que es una cadena de una clave conocida: un atributo manipulado no llega a la página. */
export const parseQualitativeStrings = (raw: string | undefined): Readonly<Record<string, string>> => {
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

export const createQualitativeStrings = (
  values: Readonly<Record<string, string>>,
): QualitativeStrings => ({
  text: (key) => values[key] ?? key,
  format: (key, holes) => fill(values[key] ?? key, holes),
});
