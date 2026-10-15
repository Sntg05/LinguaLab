import type { G2PRule } from "../domain/g2p-rule";
import type { OrthographyTable, OrthographyTableStatus } from "../domain/orthography-table";
import { err, ok, type Result } from "../result";

/**
 * El formato JSON de una tabla de ortografia, en el nucleo y no en cada
 * adaptador.
 *
 * POR QUE VIVE AQUI
 *
 * `exportJson` e `importJson` son metodos del puerto, asi que en principio
 * cada adaptador podria formatear a su manera. Eso es un defecto para quien
 * usa la herramienta: exporta un archivo como respaldo y el dia que cambia de
 * almacenamiento (de memoria a IndexedDB, o a un archivo) el respaldo ya no se
 * puede importar, sin que nadie haya cambiado la tabla. Un unico formato en el
 * nucleo es lo que hace que una tabla exportada sea portable: el adaptador
 * decide DONDE guardar, no COMO se escribe.
 *
 * Las dos funciones son puras y no tocan ningun puerto.
 */

export type OrthographyTableJsonError =
  | { readonly code: "invalid-json"; readonly detail: string }
  | { readonly code: "invalid-table"; readonly detail: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === "string";

const isOptionalNumber = (value: unknown): boolean =>
  value === undefined || typeof value === "number";

const isRule = (value: unknown): value is G2PRule => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.grapheme === "string" &&
    typeof value.ipa === "string" &&
    isOptionalString(value.before) &&
    isOptionalString(value.after) &&
    isOptionalNumber(value.priority) &&
    isOptionalString(value.note)
  );
};

const isRuleList = (value: unknown): value is readonly G2PRule[] =>
  Array.isArray(value) && value.every(isRule);

const isClassMap = (value: unknown): value is Readonly<Record<string, readonly string[]>> => {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every(
    (members) => Array.isArray(members) && members.every((member) => typeof member === "string"),
  );
};

const isStatus = (value: unknown): value is OrthographyTableStatus =>
  value === "draft" || value === "reviewed";

type ShapeCheck =
  | { readonly ok: true; readonly table: OrthographyTable }
  | { readonly ok: false; readonly detail: string };

const checkShape = (value: unknown): ShapeCheck => {
  if (!isRecord(value)) {
    return { ok: false, detail: "se esperaba un objeto" };
  }
  if (typeof value.id !== "string" || value.id === "") {
    return { ok: false, detail: "falta el campo id o no es texto" };
  }
  if (typeof value.languageId !== "string") {
    return { ok: false, detail: "falta el campo languageId o no es texto" };
  }
  if (typeof value.name !== "string") {
    return { ok: false, detail: "falta el campo name o no es texto" };
  }
  if (typeof value.version !== "number") {
    return { ok: false, detail: "falta el campo version o no es numero" };
  }
  if (!isClassMap(value.classes)) {
    return { ok: false, detail: "classes debe ser un objeto de listas de texto" };
  }
  if (!isRuleList(value.rules)) {
    return { ok: false, detail: "rules debe ser una lista de reglas con grapheme e ipa" };
  }
  if (value.allophonic !== undefined && !isRuleList(value.allophonic)) {
    return { ok: false, detail: "allophonic debe ser una lista de reglas con grapheme e ipa" };
  }
  if (value.notes !== undefined && typeof value.notes !== "string") {
    return { ok: false, detail: "notes debe ser texto" };
  }
  if (!isStatus(value.status)) {
    return { ok: false, detail: 'status debe ser "draft" o "reviewed"' };
  }

  return {
    ok: true,
    table: {
      id: value.id,
      languageId: value.languageId,
      name: value.name,
      version: value.version,
      classes: value.classes,
      rules: value.rules,
      ...(value.allophonic !== undefined ? { allophonic: value.allophonic } : {}),
      ...(value.notes !== undefined ? { notes: value.notes } : {}),
      status: value.status,
    },
  };
};

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : "texto no analizable";

/** Serializa una tabla. La salida es estable: el mismo objeto produce el mismo texto. */
export const orthographyTableToJson = (table: OrthographyTable): string =>
  JSON.stringify(table, null, 2);

/** Reconstruye una tabla, distinguiendo el texto ilegible del objeto mal formado. */
export const orthographyTableFromJson = (
  text: string,
): Result<OrthographyTable, OrthographyTableJsonError> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return err({ code: "invalid-json", detail: describeError(error) });
  }

  const checked = checkShape(parsed);
  if (!checked.ok) {
    return err({ code: "invalid-table", detail: checked.detail });
  }
  return ok(checked.table);
};
