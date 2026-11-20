/**
 * El libro de códigos: qué significa cada código y cuándo se aplica.
 *
 * Sigue la estructura que proponen MacQueen y colaboradores (1998) para equipos
 * que codifican juntos: nombre, definición, cuándo usarlo, cuándo no y un
 * ejemplo. Sin esas reglas escritas, dos personas aplican el mismo nombre a
 * cosas distintas y el acuerdo entre codificadores mide eso, no el material.
 *
 * Además, como en ATLAS.ti o NVivo, un código puede tener un código padre
 * («Actitud» → «Actitud positiva»), un color para reconocerlo y un memo: la nota
 * de quien analiza sobre por qué existe o qué dudas deja. Los tres son
 * opcionales, y un libro sin esas columnas se sigue leyendo.
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
  /** Nombre del código padre, si lo tiene. */
  readonly parent?: string;
  /** Color en `#rrggbb`. */
  readonly color?: string;
  /** Nota analítica sobre el código. */
  readonly memo?: string;
}

/** Columnas del CSV, en orden. Son parte del formato. */
export const CODEBOOK_COLUMNS = [
  "code",
  "definition",
  "include",
  "exclude",
  "example",
  "parent",
  "color",
  "memo",
] as const;

const COLOR = /^#[0-9a-f]{6}$/i;

export type CodebookError =
  | { readonly code: "empty" }
  | { readonly code: "unclosed-quote"; readonly line: number }
  | { readonly code: "missing-code-column" }
  | { readonly code: "empty-name"; readonly row: number }
  | { readonly code: "duplicate-name"; readonly row: number; readonly name: string }
  | { readonly code: "unknown-parent"; readonly row: number; readonly name: string }
  | { readonly code: "parent-cycle"; readonly name: string }
  | { readonly code: "invalid-color"; readonly row: number; readonly value: string };

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
    const color = cell("color");
    if (color !== "" && !COLOR.test(color))
      return err({ code: "invalid-color", row, value: color });
    const parent = cell("parent");
    const memo = cell("memo");
    codes.push({
      name: name.value,
      definition: cell("definition"),
      include: cell("include"),
      exclude: cell("exclude"),
      example: cell("example"),
      ...(parent === "" ? {} : { parent }),
      ...(color === "" ? {} : { color: color.toLowerCase() }),
      ...(memo === "" ? {} : { memo }),
    });
  }
  if (codes.length === 0) return err({ code: "empty" });
  const hierarchy = checkHierarchy(codes);
  if (!hierarchy.ok) return err(hierarchy.error);
  return ok(codes);
};

/**
 * Cada padre existe y ningún código es su propio antepasado. Lo usan el lector
 * del CSV y la interfaz antes de aceptar un padre nuevo.
 */
export const checkHierarchy = (
  codes: readonly QualitativeCode[],
): Result<true, Extract<CodebookError, { code: "unknown-parent" | "parent-cycle" }>> => {
  const byKey = new Map(codes.map((code) => [codeKey(code.name), code]));
  for (const [index, code] of codes.entries()) {
    if (code.parent !== undefined && !byKey.has(codeKey(code.parent))) {
      return err({ code: "unknown-parent", row: index + 2, name: code.parent });
    }
  }
  for (const code of codes) {
    const seen = new Set<string>([codeKey(code.name)]);
    let current = code.parent;
    while (current !== undefined) {
      const key = codeKey(current);
      if (seen.has(key)) return err({ code: "parent-cycle", name: code.name });
      seen.add(key);
      current = byKey.get(key)?.parent;
    }
  }
  return ok(true);
};

/** Un código con su profundidad en el árbol, para dibujarlo sangrado. */
export interface CodeTreeNode {
  readonly code: QualitativeCode;
  readonly depth: number;
}

/**
 * El libro en orden de árbol: cada raíz en el orden en que se creó, y debajo sus
 * hijos, también en su orden. Un padre ausente o un ciclo (que el lector ya
 * rechaza) dejan al código como raíz, para no perderlo de la vista.
 */
export const codeTree = (codes: readonly QualitativeCode[]): readonly CodeTreeNode[] => {
  const names = new Set(codes.map((code) => codeKey(code.name)));
  const children = new Map<string, QualitativeCode[]>();
  const roots: QualitativeCode[] = [];
  for (const code of codes) {
    const parent = code.parent === undefined ? undefined : codeKey(code.parent);
    if (parent === undefined || !names.has(parent)) roots.push(code);
    else children.set(parent, [...(children.get(parent) ?? []), code]);
  }
  const out: CodeTreeNode[] = [];
  const visited = new Set<string>();
  const walk = (code: QualitativeCode, depth: number): void => {
    const key = codeKey(code.name);
    if (visited.has(key)) return;
    visited.add(key);
    out.push({ code, depth });
    for (const child of children.get(key) ?? []) walk(child, depth + 1);
  };
  for (const root of roots) walk(root, 0);
  for (const code of codes) walk(code, 0);
  return out;
};

export const codebookToCsv = (codes: readonly QualitativeCode[]): string =>
  toCsv([
    [...CODEBOOK_COLUMNS],
    ...codes.map((code) => [
      code.name,
      code.definition,
      code.include,
      code.exclude,
      code.example,
      code.parent ?? "",
      code.color ?? "",
      code.memo ?? "",
    ]),
  ]);
