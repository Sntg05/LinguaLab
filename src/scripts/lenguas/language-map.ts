/* ============================================================
   LinguaLab — el mapa de lenguas como dato, leido de `src/data/languages-co.json`

   POR QUE ESTE ARCHIVO Y NO UN `import` PELADO EN EL COMPONENTE

   El JSON se genera con `scripts/build-language-data.mjs` y se commitea, asi que
   el build no sale a la red. Pero un `import` de JSON infiere `family: string`,
   que no es lo mismo que `string | null`: afirmar el tipo compilaria hoy y
   publicaria una ficha con la familia vacia sin que nada fallara. Validar una
   sola vez, al cargar el dato, convierte un archivo mal escrito en una
   compilacion rota que nombra el campo culpable, que es cuando arreglarlo es
   barato. Es la misma decision que `src/scripts/catalogo/catalog-data.ts`.

   POR QUE EL ADAPTADOR DEL PUERTO VIVE EN `src/` Y NO EN `packages/adapters`

   `LanguageCatalogPort` responde dos preguntas: que lenguas hay y como se llama
   una. `Language` es `{ id, name, kind }` a proposito (ver su comentario en el
   nucleo), y por eso NO puede transportar lo que este mapa necesita: familia,
   coordenadas, version del dataset y URL de la ficha. El unico consumidor previsto
   del catalogo es esta pagina, que ya lee el dato completo; llevarlo a
   `packages/adapters` obligaria a pasar por `src/composition-root.ts`, que
   pertenece a otra superficie, y a publicar un adaptador que nadie mas puede
   usar. Se implementa aca, contra el contrato del puerto, y la pagina usa el
   dato completo.

   `kind` es la unica clasificacion que el dato no trae, y se deriva con una regla
   escrita y probada (ver `kindOf`). La pagina no la muestra: se publica hacia
   quien consuma el puerto, para que nadie tenga que inventarla por su cuenta.
   ============================================================ */

import type { Language, LanguageKind } from "@lingualab/core";
import type { LanguageCatalogError, LanguageCatalogPort } from "@lingualab/core";
import { ok, type Result } from "@lingualab/core";
import rawDataset from "../../data/languages-co.json";

/** Una lengua tal como la publica Glottolog, ya filtrada a Colombia. */
export interface LanguageEntry {
  readonly glottocode: string;
  readonly name: string;
  /** Nombre de la familia de nivel superior, o `null` si Glottolog la deja sin familia. */
  readonly family: string | null;
  readonly iso639p3: string | null;
  /** Ausente —no cero— cuando la fuente no publica coordenadas. */
  readonly latitude?: number;
  readonly longitude?: number;
  readonly glottologUrl: string;
}

/** El archivo completo, con su procedencia. */
export interface LanguageDataset {
  readonly glottologVersion: string;
  readonly retrievedAt: string;
  readonly sourceUrl: string;
  readonly license: string;
  readonly citation: string;
  readonly sha256: string;
  readonly languages: readonly LanguageEntry[];
}

const FILE = "languages-co.json";

/** Un dato mal formado no se descarta en silencio: detiene la compilacion. */
function invalid(reason: string): never {
  throw new Error(`${FILE}: ${reason}`);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

/** Glottolog usa cuatro letras y cuatro digitos (`wayu1243`). */
const GLOTTOCODE = /^[a-z]{4}[0-9]{4}$/;

/** ISO 639-3 son tres letras minusculas (`guc`). */
const ISO_639_3 = /^[a-z]{3}$/;

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

const glottologUrlOf = (glottocode: string): string =>
  `https://glottolog.org/resource/languoid/id/${glottocode}`;

/**
 * Las coordenadas de una lengua, o `undefined` cuando la fuente no las trae.
 *
 * Las dos van juntas o no va ninguna: media coordenada es una posicion
 * inventada, y el mapa la dibujaria en el meridiano o el paralelo cero.
 */
const parseCoordinates = (
  value: Record<string, unknown>,
  glottocode: string,
): { latitude?: number; longitude?: number } => {
  const { latitude, longitude } = value;

  if ((latitude === undefined) !== (longitude === undefined)) {
    invalid(`la lengua ${glottocode} declara latitude sin longitude, o al reves`);
  }
  if (latitude === undefined || longitude === undefined) {
    return {};
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    invalid(`la lengua ${glottocode} tiene coordenadas que no son numeros`);
  }
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90) {
    invalid(`la lengua ${glottocode} tiene una latitude fuera de rango: ${latitude}`);
  }
  if (!Number.isFinite(longitude) || Math.abs(longitude) > 180) {
    invalid(`la lengua ${glottocode} tiene una longitude fuera de rango: ${longitude}`);
  }

  return { latitude, longitude };
};

