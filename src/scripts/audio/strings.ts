/* ============================================================
   LinguaLab — cadenas en tiempo de ejecucion del visor

   Los diccionarios de `src/i18n/messages` no llegan al navegador: cada idioma
   es una ruta estatica y el texto se resuelve en la compilacion (ver
   `src/i18n/index.ts`). El controlador del visor, en cambio, escribe frases
   mientras trabaja —«cargando», «no se pudo leer»— y necesita las dos versiones.

   Asi que el componente serializa SOLO las claves de esta lista, ya traducidas,
   en un atributo `data-json`. `AUDIO_STRING_KEYS` es `satisfies readonly
   MessageKey[]`, de modo que una clave mal escrita o que falte en
   `src/i18n/messages/es.ts` rompe `npm run check` en vez de mostrar la clave
   cruda en la pagina.
   ============================================================ */

import type { MessageKey } from "../../i18n";

const KEYS = [
  "audio.status.idle",
  "audio.status.loading",
  "audio.status.loaded",
  "audio.status.imported",
  "audio.status.mismatch",
  "audio.error.tooLong",
  "audio.error.decode",
  "audio.error.textgrid",
  "audio.error.noAudio",
  "audio.gaps.detected",
  "audio.gaps.filled",
  "audio.data.saved",
  "audio.data.saving",
  "audio.data.restored",
  "audio.data.empty",
  "audio.persist.indexeddb",
  "audio.persist.memory",
  "audio.row.end",
  "audio.row.text",
] as const satisfies readonly MessageKey[];

export const AUDIO_STRING_KEYS: readonly MessageKey[] = KEYS;

export type AudioStringKey = (typeof KEYS)[number];

export type AudioStrings = Readonly<{ text: (key: AudioStringKey) => string }>;

export const createAudioStrings = (
  values: Readonly<Record<string, string>>,
): AudioStrings => ({
  text: (key) => values[key] ?? key,
});

/** Copia solo lo que es realmente una cadena: un atributo manipulado no llega a la UI. */
export const parseAudioStrings = (
  raw: string | undefined,
): Readonly<Record<string, string>> => {
  if (raw === undefined || raw === "") {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) {
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
 * Reemplaza `{nombre}`. Se repite la implementacion de `scripts/catalogo/strings`
 * en vez de importarla porque son dos herramientas distintas: si el catalogo
 * cambia su interpolacion, el visor no debe cambiar con el.
 */
export const format = (
  template: string,
  values: Readonly<Record<string, string | number>>,
): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });

/** Segundos con tres decimales y coma decimal, que es como se lee un tiempo en español. */
export const formatSeconds = (seconds: number): string => `${seconds.toFixed(3)} s`;
