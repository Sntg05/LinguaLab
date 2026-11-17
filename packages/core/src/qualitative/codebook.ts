/**
 * El libro de códigos: qué significa cada código y cuándo se aplica.
 *
 * Sigue la estructura que proponen MacQueen y colaboradores (1998) para equipos
 * que codifican juntos: nombre, definición, cuándo usarlo, cuándo no y un
 * ejemplo. Sin esas reglas escritas, dos personas aplican el mismo nombre a
 * cosas distintas y el acuerdo entre codificadores mide eso, no el material.
 */
import { err, ok, type Result } from "../result";
import { parseCsvRecords, toCsv } from "./csv";

export interface QualitativeCode {
  readonly name: string;
  readonly definition: string;
  /** Cuándo se aplica. */
  readonly include: string;
  /** Cuándo no se aplica aunque lo parezca. */
  readonly exclude: string;
  readonly example: string;
}

/** Columnas del CSV, en orden. Son parte del formato. */
export const CODEBOOK_COLUMNS = ["code", "definition", "include", "exclude", "example"] as const;

export type CodebookError =
  | { readonly code: "empty" }
  | { readonly code: "unclosed-quote"; readonly line: number }
  | { readonly code: "missing-code-column" }
  | { readonly code: "empty-name"; readonly row: number }
  | { readonly code: "duplicate-name"; readonly row: number; readonly name: string };

/** Dos nombres que solo difieren en mayúsculas o espacios son el mismo código. */
export const codeKey = (name: string): string => name.trim().toLocaleLowerCase();

/**
 * Valida un nombre nuevo frente a los que ya están. Devuelve el nombre limpio.
 * La interfaz y el lector del CSV usan esta misma regla.
 */
export const checkCodeName = (
  name: string,
  existing: readonly string[],
): Result<string, "empty" | "duplicate"> => {
  const clean = name.trim();
  if (clean === "") return err("empty");
  if (existing.some((other) => codeKey(other) === codeKey(clean))) return err("duplicate");
  return ok(clean);
};

/**
 * Lee un libro de códigos. Solo la columna `code` es obligatoria; las demás se
 * reconocen por su nombre en la cabecera, en cualquier orden.
 */
export const parseCodebookCsv = (
  text: string,
): Result<readonly QualitativeCode[], CodebookError> => {
  const parsed = parseCsvRecords(text);
  if (!parsed.ok) return err(parsed.error);
  const [header, ...rows] = parsed.value;
  if (header === undefined) return err({ code: "empty" });

  const columns = header.map((name) => name.trim().toLowerCase());
  const at = (column: (typeof CODEBOOK_COLUMNS)[number]): number => columns.indexOf(column);
  if (at("code") < 0) return err({ code: "missing-code-column" });

  const codes: QualitativeCode[] = [];
  for (const [index, fields] of rows.entries()) {
    const row = index + 2;
    const cell = (column: (typeof CODEBOOK_COLUMNS)[number]): string => {
      const position = at(column);
      return position < 0 ? "" : (fields[position] ?? "").trim();
    };
    const name = checkCodeName(
      cell("code"),
      codes.map((code) => code.name),
    );
    if (!name.ok) {
      return err(
        name.error === "empty"
          ? { code: "empty-name", row }
          : { code: "duplicate-name", row, name: cell("code") },
      );
    }
    codes.push({
      name: name.value,
      definition: cell("definition"),
      include: cell("include"),
      exclude: cell("exclude"),
      example: cell("example"),
    });
  }
  if (codes.length === 0) return err({ code: "empty" });
  return ok(codes);
};

export const codebookToCsv = (codes: readonly QualitativeCode[]): string =>
  toCsv([
    [...CODEBOOK_COLUMNS],
    ...codes.map((code) => [code.name, code.definition, code.include, code.exclude, code.example]),
  ]);
