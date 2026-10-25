/* ============================================================
   LinguaLab — frases del mapa que el navegador reescribe

   El diccionario de `src/i18n/messages` no viaja al navegador: cada idioma es
   una ruta renderizada en la compilacion. El script del mapa necesita, sin
   embargo, dos frases: la cuenta que cambia mientras se filtra y el aviso de que
   nada coincidio.

   El componente serializa exactamente esas dos claves, ya traducidas, en un
   atributo `data-json`. `MAP_STRING_KEYS` es `satisfies readonly MessageKey[]`,
   asi que una clave mal escrita o ausente de `src/i18n/messages/es.ts` rompe
   `npm run check` en vez de mostrar una clave cruda en la pagina. Es el mismo
   mecanismo que usa el catalogo de herramientas (`src/scripts/catalogo/strings.ts`),
   y se repite aqui, en vez de importarse, por la misma razon por la que cada
   herramienta tiene su propio modulo de mensajes: las dos listas de claves son
   distintas y ninguna de las dos superficies tiene por que conocer la otra.
   ============================================================ */

import type { MessageKey } from "../../i18n";

const KEYS = ["map.count", "map.empty"] as const satisfies readonly MessageKey[];

export const MAP_STRING_KEYS: readonly MessageKey[] = KEYS;

export type MapStringKey = (typeof KEYS)[number];

/** Un traductor cerrado sobre los valores ya traducidos. */
export type MapStrings = Readonly<{ text: (key: MapStringKey) => string }>;

export const createStrings = (values: Readonly<Record<string, string>>): MapStrings => ({
  // Si una clave llega sin valor devuelve la clave, que se ve en la pagina y no
  // se puede confundir con una frase.
  text: (key) => values[key] ?? key,
});

/** Lee lo que serializo el componente. Solo copia valores que son texto. */
export const parseStrings = (raw: string | undefined): Readonly<Record<string, string>> => {
  if (raw === undefined || raw === "") {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const record = parsed as Record<string, unknown>;
  const values: Record<string, string> = {};
  for (const key of KEYS) {
    const value = record[key];
    if (typeof value === "string") {
      values[key] = value;
    }
  }
  return values;
};

/**
 * Reemplaza `{name}` por su valor. Deliberadamente minimo: el mapa necesita una
 * cuenta dentro de una frase, no un motor de plantillas.
 */
export const format = (
  template: string,
  values: Readonly<Record<string, string | number>>,
): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
