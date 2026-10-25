/* ============================================================
   LinguaLab — cadenas en tiempo de ejecucion de los paneles acusticos

   Los diccionarios de `src/i18n/messages` no llegan al navegador: cada idioma es
   una ruta estatica y el texto se resuelve en la compilacion (ver
   `src/i18n/index.ts`). El controlador de los paneles, en cambio, escribe frases
   mientras analiza —«analizando», «no esta disponible»— y necesita las dos
   versiones.

   Asi que el componente serializa SOLO las claves de esta lista, ya traducidas,
   en un atributo `data-json`, igual que hace el visor con `AUDIO_STRING_KEYS`.
   La lista es `satisfies readonly MessageKey[]`: una clave mal escrita o que
   falte en `src/i18n/messages/es.ts` rompe `npm run check` en vez de mostrar la
   clave cruda en la pagina.

   POR QUE UNA LISTA APARTE Y NO LA DEL VISOR

   `src/scripts/audio/strings.ts` pertenece al segmento 6 y no se toca: agregarle
   claves desde aca seria editar el contrato de otra herramienta. Las claves de
   este archivo empiezan con `acoustic.`, como todo lo de este segmento.
   ============================================================ */

import type { MessageKey } from "../../i18n";

const KEYS = [
  "acoustic.status.idle",
  "acoustic.status.analysing",
  "acoustic.status.f0",
  "acoustic.status.formants",
  "acoustic.status.intensity",
  "acoustic.status.measured",
  "acoustic.status.exported",
  "acoustic.status.cleared",
  "acoustic.error.noAudio",
  "acoustic.error.noSelection",
  "acoustic.error.unavailable",
  "acoustic.error.tooShort",
  "acoustic.error.failed",
] as const satisfies readonly MessageKey[];

export const ACOUSTIC_STRING_KEYS: readonly MessageKey[] = KEYS;

export type AcousticStringKey = (typeof KEYS)[number];

export type AcousticStrings = Readonly<{ text: (key: AcousticStringKey) => string }>;

export const createAcousticStrings = (
  values: Readonly<Record<string, string>>,
): AcousticStrings => ({
  text: (key) => values[key] ?? key,
});

/** Copia solo lo que es realmente una cadena: un atributo manipulado no llega a la UI. */
export const parseAcousticStrings = (
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
