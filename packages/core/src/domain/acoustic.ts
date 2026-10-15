/**
 * Mediciones acusticas: pistas de un analisis sobre una senal de audio.
 *
 * Una pista es un par de listas paralelas (`times` y `values`) en lugar de una
 * lista de objetos: el analisis acustico produce decenas de miles de marcos y
 * mantener dos `Float32Array`/arreglos paralelos es lo que hace viable pasarlos
 * al graficador sin convertirlos antes.
 */

export type AcousticTrackKind = "f0" | "formant" | "intensity";

export interface AcousticTrack {
  readonly kind: AcousticTrackKind;
  /** Instantes de cada muestra, en segundos; misma longitud que `values`. */
  readonly times: readonly number[];
  /**
   * Valor de cada muestra. En `f0` es frecuencia fundamental en hercios y los
   * tramos sin voz se representan como 0 (no como ausencia), que es la
   * convencion de Praat y evita romper la lista paralela.
   */
  readonly values: readonly number[];
}

/** Resumen estadistico de una pista, listo para una tabla de resultados. */
export interface AcousticMeasurement {
  readonly label: string;
  readonly mean: number;
  readonly median: number;
  readonly min: number;
  readonly max: number;
}
