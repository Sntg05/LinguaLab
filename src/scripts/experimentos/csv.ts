/* ============================================================
   LinguaLab — lectura de la lista de estimulos en CSV

   El constructor recibe los estimulos pegados o subidos como CSV porque es el
   formato en el que un docente ya tiene sus materiales: una hoja de calculo se
   exporta a CSV sin pensar y el archivo se lee en el diff.

   POR QUE SE ESCRIBE UN ANALIZADOR Y NO SE PARTE POR COMAS

   El texto de un estimulo linguistico trae comas —«Uno, dos, tres»— y a veces
   trae comillas. Partir por comas rompe la primera frase con coma que aparezca y
   desplaza todas las columnas siguientes sin avisar: el experimento corre igual
   y mide otra cosa. Este analizador respeta el entrecomillado, los saltos de
   linea dentro de un campo y las comillas duplicadas.

   POR QUE LOS ERRORES NOMBRAN LA LINEA

   La lista la escribe una persona en una hoja de calculo, asi que un error de
   formato tiene que poder encontrarse. «Fila 12: falta la condicion» se corrige;
   «CSV invalido» obliga a adivinar.
   ============================================================ */

import { err, ok, type Result } from "@lingualab/core";

/** Las columnas documentadas, en el orden en que se explican en la pagina. */
export const EXPERIMENT_COLUMNS = ["id", "condition", "text", "audio"] as const;

/** Columnas sin las cuales no hay ensayo posible. */
const REQUIRED_COLUMNS = ["id", "condition", "text"] as const;

/** Mismo tope que el resto de las entradas de texto del sitio (100 KB). */
export const MAX_STIMULUS_BYTES = 100 * 1024;

/** Un estimulo ya leido. */
export interface StimulusRow {
  readonly id: string;
  readonly condition: string;
  /** Se conserva tal cual: los espacios de un estimulo pueden ser el estimulo. */
  readonly text: string;
  /** Nombre de archivo de la columna `audio`, si la trae. */
  readonly audioFile?: string;
}

export type StimulusCsvCode = "empty" | "size" | "header" | "row" | "duplicate";

export interface StimulusCsvError {
  readonly code: StimulusCsvCode;
  /** Linea del archivo (1-based); 0 cuando el problema es el archivo entero. */
  readonly line: number;
  readonly detail: string;
}

interface Record {
  readonly fields: string[];
  readonly line: number;
}

interface ReadResult {
  readonly records: Record[];
  /** Linea donde empezo un campo entrecomillado que nunca se cerro. */
  readonly unterminatedAt: number | null;
}

/** Estado del recorrido: un solo objeto para no repartirlo en seis variables. */
interface Cursor {
  index: number;
  line: number;
  field: string;
  inQuotes: boolean;
}

/**
 * Consume un caracter dentro de un campo entrecomillado.
 *
 * Todo el entrecomillado vive aqui: las comillas duplicadas, los saltos de linea
 * internos y el CRLF. El bucle principal solo decide cuando entra y cuando sale.
 */
const stepQuoted = (text: string, cursor: Cursor): void => {
  const char = text[cursor.index] as string;

  if (char === '"') {
    if (text[cursor.index + 1] === '"') {
      cursor.field += '"';
      cursor.index += 1;
      return;
    }
    cursor.inQuotes = false;
    return;
  }

  if (char === "\r") {
    // Un salto dentro de un campo se normaliza a \n: el CSV es texto y las dos
    // formas son el mismo salto.
    if (text[cursor.index + 1] === "\n") {
      cursor.index += 1;
    }
    cursor.field += "\n";
    cursor.line += 1;
    return;
  }

  if (char === "\n") {
    cursor.line += 1;
  }
  cursor.field += char;
};

/**
 * Recorre el texto una sola vez y devuelve registros con su linea de origen.
 *
 * El estado es minimo a proposito: dentro o fuera de comillas. Todo lo demas
 * —CRLF, comillas duplicadas, saltos de linea internos— es una consecuencia de
 * esa unica decision.
 */
const readRecords = (text: string): ReadResult => {
  const records: Record[] = [];
  const cursor: Cursor = { index: 0, line: 1, field: "", inQuotes: false };
  let fields: string[] = [];
  let recordLine = 1;
  let unterminatedAt: number | null = null;

  const pushRecord = (): void => {
    fields.push(cursor.field);
    const isBlank = fields.every((value) => value.trim() === "");
    if (!isBlank) {
      records.push({ fields, line: recordLine });
    }
    fields = [];
    cursor.field = "";
  };

  for (cursor.index = 0; cursor.index < text.length; cursor.index += 1) {
    if (cursor.inQuotes) {
      stepQuoted(text, cursor);
      continue;
    }

    const char = text[cursor.index] as string;
    if (char === '"' && cursor.field === "") {
      cursor.inQuotes = true;
      continue;
    }
    if (char === ",") {
      fields.push(cursor.field);
      cursor.field = "";
      continue;
    }
    if (char === "\r") {
      continue;
    }
    if (char === "\n") {
      pushRecord();
      cursor.line += 1;
      recordLine = cursor.line;
      continue;
    }
    cursor.field += char;
  }

  if (cursor.inQuotes) {
    unterminatedAt = recordLine;
  } else {
    pushRecord();
  }

  return { records, unterminatedAt };
};

