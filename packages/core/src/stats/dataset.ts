/**
 * Datos de la estadística (T6.1): una tabla pegada o cargada como CSV o TSV.
 *
 * QUÉ SE DECIDE AQUÍ
 *
 * - El separador: coma, punto y coma o tabulador, el que más aparece en la
 *   cabecera. Excel en español guarda `;` porque la coma es el decimal.
 * - El decimal: con `;` o tabulador se acepta la coma decimal («3,5»); con coma
 *   como separador, solo el punto. Los separadores de miles no se adivinan:
 *   «1.234» es 1,234 y no mil doscientos treinta y cuatro.
 * - Los faltantes: una celda vacía, «NA» o «N/A». Se cuentan y se dicen; nunca
 *   se rellenan.
 * - El tipo: numérica si todos los valores presentes son números; si no,
 *   nominal. Si es ordinal no se puede adivinar: lo dice la persona.
 */
import { err, ok, type Result } from "../result";
import { type CsvDelimiter, parseCsvRecords } from "../qualitative/csv";

export type VariableKind = "numeric" | "nominal" | "ordinal";

export interface Variable {
  readonly name: string;
  readonly kind: VariableKind;
  /** El texto de cada celda; `null` si falta. */
  readonly raw: readonly (string | null)[];
  /** El número de cada celda si la variable es numérica; `null` si falta. */
  readonly numbers: readonly (number | null)[] | null;
  readonly missing: number;
}

export interface Dataset {
  readonly delimiter: CsvDelimiter;
  readonly rows: number;
  readonly variables: readonly Variable[];
}

export type DatasetError =
  | { readonly code: "empty" }
  | { readonly code: "unclosed-quote"; readonly line: number }
  | { readonly code: "bad-header"; readonly column: number }
  | {
      readonly code: "ragged-row";
      readonly row: number;
      readonly expected: number;
      readonly found: number;
    };

const MISSING = new Set(["", "NA", "N/A"]);

/** El separador que más aparece en la primera línea con contenido, fuera de comillas. */
export const detectDelimiter = (text: string): CsvDelimiter => {
  const first = text.split(/\r\n|\r|\n/).find((line) => line.trim() !== "") ?? "";
  const unquoted = first.replace(/"(?:[^"]|"")*"/g, "");
  const count = (char: string): number => unquoted.split(char).length - 1;
  const candidates: CsvDelimiter[] = ["\t", ";", ","];
  return candidates.reduce((best, char) => (count(char) > count(best) ? char : best), ",");
};

/** Un número escrito como lo escribe una persona, o `null` si no lo es. */
export const parseNumber = (text: string, decimalComma: boolean): number | null => {
  const clean = text.trim();
  const pattern = decimalComma
    ? /^[-+]?(\d+([.,]\d*)?|[.,]\d+)([eE][-+]?\d+)?$/
    : /^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/;
  if (!pattern.test(clean)) return null;
  const value = Number(clean.replace(",", "."));
  return Number.isFinite(value) ? value : null;
};

export const parseDataset = (text: string): Result<Dataset, DatasetError> => {
  const delimiter = detectDelimiter(text);
  const parsed = parseCsvRecords(text, delimiter);
  if (!parsed.ok) return parsed;
  const [header, ...rows] = parsed.value;
  if (header === undefined || rows.length === 0) return err({ code: "empty" });

  const names = header.map((name) => name.trim());
  const seen = new Set<string>();
  for (const [index, name] of names.entries()) {
    if (name === "" || seen.has(name)) return err({ code: "bad-header", column: index + 1 });
    seen.add(name);
  }
  for (const [index, row] of rows.entries()) {
    if (row.length !== names.length) {
      return err({ code: "ragged-row", row: index + 2, expected: names.length, found: row.length });
    }
  }

  const decimalComma = delimiter !== ",";
  const variables = names.map((name, column): Variable => {
    const raw = rows.map((row) => {
      const cell = (row[column] ?? "").trim();
      return MISSING.has(cell) ? null : cell;
    });
    const numbers = raw.map((cell) => (cell === null ? null : parseNumber(cell, decimalComma)));
    const present = raw.filter((cell) => cell !== null).length;
    const numeric = present > 0 && numbers.every((value, i) => raw[i] === null || value !== null);
    return {
      name,
      kind: numeric ? "numeric" : "nominal",
      raw,
      numbers: numeric ? numbers : null,
      missing: raw.length - present,
    };
  });
  return ok({ delimiter, rows: rows.length, variables });
};

/** La misma tabla con otro tipo para una variable; una no numérica no puede pasar a numérica. */
export const withKind = (dataset: Dataset, name: string, kind: VariableKind): Dataset => ({
  ...dataset,
  variables: dataset.variables.map((variable) =>
    variable.name !== name || (kind === "numeric" && variable.numbers === null)
      ? variable
      : { ...variable, kind },
  ),
});

/** Los números presentes de una variable numérica, sin faltantes. */
export const presentNumbers = (variable: Variable): number[] =>
  (variable.numbers ?? []).filter((value): value is number => value !== null);

/** Los niveles de una variable categórica, en orden de aparición. */
export const levels = (variable: Variable): string[] => [
  ...new Set(variable.raw.filter((value): value is string => value !== null)),
];
