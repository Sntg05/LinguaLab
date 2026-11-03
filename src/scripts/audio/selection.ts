/* ============================================================
   LinguaLab — seleccion del visor de audio: capa activa e intervalo bajo el cursor

   Que intervalo «esta seleccionado» se decide en un solo lugar: lo usan el
   dibujo de la onda (lo resalta), la reproduccion en bucle (lo repite), los
   paneles acusticos (lo miden) y la navegacion con `,` y `.`. Si cada uno lo
   calculara a su manera, el resaltado y lo que suena podrian no coincidir.

   Todo es aritmetica sobre el documento, sin DOM: se prueba en Node.
   ============================================================ */

import {
  type AnnotationDocument,
  type Interval,
  type IntervalTier,
  isIntervalTier,
} from "@lingualab/core";

/** Capa activa con su indice real en el documento. */
export interface Sheet {
  readonly index: number;
  readonly tier: IntervalTier;
}

/** Tramo de tiempo, en segundos. */
export interface Region {
  readonly start: number;
  readonly end: number;
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** La capa activa, si existe y es de intervalos; las de puntos no se editan aqui. */
export const activeSheet = (doc: AnnotationDocument, activeTier: number): Sheet | null => {
  const tier = doc.tiers[activeTier];
  return tier !== undefined && isIntervalTier(tier) ? { index: activeTier, tier } : null;
};

/** Indice del intervalo que contiene al cursor, o -1 si no hay capa activa. */
export const intervalIndexAt = (sheet: Sheet | null, cursor: number): number => {
  if (sheet === null) {
    return -1;
  }
  const at = sheet.tier.items.findIndex(
    (interval) => cursor >= interval.start - 1e-9 && cursor < interval.end,
  );
  if (at !== -1) {
    return at;
  }
  // El cursor puede caer justo al final del audio: pertenece al ultimo intervalo.
  return sheet.tier.items.length - 1;
};

/** El intervalo seleccionado como tramo, o `null` si no hay o no tiene duracion. */
export const loopRegionAt = (sheet: Sheet | null, index: number): Region | null => {
  if (sheet === null || index < 0) {
    return null;
  }
  const interval = sheet.tier.items[index];
  if (interval === undefined || interval.end - interval.start <= 0) {
    return null;
  }
  return { start: interval.start, end: interval.end };
};

/** El intervalo vecino en la direccion pedida; en los bordes se queda en el extremo. */
export const neighbourInterval = (
  sheet: Sheet,
  index: number,
  direction: -1 | 1,
): Interval | undefined =>
  sheet.tier.items[clamp(index + direction, 0, sheet.tier.items.length - 1)];
