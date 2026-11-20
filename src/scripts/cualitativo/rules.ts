/* ============================================================
   LinguaLab — análisis cualitativo: las decisiones de la página

   Todo lo que la página dice o decide sin tocar el DOM vive aquí, con pruebas:
   la frase de cada error, cómo se escribe una cifra y su lectura, y cómo se
   juntan el libro de códigos y una hoja recuperada. `index.ts` solo conecta.
   ============================================================ */

import {
  type AgreementError,
  type CodebookError,
  type CodingCsvError,
  type QualitativeCode,
  alphaVerdict,
  codeKey,
  kappaBand,
} from "@lingualab/core";
import type { QualitativeStrings } from "./strings";

/** La frase de un error de lectura de CSV, con su fila, columna o línea. */
export const describeCsvError = (
  error: CodebookError | CodingCsvError,
  strings: QualitativeStrings,
): string => {
  switch (error.code) {
    case "unclosed-quote":
      return strings.format("qual.csv.unclosedQuote", { line: error.line });
    case "missing-code-column":
      return strings.text("qual.csv.missingCodeColumn");
    case "empty-name":
      return strings.format("qual.csv.emptyName", { row: error.row });
    case "duplicate-name":
      return strings.format("qual.csv.duplicateName", { row: error.row, name: error.name });
    case "empty":
      return strings.text("qual.csv.empty");
    case "unknown-parent":
      return strings.format("qual.csv.unknownParent", { row: error.row, name: error.name });
    case "parent-cycle":
      return strings.format("qual.csv.parentCycle", { name: error.name });
    case "invalid-color":
      return strings.format("qual.csv.invalidColor", { row: error.row, value: error.value });
    case "bad-header":
      return strings.text("qual.csv.badHeader");
    case "no-codes":
      return strings.text("qual.csv.noCodes");
    case "bad-code-name":
      return strings.format("qual.csv.badCodeName", { column: error.column });
    case "duplicate-segment":
      return strings.format("qual.csv.duplicateSegment", { row: error.row, segment: error.segment });
    case "bad-mark":
      return strings.format("qual.csv.badMark", {
        row: error.row,
        column: error.column,
        value: error.value,
      });
  }
};

export const describeAgreementError = (error: AgreementError, strings: QualitativeStrings): string =>
  error.code === "too-few-sheets"
    ? strings.text("qual.error.agreementFew")
    : strings.format("qual.error.mismatch", { segment: error.segment, sheet: error.sheet });

/** Una cifra en el formato de la página: coma decimal en español. */
export const formatNumber = (value: number, locale: string, digits = 3): string =>
  value.toLocaleString(locale === "en" ? "en" : "es", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const formatPercent = (share: number, locale: string): string =>
  `${formatNumber(share * 100, locale, 1)} %`;

/** κ con su banda de Landis y Koch, o «—» si no se puede calcular. */
export const describeKappa = (
  kappa: number | null,
  locale: string,
  strings: QualitativeStrings,
): string =>
  kappa === null
    ? strings.text("qual.notComputable")
    : `${formatNumber(kappa, locale)} (${strings.text(`qual.band.${kappaBand(kappa)}`)})`;

/** α con su lectura según Krippendorff, o «—». */
export const describeAlpha = (
  alpha: number | null,
  locale: string,
  strings: QualitativeStrings,
): string =>
  alpha === null
    ? strings.text("qual.notComputable")
    : `${formatNumber(alpha, locale)} (${strings.text(`qual.verdict.${alphaVerdict(alpha)}`)})`;

/**
 * Los códigos de una hoja recuperada que el libro no tiene, añadidos al final
 * sin definición: recuperar una codificación nunca borra el libro que ya hay.
 */
export const mergeCodebook = (
  codebook: readonly QualitativeCode[],
  names: readonly string[],
): readonly QualitativeCode[] => {
  const missing = names.filter(
    (name) => !codebook.some((code) => codeKey(code.name) === codeKey(name)),
  );
  return [
    ...codebook,
    ...missing.map((name) => ({ name, definition: "", include: "", exclude: "", example: "" })),
  ];
};

/**
 * El nombre con que el libro escribe un código de la hoja: si solo difieren en
 * mayúsculas, gana el del libro, para que la hoja y el libro digan lo mismo.
 */
export const alignNames = (
  codebook: readonly QualitativeCode[],
  names: readonly string[],
): readonly string[] =>
  names.map((name) => codebook.find((code) => codeKey(code.name) === codeKey(name))?.name ?? name);
