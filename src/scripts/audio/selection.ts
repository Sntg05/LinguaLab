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

/* ------------------- seleccion por arrastre (unidad 5.4) ------------------- */

/**
 * Seleccion de tiempo hecha a mano: arrastrando sobre la onda o el
 * espectrograma, o con Mayus+flechas. Se guarda como en un texto: `anchor` es
 * donde empezo (queda fijo) y `head` el extremo que se mueve; el tramo es el
 * par ordenado. Asi un arrastre hacia la izquierda y uno hacia la derecha dan
 * el mismo tramo, y Mayus+flecha sabe que extremo mover.
 */
export interface TimeSelection {
  readonly anchor: number;
  readonly head: number;
}

/**
 * Pixeles que hay que moverse con el boton apretado para que sea un arrastre.
 * Por debajo es un clic: una mano que tiembla al hacer clic no debe dejar una
 * seleccion de dos milisegundos en lugar del cursor.
 */
export const DRAG_THRESHOLD_PX = 4;

export const isDragGesture = (startX: number, x: number): boolean =>
  Math.abs(x - startX) >= DRAG_THRESHOLD_PX;

export const dragSelection = (anchor: number, head: number, duration: number): TimeSelection => ({
  anchor: clamp(anchor, 0, duration),
  head: clamp(head, 0, duration),
});

/** El tramo de la seleccion, o `null` si no tiene duracion (entonces es un cursor). */
export const selectionRegion = (selection: TimeSelection | null): Region | null => {
  if (selection === null) {
    return null;
  }
  const start = Math.min(selection.anchor, selection.head);
  const end = Math.max(selection.anchor, selection.head);
  return end - start > 1e-9 ? { start, end } : null;
};

/** Mueve el extremo libre `delta` segundos; sin seleccion, empieza en el cursor. */
export const extendSelection = (
  selection: TimeSelection | null,
  cursor: number,
  delta: number,
  duration: number,
): TimeSelection => {
  const anchor = selection?.anchor ?? cursor;
  const head = selection?.head ?? cursor;
  return dragSelection(anchor, head + delta, duration);
};

/**
 * La seleccion que vale: la arrastrada, si sigue vigente; si no, el intervalo
 * bajo el cursor, como hasta ahora.
 *
 * Al seleccionar, el cursor se pone en el inicio del tramo (como en Praat).
 * Mientras siga ahi, la seleccion vale; en cuanto algo mueve el cursor (un clic,
 * coma o punto, el control «Cursor», la tabla) caduca sola. Asi ningun modulo
 * que mueve el cursor tiene que acordarse de borrarla.
 */
export const effectiveSelection = (
  selection: TimeSelection | null,
  cursor: number,
  interval: Region | null,
): Region | null => {
  const dragged = selectionRegion(selection);
  if (dragged !== null && Math.abs(cursor - dragged.start) <= 1e-9) {
    return dragged;
  }
  return interval;
};

/**
 * Frecuencia a la altura del puntero sobre el espectrograma: `ratio` es 0 arriba
 * y 1 abajo, y la escala es lineal, la misma que usa el dibujo para cada fila.
 */
export const frequencyAtRatio = (ratio: number, minHz: number, maxHz: number): number =>
  minHz + (1 - clamp(ratio, 0, 1)) * (maxHz - minHz);
