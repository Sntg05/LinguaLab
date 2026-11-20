/**
 * Frecuencias y coocurrencias de códigos en una hoja.
 *
 * La coocurrencia cuenta segmentos en los que se aplicaron los dos códigos: es
 * la tabla de «co-occurrence» de ATLAS.ti o de QDA Miner, y la diagonal es la
 * frecuencia de cada código. Contar, no interpretar: que dos códigos aparezcan
 * juntos es una pista para volver al material, no una relación demostrada.
 */
import { toCsv } from "./csv";
import type { CodingSheet } from "./coding";

export interface CodeFrequency {
  readonly code: string;
  /** Segmentos en los que se aplicó. */
  readonly segments: number;
  /** Proporción (0–1) del total de segmentos. */
  readonly share: number;
}

export const codeFrequencies = (sheet: CodingSheet): readonly CodeFrequency[] =>
  sheet.codes.map((code, at) => {
    const segments = sheet.segments.filter((segment) => segment.marks[at] === true).length;
    const total = sheet.segments.length;
    return { code, segments, share: total === 0 ? 0 : segments / total };
  });

/** Matriz cuadrada código × código; la celda [i][j] cuenta segmentos con los dos. */
export const cooccurrenceMatrix = (sheet: CodingSheet): readonly (readonly number[])[] =>
  sheet.codes.map((_, i) =>
    sheet.codes.map(
      (_, j) =>
        sheet.segments.filter((segment) => segment.marks[i] === true && segment.marks[j] === true)
          .length,
    ),
  );

export const frequenciesToCsv = (sheet: CodingSheet): string =>
  toCsv([
    ["code", "segments", "share"],
    ...codeFrequencies(sheet).map((row) => [row.code, String(row.segments), row.share.toFixed(4)]),
  ]);

export const cooccurrenceToCsv = (sheet: CodingSheet): string =>
  toCsv([
    ["code", ...sheet.codes],
    ...cooccurrenceMatrix(sheet).map((row, i) => [sheet.codes[i] ?? "", ...row.map(String)]),
  ]);