const bytesOf = (text: string): number => {
  try {
    return new TextEncoder().encode(text).length;
  } catch {
    return text.length;
  }
};

const normalizeName = (value: string): string => value.trim().toLowerCase();

const readHeader = (record: Record): Result<Map<string, number>, StimulusCsvError> => {
  const names = record.fields.map(normalizeName);
  const known = new Set<string>(EXPERIMENT_COLUMNS);
  const unknown = names.filter((name) => !known.has(name));
  if (unknown.length > 0) {
    return err({
      code: "header",
      line: record.line,
      detail: `la columna «${unknown[0]}» no existe; las columnas son ${EXPERIMENT_COLUMNS.join(", ")}`,
    });
  }
  const missing = REQUIRED_COLUMNS.filter((name) => !names.includes(name));
  if (missing.length > 0) {
    return err({
      code: "header",
      line: record.line,
      detail: `falta la columna «${missing[0]}»; las columnas son ${EXPERIMENT_COLUMNS.join(", ")}`,
    });
  }
  return ok(new Map(names.map((name, index) => [name, index])));
};

/** Los cuatro campos de una fila, ya recortados donde corresponde. */
interface RowFields {
  readonly id: string;
  readonly condition: string;
  readonly text: string;
  readonly audio: string;
}

const readFields = (record: Record, columns: ReadonlyMap<string, number>): RowFields => {
  const value = (name: string): string => {
    const index = columns.get(name);
    return index === undefined ? "" : (record.fields[index] ?? "");
  };
  return {
    id: value("id").trim(),
    condition: value("condition").trim(),
    // El texto se conserva tal cual: los espacios de un estimulo pueden ser el
    // estimulo.
    text: value("text"),
    audio: value("audio").trim(),
  };
};

/** Valida una fila y la convierte en estimulo, o dice que le falta. */
const readRow = (
  record: Record,
  columns: ReadonlyMap<string, number>,
  width: number,
): Result<StimulusRow, StimulusCsvError> => {
  if (record.fields.length !== width) {
    return err({
      code: "row",
      line: record.line,
      detail: `esta fila tiene ${record.fields.length} columna(s) y el encabezado declara ${width}`,
    });
  }

  const fields = readFields(record, columns);
  const required = [
    ["id", fields.id],
    ["condition", fields.condition],
    ["text", fields.text],
  ] as const;

  for (const [name, fieldValue] of required) {
    if (fieldValue.trim() === "") {
      return err({ code: "row", line: record.line, detail: `falta «${name}» en esta fila` });
    }
  }

  return ok(
    fields.audio === ""
      ? { id: fields.id, condition: fields.condition, text: fields.text }
      : { id: fields.id, condition: fields.condition, text: fields.text, audioFile: fields.audio },
  );
};

/**
 * Lee la lista completa.
 *
 * Devuelve `Result` y no lanza: una lista mal escrita es una entrada esperada, y
 * quien la pego necesita el motivo, no una excepcion en la consola.
 */
export const parseStimulusCsv = (raw: string): Result<readonly StimulusRow[], StimulusCsvError> => {
  if (bytesOf(raw) > MAX_STIMULUS_BYTES) {
    return err({
      code: "size",
      line: 0,
      detail: `la lista supera el tope de ${Math.round(MAX_STIMULUS_BYTES / 1024)} KB`,
    });
  }

  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const { records, unterminatedAt } = readRecords(text);

  if (unterminatedAt !== null) {
    return err({ code: "row", line: unterminatedAt, detail: "hay unas comillas sin cerrar" });
  }
  if (records.length === 0) {
    return err({ code: "empty", line: 0, detail: "la lista esta vacia" });
  }

  const headerRecord = records[0] as Record;
  const columns = readHeader(headerRecord);
  if (!columns.ok) {
    return columns;
  }

  const rows: StimulusRow[] = [];
  const seen = new Set<string>();

  for (const record of records.slice(1)) {
    const row = readRow(record, columns.value, headerRecord.fields.length);
    if (!row.ok) {
      return row;
    }
    if (seen.has(row.value.id)) {
      return err({
        code: "duplicate",
        line: record.line,
        detail: `el identificador «${row.value.id}» ya aparecio antes`,
      });
    }
    seen.add(row.value.id);
    rows.push(row.value);
  }

  if (rows.length === 0) {
    return err({ code: "empty", line: 0, detail: "la lista no tiene ningun estimulo" });
  }

  return ok(rows);
};
