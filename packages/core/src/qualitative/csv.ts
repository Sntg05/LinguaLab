/**
 * CSV (RFC 4180) para los archivos del análisis cualitativo.
 *
 * Los tres archivos del laboratorio (libro de códigos, hoja de codificación y
 * los informes) se abren en una hoja de cálculo y vuelven a importarse, así que
 * el lector tiene que aceptar lo que esa hoja escribe: campos entre comillas con
 * comas, comillas dobladas y saltos de línea dentro, y finales de línea LF,
 * CRLF o CR. Una comilla sin cerrar es un error con su línea, no un archivo
 * leído a medias.
 */
import { err, ok, type Result } from "../result";

export type CsvReadError = { readonly code: "unclosed-quote"; readonly line: number };

/** Separadores admitidos: coma (RFC 4180), punto y coma (Excel en español) y tabulador (TSV). */
export type CsvDelimiter = "," | ";" | "\t";

/**
 * Lee todas las filas. Las líneas vacías no son filas. El separador es la coma
 * salvo que se pida otro; la estadística (T6) lee también `;` y tabulador.
 */
export const parseCsvRecords = (
  text: string,
  delimiter: CsvDelimiter = ",",
): Result<string[][], CsvReadError> => {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  // Un campo entre comillas completo, un trozo sin comillas, un separador, un
  // final de línea, o una comilla que abre y nunca cierra.
  const token = new RegExp(
    `"((?:[^"]|"")*)"|([^"${delimiter}\\r\\n]+)|(${delimiter})|(\\r\\n|\\r|\\n)|(")`,
    "gy",
  );
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";

  for (const match of source.matchAll(token)) {
    const [, quoted, plain, comma, newline, stray] = match;
    if (stray !== undefined) {
      const line = source.slice(0, match.index).split(/\r\n|\r|\n/).length;
      return err({ code: "unclosed-quote", line });
    }
    if (quoted !== undefined || plain !== undefined) {
      field += quoted === undefined ? plain : quoted.replaceAll('""', '"');
      continue;
    }
    row.push(field);
    field = "";
    if (newline !== undefined && comma === undefined) {
      rows.push(row);
      row = [];
    }
  }

  row.push(field);
  rows.push(row);
  return ok(rows.filter((candidate) => candidate.length > 1 || (candidate[0] ?? "").trim() !== ""));
};

/** Un campo: entre comillas solo si lleva coma, comilla o salto de línea. */
export const csvField = (value: string): string =>
  /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

/** Filas a texto CSV, con salto de línea final. */
export const toCsv = (rows: readonly (readonly string[])[]): string =>
  `${rows.map((row) => row.map(csvField).join(",")).join("\n")}\n`;
