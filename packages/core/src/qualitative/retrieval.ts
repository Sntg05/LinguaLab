/**
 * Recuperar los segmentos de un código: la consulta más usada del análisis
 * cualitativo. Releer juntos todos los fragmentos de «Actitud positiva» es como
 * se revisa si el código se aplicó con el mismo criterio de principio a fin.
 */
import { codeKey } from "./codebook";
import type { CodedSegment, CodingSheet } from "./coding";

/** Los segmentos marcados con `codeName`, en el orden del material. */
export const segmentsWithCode = (sheet: CodingSheet, codeName: string): readonly CodedSegment[] => {
  const index = sheet.codes.findIndex((name) => codeKey(name) === codeKey(codeName));
  if (index < 0) return [];
  return sheet.segments.filter((segment) => segment.marks[index] === true);
};
