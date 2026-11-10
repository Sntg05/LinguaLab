/* ============================================================
   LinguaLab — la bibliografía que respalda cada herramienta

   `src/data/references.json` es la única lista. Cada entrada se abrió y se
   comprobó a mano (DOI resuelto en Crossref, o página que responde y cuyo
   título coincide) en la fecha de `verifiedOn`. Las herramientas las citan por
   identificador desde `tools.json`, y `references.test.ts` impide publicar una
   herramienta integrada sin teoría o sin fuentes.
   ============================================================ */

import type { Reference, ToolDescriptor } from "@lingualab/core";
import rawReferences from "../../data/references.json";
import { TOOLS } from "../catalogo/catalog-data";

const invalid = (message: string): never => {
  throw new Error(`references.json: ${message}`);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Convierte el JSON en referencias tipadas; un dato mal escrito falla al compilar. */
export const parseReferences = (value: unknown): readonly Reference[] => {
  if (!isRecord(value) || !Array.isArray(value["references"])) {
    return invalid("no trae la lista `references`");
  }
  return value["references"].map((entry: unknown): Reference => {
    if (!isRecord(entry)) return invalid("una referencia no es un objeto");
    const { id, authors, year, title, source, doi, url, verifiedOn } = entry;
    if (typeof id !== "string" || id === "") return invalid("una referencia no declara id");
    if (typeof authors !== "string" || typeof title !== "string" || typeof source !== "string") {
      return invalid(`${id} no trae autores, título y fuente`);
    }
    if (typeof year !== "number" || !Number.isInteger(year)) return invalid(`${id} no trae año`);
    if (typeof verifiedOn !== "string") return invalid(`${id} no dice cuándo se verificó`);
    if (doi !== undefined && typeof doi !== "string") return invalid(`${id} trae un DOI que no es texto`);
    if (url !== undefined && typeof url !== "string") return invalid(`${id} trae una URL que no es texto`);
    return {
      id,
      authors,
      year,
      title,
      source,
      verifiedOn,
      ...(doi !== undefined ? { doi } : {}),
      ...(url !== undefined ? { url } : {}),
    };
  });
};

export const REFERENCES: readonly Reference[] = parseReferences(rawReferences);

const BY_ID: ReadonlyMap<string, Reference> = new Map(REFERENCES.map((reference) => [reference.id, reference]));

/** Las herramientas que corren en este sitio: son las que deben explicar su teoría. */
export const SUPPORTED_TOOLS: readonly ToolDescriptor[] = TOOLS.filter(
  (tool) => tool.integration === "embedded" && tool.status !== "planned",
);

/** Las referencias de una herramienta, en el orden en que las cita. */
export const referencesOf = (tool: ToolDescriptor): readonly Reference[] =>
  (tool.references ?? []).flatMap((id) => {
    const reference = BY_ID.get(id);
    return reference === undefined ? [] : [reference];
  });

export const toolById = (id: string): ToolDescriptor | undefined => TOOLS.find((tool) => tool.id === id);
