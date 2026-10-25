/* ============================================================
   LinguaLab — cadenas en tiempo de ejecucion del constructor de experimentos

   Los diccionarios de `src/i18n/messages` no llegan al navegador (ADR 0004): el
   componente serializa SOLO las claves de esta lista, ya traducidas, en un
   atributo `data-json`, y el controlador escribe esas frases cuando hace falta.
   `EXPERIMENTS_STRING_KEYS` es `satisfies readonly MessageKey[]`, asi que una
   clave mal escrita rompe `npm run check` en vez de mostrar la clave cruda.

   TRES DE ESTAS CLAVES NO SON MENSAJES DE ESTADO

   El boton de continuar, y las dos etiquetas de la decision lexica, son texto
   que viaja al experimento como parametro del diseno: tienen que estar en el
   idioma de la pagina y no pueden vivir escritas en el adaptador, que no conoce
   la ruta por la que se lo llamo.
   ============================================================ */

import type { ExperimentKind } from "@lingualab/core";
import type { MessageKey } from "../../i18n";

const KEYS = [
  "exp.status.ready",
  "exp.status.parsed",
  "exp.status.running",
  "exp.status.finished",
  "exp.status.aborted",
  "exp.status.spec",
  "exp.status.error",
  "exp.preview.count",
  "exp.preview.practice",
  "exp.preview.empty",
  "exp.audio.loaded",
  "exp.participant",
  "exp.fullscreen.denied",
  "exp.error.empty",
  "exp.error.csv",
  "exp.error.csvLine",
  "exp.error.audioMissing",
  "exp.error.seed",
  "exp.error.blocks",
  "exp.error.practice",
  "exp.error.runner",
  "exp.error.spec",
  "exp.continueLabel",
  "exp.lexical.word",
  "exp.lexical.nonword",
] as const satisfies readonly MessageKey[];

export const EXPERIMENTS_STRING_KEYS: readonly MessageKey[] = KEYS;

export type ExperimentsStringKey = (typeof KEYS)[number];

export type ExperimentsStrings = Readonly<{ text: (key: ExperimentsStringKey) => string }>;

export const createExperimentsStrings = (
  values: Readonly<Record<string, string>>,
): ExperimentsStrings => ({
  text: (key) => values[key] ?? key,
});

/** Copia solo lo que es una cadena: un atributo manipulado no llega a la interfaz. */
export const parseExperimentsStrings = (
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

/** Los cuatro textos de instrucciones por defecto, ya traducidos por la ruta. */
export const parseExperimentDefaults = (
  raw: string | undefined,
): Readonly<Record<ExperimentKind, string>> => {
  const empty: Record<ExperimentKind, string> = {
    acceptability: "",
    "two-afc": "",
    "self-paced-reading": "",
    "lexical-decision": "",
  };
  if (raw === undefined || raw === "") {
    return empty;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return empty;
  }

  const record = parsed as Record<string, unknown>;
  const values: Record<ExperimentKind, string> = { ...empty };
  for (const kind of Object.keys(values) as ExperimentKind[]) {
    const value = record[kind];
    if (typeof value === "string") {
      values[kind] = value;
    }
  }
  return values;
};

/**
 * Reemplaza `{nombre}`.
 *
 * Se repite la implementacion de otras herramientas en vez de importarla: si el
 * visor de audio cambia su interpolacion, el experimento no debe cambiar con el.
 */
export const format = (
  template: string,
  values: Readonly<Record<string, string | number>>,
): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
