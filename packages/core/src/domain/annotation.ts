/**
 * Entidades de anotacion: el modelo interno de un TextGrid o de un ELAN.
 *
 * Los tiempos son segundos en punto flotante, nunca milisegundos ni muestras:
 * asi lo definen Praat y ELAN, y convertir a otra unidad es una decision de
 * presentacion que no debe filtrarse al dominio.
 */

/** Un intervalo etiquetado dentro de una capa. */
export interface Interval {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

/** Una capa de intervalos (con duracion) o de puntos (un instante). */
export type TierKind = "interval" | "point";

export interface IntervalTier {
  readonly name: string;
  /** Discriminante literal: permite estrechar `Tier` sin mirar `items`. */
  readonly kind: "interval";
  readonly items: readonly Interval[];
}

export interface PointTier {
  readonly name: string;
  readonly kind: "point";
  readonly points: readonly { readonly time: number; readonly text: string }[];
}

export type Tier = IntervalTier | PointTier;

export interface AnnotationDocument {
  readonly tiers: readonly Tier[];
  /** Inicio del archivo en segundos; suele ser 0, pero el formato lo permite distinto. */
  readonly xmin: number;
  /** Fin del archivo en segundos. */
  readonly xmax: number;
}
