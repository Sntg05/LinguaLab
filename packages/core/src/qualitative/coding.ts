/**
 * La hoja de codificación: el material dividido en segmentos y, para cada
 * segmento, qué códigos aplicó una persona.
 *
 * POR QUÉ SEGMENTOS FIJOS Y NO TRAMOS LIBRES
 *
 * Con segmentos fijos (una línea o un párrafo), dos codificadores deciden sobre
 * las mismas unidades, y el acuerdo se calcula directamente con la kappa de
 * Cohen o la alfa de Krippendorff. Con tramos libres cada persona recorta
 * distinto y hace falta la alfa de unitización, mucho más difícil de explicar.
 * Es una decisión del dueño del proyecto (2026-11-17).
 *
 * EL ARCHIVO
 *
 * Una fila por segmento: `segment,text,<código 1>,<código 2>,…`, con 1 si el
 * código se aplicó y 0 si no. Una celda vacía es un segmento que esa persona no
 * codificó (dato faltante), que no es lo mismo que un 0. Es el formato «ancho»
 * que leen R, SPSS o una hoja de cálculo sin conversión.
 */
import { err, ok, type Result } from "../result";
import { checkCodeName } from "./codebook";
import { parseCsvRecords, toCsv } from "./csv";

export type SegmentMode = "line" | "paragraph";

/** Una marca: aplicado, no aplicado, o sin codificar. */
export type Mark = boolean | null;

export interface CodedSegment {
  /** Identificador estable dentro del material: "1", "2", … */
  readonly id: string;
  readonly text: string;
  /** Una marca por código, en el orden de `CodingSheet.codes`. */
  readonly marks: readonly Mark[];
}

export interface CodingSheet {
  readonly codes: readonly string[];
  readonly segments: readonly CodedSegment[];
}

/**
 * Divide el material. Por línea, cada línea no vacía es un segmento (un turno
 * de una transcripción); por párrafo, lo que separa una línea en blanco.
 */
export const segmentText = (text: string, mode: SegmentMode): readonly string[] => {
  const normalized = text.replace(/\r\n?/g, "\n");
  const pieces = mode === "line" ? normalized.split("\n") : normalized.split(/\n\s*\n/);
  return pieces.map((piece) => piece.replace(/\s+/g, " ").trim()).filter((piece) => piece !== "");
};

/** Una hoja nueva: nada aplicado todavía. */
export const createCodingSheet = (
  segments: readonly string[],
  codes: readonly string[],
): CodingSheet => ({
  codes,
  segments: segments.map((text, index) => ({
    id: String(index + 1),
    text,
    marks: codes.map(() => false),
  })),
});

/** Cambia una marca sin tocar la hoja original. */
export const setMark = (
  sheet: CodingSheet,
  segmentIndex: number,
  codeIndex: number,
  value: Mark,
): CodingSheet => ({
  codes: sheet.codes,
  segments: sheet.segments.map((segment, index) =>
    index !== segmentIndex
      ? segment
      : { ...segment, marks: segment.marks.map((mark, at) => (at === codeIndex ? value : mark)) },
  ),
});

/**
 * Pone la hoja al día con un libro de códigos que cambió: un código nuevo entra
 * sin aplicar, uno quitado se va con sus marcas, y los que siguen conservan las
 * suyas aunque cambie el orden.
 */
export const withCodes = (sheet: CodingSheet, codes: readonly string[]): CodingSheet => ({
  codes,
  segments: sheet.segments.map((segment) => ({
    ...segment,
    marks: codes.map((code) => {
      const at = sheet.codes.indexOf(code);
      return at < 0 ? false : (segment.marks[at] ?? false);
    }),
  })),
});

const markCell = (mark: Mark): string => (mark === null ? "" : mark ? "1" : "0");

export const codingToCsv = (sheet: CodingSheet): string =>
  toCsv([
    ["segment", "text", ...sheet.codes],
    ...sheet.segments.map((segment) => [segment.id, segment.text, ...segment.marks.map(markCell)]),
  ]);

export type CodingCsvError =
  | { readonly code: "empty" }
  | { readonly code: "unclosed-quote"; readonly line: number }
  | { readonly code: "bad-header" }
  | { readonly code: "no-codes" }
  | { readonly code: "bad-code-name"; readonly column: number }
  | { readonly code: "duplicate-segment"; readonly row: number; readonly segment: string }
  | {
      readonly code: "bad-mark";
      readonly row: number;
      readonly column: number;
      readonly value: string;
    };

const readMark = (value: string): Mark | undefined => {
  const clean = value.trim();
  if (clean === "") return null;
  if (clean === "1") return true;
  if (clean === "0") return false;
  return undefined;
};

const readCodes = (header: readonly string[]): Result<string[], CodingCsvError> => {
  const column = (at: number): string => (header[at] ?? "").trim().toLowerCase();
  if (column(0) !== "segment" || column(1) !== "text") return err({ code: "bad-header" });
  const codes: string[] = [];
  for (const [index, raw] of header.slice(2).entries()) {
    const name = checkCodeName(raw, codes);
    if (!name.ok) return err({ code: "bad-code-name", column: index + 3 });
    codes.push(name.value);
  }
  return codes.length === 0 ? err({ code: "no-codes" }) : ok(codes);
};

const readMarks = (
  fields: readonly string[],
  codeCount: number,
  row: number,
): Result<Mark[], CodingCsvError> => {
  const marks: Mark[] = [];
  for (let at = 0; at < codeCount; at += 1) {
    const value = fields[at + 2] ?? "";
    const mark = readMark(value);
    if (mark === undefined) return err({ code: "bad-mark", row, column: at + 3, value });
    marks.push(mark);
  }
  return ok(marks);
};

/** Lee una hoja exportada por este laboratorio o escrita a mano con el mismo formato. */
export const parseCodingCsv = (text: string): Result<CodingSheet, CodingCsvError> => {
  const parsed = parseCsvRecords(text);
  if (!parsed.ok) return err(parsed.error);
  const [header, ...rows] = parsed.value;
  if (header === undefined || rows.length === 0) return err({ code: "empty" });
  const codes = readCodes(header);
  if (!codes.ok) return codes;

  const seen = new Set<string>();
  const segments: CodedSegment[] = [];
  for (const [index, fields] of rows.entries()) {
    const row = index + 2;
    // Sin identificador, la posición hace de identificador: el archivo sigue
    // siendo comparable con el de otra persona que codificó el mismo material.
    const id = (fields[0] ?? "").trim() || String(index + 1);
    if (seen.has(id)) return err({ code: "duplicate-segment", row, segment: id });
    seen.add(id);
    const marks = readMarks(fields, codes.value.length, row);
    if (!marks.ok) return marks;
    segments.push({ id, text: (fields[1] ?? "").trim(), marks: marks.value });
  }
  return ok({ codes: codes.value, segments });
};
