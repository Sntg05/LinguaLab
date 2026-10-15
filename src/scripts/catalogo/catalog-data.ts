/* ============================================================
   LinguaLab — catalogo de herramientas, leido del JSON versionado

   POR QUE ESTE ARCHIVO NO ES UN SCRIPT DE NAVEGADOR

   `catalog-data.ts` importa `src/data/tools.json` completo y lo convierte en
   fichas tipadas. Eso esta bien en tiempo de compilacion, cuando Astro renderiza
   la pagina en el servidor, y seria un desperdicio en el navegador: el catalogo
   es estatico y ya viaja dentro del HTML, asi que el script del cliente solo
   necesita alternar la visibilidad de lo que ya esta en pantalla. Ningun script
   de `src/scripts/catalogo/index.ts` puede importar este modulo.

   POR QUE SE VALIDA A MANO Y NO SE CONFIA EN EL TIPO DEL IMPORT

   Un `import` de JSON infiere `area: string`, que no es lo mismo que `ToolArea`.
   Afirmar el tipo con una asercion compilaria hoy y publicaria una ficha con un
   area que el filtro no reconoce, sin que nada fallara. Validar en el limite
   —una sola vez, al cargar el catalogo— convierte un dato mal escrito en un
   build roto con el id de la ficha culpable, que es cuando arreglarlo es barato.
   ============================================================ */

import type {
  ToolArea,
  ToolDescriptor,
  ToolIntegration,
  ToolLocalizedText,
  ToolStatus,
} from "@lingualab/core";
import rawCatalog from "../../data/tools.json";

/** Areas validas del dominio. `satisfies` obliga a que ninguna se invente. */
const AREAS = [
  "fonetica",
  "fonologia",
  "morfosintaxis",
  "semantica",
  "pragmatica",
  "psicolinguistica",
  "tipologia",
  "documentacion",
] as const satisfies readonly ToolArea[];

const INTEGRATIONS = [
  "embedded",
  "external-link",
  "needs-backend",
] as const satisfies readonly ToolIntegration[];

const STATUSES = ["stable", "experimental", "planned"] as const satisfies readonly ToolStatus[];

/** Version del formato que este lector sabe interpretar. */
const SUPPORTED_VERSION = 1;

/** Una ficha mal formada no se descarta en silencio: detiene el build. */
function invalid(reason: string): never {
  throw new Error(`tools.json: ${reason}`);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isLocalizedText = (value: unknown): value is ToolLocalizedText =>
  isRecord(value) && typeof value["es"] === "string" && typeof value["en"] === "string";

const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const oneOf =
  <T extends string>(allowed: readonly string[]) =>
  (value: unknown): value is T =>
    typeof value === "string" && allowed.includes(value);

const isArea = oneOf<ToolArea>(AREAS);
const isIntegration = oneOf<ToolIntegration>(INTEGRATIONS);
const isStatus = oneOf<ToolStatus>(STATUSES);

const parseTool = (value: unknown): ToolDescriptor => {
  if (!isRecord(value)) {
    invalid("una ficha no es un objeto");
  }

  const { id, name, area, integration, status, languages, url, notes, citation } = value;

  if (typeof id !== "string" || id === "") {
    invalid("una ficha no declara un id");
  }
  if (!isLocalizedText(name)) {
    invalid(`la ficha ${id} no trae nombre en es y en`);
  }
  if (!isArea(area)) {
    invalid(`la ficha ${id} tiene un area desconocida: ${String(area)}`);
  }
  if (!isIntegration(integration)) {
    invalid(`la ficha ${id} tiene una integracion desconocida: ${String(integration)}`);
  }
  if (!isStatus(status)) {
    invalid(`la ficha ${id} tiene un estado desconocido: ${String(status)}`);
  }
  if (!isStringList(languages)) {
    invalid(`la ficha ${id} no declara su lista de lenguas`);
  }

  // Se rechaza en vez de ignorarse: publicarla sin haberla comprobado es lo que
  // el proyecto prohibe, y un `url` que no se valida es exactamente eso.
  if (url !== undefined) {
    invalid(`la ficha ${id} declara url; ninguna URL se ha verificado todavia`);
  }
  if (notes !== undefined && !isLocalizedText(notes)) {
    invalid(`la ficha ${id} trae notas que no estan en es y en`);
  }
  if (citation !== undefined && typeof citation !== "string") {
    invalid(`la ficha ${id} trae una cita que no es texto`);
  }

  const descriptor: {
    id: string;
    name: ToolLocalizedText;
    area: ToolArea;
    integration: ToolIntegration;
    status: ToolStatus;
    languages: readonly string[];
    notes?: ToolLocalizedText;
    citation?: string;
  } = { id, name, area, integration, status, languages };

  if (notes !== undefined) {
    descriptor.notes = notes;
  }
  if (citation !== undefined) {
    descriptor.citation = citation;
  }
  return descriptor;
};

/**
 * Convierte el contenido del catalogo en fichas tipadas. Se exporta para que
 * las pruebas puedan alimentarlo con datos rotos a proposito: comprobar que un
 * dato mal escrito falla exige poder escribir ese dato.
 */
export const parseToolCatalog = (value: unknown): readonly ToolDescriptor[] => {
  if (!isRecord(value)) {
    invalid("el catalogo no es un objeto");
  }
  if (value["version"] !== SUPPORTED_VERSION) {
    invalid(`version no soportada: ${String(value["version"])}`);
  }

  const tools = value["tools"];
  if (!Array.isArray(tools)) {
    invalid("`tools` no es una lista");
  }

  const parsed = tools.map(parseTool);

  // Un id repetido haria que `byId` devolviera una ficha u otra segun el orden
  // de busqueda, sin dejar rastro de que existen dos.
  const seen = new Set<string>();
  for (const tool of parsed) {
    if (seen.has(tool.id)) {
      invalid(`id repetido: ${tool.id}`);
    }
    seen.add(tool.id);
  }
  return parsed;
};

/** El catalogo de este sitio, ya validado. */
export const TOOLS: readonly ToolDescriptor[] = parseToolCatalog(rawCatalog);
