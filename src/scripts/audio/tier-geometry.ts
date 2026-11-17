/* ============================================================
   LinguaLab — geometria de la franja de capas

   La misma cuenta sirve para dibujar las capas y para saber que hay bajo el
   puntero: si cada lado calculara su propia altura de fila, un clic en la capa
   2 podria caer, por medio pixel, en la 3. Por eso vive aqui, pura y probada.

   Como en el TextGridEditor de Praat: un clic dentro de una capa la selecciona,
   un clic dentro de un intervalo lo selecciona, y una frontera se toma para
   arrastrarla solo si el puntero cae a pocos pixeles de ella.
   ============================================================ */

import { ratioAtTime, type ViewWindow } from "./view";

/** Alto de la regla de tiempo, encima de la primera capa. */
export const TIER_RULER_HEIGHT = 20;

const MIN_ROW = 18;
const MAX_ROW = 64;

/** Distancia, en pixeles CSS, a la que un clic toma una frontera. */
export const BOUNDARY_TOLERANCE_PX = 5;

export interface TierStripLayout {
  readonly rulerHeight: number;
  readonly rowHeight: number;
}

/** Reparte el alto de la franja: la regla fija y el resto entre las capas. */
export const tierStripLayout = (height: number, tierCount: number): TierStripLayout => {
  const available = Math.max(height - TIER_RULER_HEIGHT, 0) / Math.max(tierCount, 1);
  return {
    rulerHeight: TIER_RULER_HEIGHT,
    rowHeight: Math.max(MIN_ROW, Math.min(MAX_ROW, available)),
  };
};

/** Indice de la capa bajo `y`, o -1 sobre la regla o debajo de la ultima capa. */
export const tierAtY = (layout: TierStripLayout, y: number, tierCount: number): number => {
  if (y < layout.rulerHeight) {
    return -1;
  }
  const index = Math.floor((y - layout.rulerHeight) / layout.rowHeight);
  return index < tierCount ? index : -1;
};

interface Span {
  readonly start: number;
  readonly end: number;
}

/**
 * La frontera interior mas cercana a `x`, nombrada por el intervalo de su
 * izquierda (el `intervalIndex` que piden `moveTierBoundary` y
 * `mergeIntervalWithNext`), o `null` si ninguna esta dentro de la tolerancia.
 * Los bordes del sonido no cuentan: no se pueden mover ni quitar.
 */
export const boundaryNear = (
  items: readonly Span[],
  view: ViewWindow,
  width: number,
  x: number,
  tolerance = BOUNDARY_TOLERANCE_PX,
): number | null => {
  let best: number | null = null;
  let bestDistance = tolerance;
  for (let index = 0; index < items.length - 1; index += 1) {
    const item = items[index];
    if (item === undefined) {
      continue;
    }
    const distance = Math.abs(ratioAtTime(view, item.end) * width - x);
    if (distance <= bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
};
