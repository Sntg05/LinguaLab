/* ============================================================
   LinguaLab — cadenas en tiempo de ejecucion del conversor ELAN

   Los diccionarios de `src/i18n/messages` no llegan al navegador: cada idioma
   es una ruta estatica y el texto se resuelve en la compilacion (ver
   `src/i18n/index.ts` y el ADR 0004). El controlador del conversor, en cambio,
   escribe frases mientras trabaja —«leyendo», «paso 2 de 3», «no se pudo
   leer»— y necesita las dos versiones.

   Asi que el componente serializa SOLO las claves de esta lista, ya traducidas,
   en un atributo `data-json`. `ELAN_STRING_KEYS` es
   `satisfies readonly MessageKey[]`, de modo que una clave mal escrita o que
   falte en `src/i18n/messages/es.ts` rompe `npm run check` en vez de mostrar la
   clave cruda en la pagina.

   Los rotulos que SI se pueden renderizar de antemano —titulos de panel,
   encabezados de tabla, avisos— no estan aqui: los escribe el componente.
   ============================================================ */

import type { MessageKey } from "../../i18n";

const KEYS = [
  // Estado
  "elan.status.idle",
  "elan.status.reading",
  "elan.status.loaded",
  "elan.status.exporting",
  "elan.status.exported",
  "elan.status.busy",
  // Progreso
  "elan.progress.label",
  "elan.phase.runtime",
  "elan.phase.wheel",
  "elan.phase.convert",
  // Formatos y botones
  "elan.format.eaf",
  "elan.format.textgrid",
  "elan.export.eaf",
  "elan.export.textgrid",
  // Tabla de capas
  "elan.tiers.count",
  "elan.kind.interval",
  "elan.kind.point",
  // Errores
  "elan.error.read",
  "elan.error.tooLarge",
  "elan.error.unknownFormat",
  "elan.error.empty",
  "elan.error.malformedXml",
  "elan.error.unsupportedStructure",
  "elan.error.unreadableEncoding",
  "elan.error.runtimeUnavailable",
  "elan.error.textgrid",
  "elan.error.detail",
  // Informe de perdida
  "elan.loss.none",
  "elan.loss.causeEmpty",
  "elan.loss.notesEmpty",
  "elan.loss.pendingExport",
  "elan.note.gapFilled",
  "elan.note.referenceAnnotations",
  "elan.note.annotationWithoutTime",
  "elan.note.tierEmpty",
  "elan.note.overlapDetected",
  "elan.note.pointTierDropped",
  "elan.note.emptyIntervalsDropped",
  "elan.note.zeroLengthDropped",
  "elan.note.timeRounded",
  "elan.note.tierUnwritable",
] as const satisfies readonly MessageKey[];

export const ELAN_STRING_KEYS: readonly MessageKey[] = KEYS;

export type ElanStringKey = (typeof KEYS)[number];

export interface ElanStrings {
  /** La frase ya traducida de esa clave. */
  readonly text: (key: ElanStringKey) => string;
  /** La misma frase con sus `{huecos}` reemplazados. */
  readonly format: (key: ElanStringKey, values: Readonly<Record<string, string | number>>) => string;
}

/**
 * Reemplaza `{nombre}`.
 *
 * Se repite la implementacion de `scripts/audio/strings` en vez de importarla
 * porque son dos herramientas distintas: si el visor cambia su interpolacion, el
 * conversor no debe cambiar con el.
 */
export const format = (
  template: string,
  values: Readonly<Record<string, string | number>>,
): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });

/** Copia solo lo que es realmente una cadena: un atributo manipulado no llega a la UI. */
export const parseElanStrings = (raw: string | undefined): Readonly<Record<string, string>> => {
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

export const createElanStrings = (values: Readonly<Record<string, string>>): ElanStrings => ({
  text: (key) => values[key] ?? key,
  format: (key, holes) => format(values[key] ?? key, holes),
});
