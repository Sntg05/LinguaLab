/* ============================================================
   LinguaLab — PhonemizerLab: reglas de la página
   Lo que decide qué se dice y qué se pide al motor, sin DOM, para que
   tenga prueba. El cableado con los elementos vive en `index.ts`.
   ============================================================ */

import { DEMO_TABLES, convertLayer } from "@lingualab/core";

/**
 * Lo que descarga la primera transcripción en inglés: el diccionario CMUdict,
 * 3,4 MB en disco y cerca de 0,9 MB por la red. El español no descarga nada.
 * Es un tamaño, no una promesa: la espera tiene un motivo que la persona ve.
 */
const DATA_APPROX = "~1 MB";

export interface PhonemizeOptions {
  readonly variety: "castilian" | "latin-american";
  readonly level: "phonetic" | "phonemic";
}

/** Un valor desconocido cae en lo que la página ofrece por defecto. */
export const phonemizeOptions = (
  variety: string | undefined,
  level: string | undefined,
): PhonemizeOptions => ({
  variety: variety === "castilian" ? "castilian" : "latin-american",
  level: level === "phonetic" ? "phonetic" : "phonemic",
});

export const busyMessage = (languageCode: string, es: boolean): string => {
  if (languageCode === "eng") {
    return es
      ? `Transcribiendo… la primera vez se descarga el diccionario de inglés (${DATA_APPROX}); después se reutiliza.`
      : `Transcribing… the first run downloads the English dictionary (${DATA_APPROX}); later runs reuse it.`;
  }
  return es ? "Transcribiendo…" : "Transcribing…";
};

export const doneMessage = (skippedCount: number, es: boolean): string => {
  if (skippedCount > 0) {
    return es
      ? `Listo, con ${skippedCount} palabra(s) sin transcribir: están marcadas entre ⟨ ⟩.`
      : `Done, with ${skippedCount} word(s) left untranscribed: they are marked between ⟨ ⟩.`;
  }
  return es
    ? "Listo. Es una transcripción de referencia: revísala antes de usarla como dato."
    : "Done. This is a reference transcription: review it before using it as data.";
};

export interface PhonemizeErrorLike {
  readonly code: string;
  readonly languageCode?: string;
  readonly detail?: string;
}

export const describePhonemizeError = (
  error: PhonemizeErrorLike,
  es: boolean,
  selectedLanguage: string,
): string => {
  switch (error.code) {
    case "unsupported-language": {
      const language = error.languageCode ?? selectedLanguage;
      return es
        ? `El motor no admite la lengua «${language}». No hay resultado inventado que mostrar.`
        : `The engine does not support the language “${language}”. There is no invented result to show.`;
    }
    case "engine-unavailable": {
      const detail = error.detail ? ` (${error.detail})` : "";
      return es
        ? `El diccionario de inglés no está disponible: no se pudo descargar desde este sitio. Revisa la conexión y vuelve a intentarlo; el español no lo necesita.${detail}`
        : `The English dictionary is not available: it could not be downloaded from this site. Check the connection and try again; Spanish does not need it.${detail}`;
    }
    default:
      return es
        ? `El motor falló al fonemizar: ${error.detail ?? "sin detalle"}.`
        : `The engine failed while phonemizing: ${error.detail ?? "no detail"}.`;
  }
};

export interface TableComparison {
  readonly kind: "ok" | "no-table" | "failed";
  /** La transcripción de la tabla, o «—» si no hay nada que mostrar. */
  readonly output: string;
  /** El nombre de la tabla, o la frase que explica por qué no hay comparación. */
  readonly caption: string;
}

const EMPTY = "—";

/**
 * La comparación es síncrona y no necesita motor, así que la página la pinta
 * antes de llamarlo: si el diccionario no se puede descargar, sigue habiendo
 * una respuesta honesta en vez de una columna vacía.
 *
 * Se usa `convertLayer` directamente y no el caso de uso
 * `convertOrthographyToIpa` a propósito: ese caso de uso lee la tabla del
 * repositorio, que es el trabajo guardado de la persona, y comparar con una
 * tabla de demostración obligaría a escribirla ahí antes, ensuciando el editor
 * con una tabla que nadie guardó.
 */
export const compareWithTable = (
  text: string,
  languageCode: string,
  es: boolean,
): TableComparison => {
  const table = DEMO_TABLES.find((candidate) => candidate.languageId === languageCode);
  if (!table) {
    return {
      kind: "no-table",
      output: EMPTY,
      caption: es
        ? "No hay tabla para esta lengua, así que no hay comparación."
        : "There is no table for this language, so there is nothing to compare.",
    };
  }

  try {
    const conversion = convertLayer(text, table.rules, {
      layer: "phonemic",
      casePolicy: "fold",
      classes: table.classes,
    });
    return {
      kind: "ok",
      output: conversion.output.trim() === "" ? EMPTY : conversion.output,
      caption: table.name,
    };
  } catch (error) {
    console.warn("[lingualab] phonemizer comparison failed:", error);
    return {
      kind: "failed",
      output: EMPTY,
      caption: es
        ? "La tabla no pudo aplicarse a este texto."
        : "The table could not be applied to this text.",
    };
  }
};

/** Cada palabra saltada una vez, en el orden en que apareció. */
export const listSkipped = (skipped: readonly string[]): string => [...new Set(skipped)].join(", ");

export const variantLine = (entry: {
  readonly word: string;
  readonly ipa: readonly string[];
}): string => `${entry.word}: ${entry.ipa.join(" ~ ")}`;