const parseLanguage = (value: unknown): LanguageEntry => {
  if (!isRecord(value)) {
    invalid("una lengua no es un objeto");
  }

  const { glottocode, name, family, iso639p3, glottologUrl } = value;

  if (!isNonEmptyString(glottocode) || !GLOTTOCODE.test(glottocode)) {
    invalid(`glottocode invalido: ${String(glottocode)}`);
  }
  if (!isNonEmptyString(name)) {
    invalid(`la lengua ${glottocode} no declara su name`);
  }
  if (family !== null && !isNonEmptyString(family)) {
    invalid(`la lengua ${glottocode} tiene una family que no es texto ni null`);
  }
  if (iso639p3 !== null && (typeof iso639p3 !== "string" || !ISO_639_3.test(iso639p3))) {
    invalid(`la lengua ${glottocode} tiene un iso639p3 invalido: ${String(iso639p3)}`);
  }
  if (glottologUrl !== glottologUrlOf(glottocode)) {
    invalid(`la lengua ${glottocode} tiene un glottologUrl que no es el de su ficha`);
  }

  return {
    glottocode,
    name,
    family,
    iso639p3,
    ...parseCoordinates(value, glottocode),
    glottologUrl,
  };
};

/**
 * Convierte el contenido del archivo en un dataset tipado.
 *
 * Se exporta para que las pruebas puedan alimentarlo con datos rotos a
 * proposito: comprobar que un dato mal escrito falla exige poder escribirlo.
 */
export const parseLanguageDataset = (value: unknown): LanguageDataset => {
  if (!isRecord(value)) {
    invalid("el archivo no es un objeto");
  }

  const { glottologVersion, retrievedAt, sourceUrl, license, citation, sha256, languages } = value;

  if (!isNonEmptyString(glottologVersion) || !/^\d+(\.\d+)+$/.test(glottologVersion)) {
    invalid(`glottologVersion no declara una version: ${String(glottologVersion)}`);
  }
  if (!isNonEmptyString(retrievedAt) || !ISO_INSTANT.test(retrievedAt)) {
    invalid(`retrievedAt no es una fecha ISO en UTC: ${String(retrievedAt)}`);
  }
  if (!isNonEmptyString(sourceUrl)) {
    invalid("sourceUrl no declara el origen del dato");
  }
  if (!isNonEmptyString(license)) {
    invalid("license no declara la licencia del dato");
  }
  if (!isNonEmptyString(citation)) {
    invalid("citation no declara como se cita el dato");
  }
  if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256)) {
    invalid("sha256 no es el resumen hexadecimal del CSV usado");
  }
  if (!Array.isArray(languages) || languages.length === 0) {
    invalid("el archivo no trae lenguas");
  }

  const parsed = languages.map(parseLanguage);
  const seen = new Set<string>();
  for (const language of parsed) {
    if (seen.has(language.glottocode)) {
      invalid(`glottocode repetido: ${language.glottocode}`);
    }
    seen.add(language.glottocode);
  }

  return {
    glottologVersion,
    retrievedAt,
    sourceUrl,
    license,
    citation,
    sha256,
    languages: parsed,
  };
};

/** El dataset que publica el sitio. Se valida al importar el modulo. */
export const LANGUAGE_DATASET: LanguageDataset = parseLanguageDataset(rawDataset);

/**
 * Familias que Glottolog no considera indigenas de America.
 *
 * La fuente clasifica lenguas por familia genealogica, no por si son indigenas:
 * el espanol y el portugues son `Indo-European`, y las dos lenguas de senas de
 * Colombia tienen `Sign Language`. Esas cuatro familias bastan para no llamar
 * "indigena" a una lengua colonial o a una lengua de senas.
 */
const NON_INDIGENOUS_FAMILIES: ReadonlySet<string> = new Set([
  "Indo-European",
  "Sign Language",
]);

/**
 * La lengua oficial del pais. Es un hecho publico y el propio nucleo lo usa asi
 * en su ejemplo de contrato (`{ id: "spa", ..., kind: "national" }`).
 */
const NATIONAL_ISO = "spa";

/** Clasifica una lengua con las tres categorias del nucleo. */
export const kindOf = (language: LanguageEntry): LanguageKind => {
  if (language.iso639p3 === NATIONAL_ISO) {
    return "national";
  }
  if (language.family !== null && NON_INDIGENOUS_FAMILIES.has(language.family)) {
    return "other";
  }
  return "indigenous";
};

/**
 * Adaptador de `LanguageCatalogPort` sobre el JSON commiteado.
 *
 * No toca el globo ni la red: `list` y `byId` son sincronos por dentro y
 * asincronos por contrato, porque el puerto promete que podrian leer de otro
 * sitio. El `id` es el glottocode, que es el unico identificador que toda lengua
 * del mapa tiene (24 de las 136 no tienen codigo ISO).
 */
export class GlottologLanguageCatalog implements LanguageCatalogPort {
  private readonly languages: readonly Language[];

  constructor(dataset: LanguageDataset = LANGUAGE_DATASET) {
    this.languages = dataset.languages.map((entry) => ({
      id: entry.glottocode,
      name: entry.name,
      kind: kindOf(entry),
    }));
  }

  async list(): Promise<Result<readonly Language[], LanguageCatalogError>> {
    return ok(this.languages);
  }

  async byId(id: string): Promise<Result<Language | null, LanguageCatalogError>> {
    return ok(this.languages.find((language) => language.id === id) ?? null);
  }
}
