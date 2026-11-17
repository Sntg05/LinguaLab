/**
 * Estadística descriptiva de una muestra numérica.
 *
 * Se contrasta con R en `descriptive.test.ts`: `mean`, `median`, `var` y `sd`
 * (con n − 1), `quantile(type = 7)` (el de R por defecto; Hyndman y Fan, 1996)
 * y la asimetría G1 (Joanes y Gill, 1998, tipo 2: la que dan SPSS y Excel).
 */
import { err, ok, type Result } from "../result";

export interface SampleSummary {
  readonly n: number;
  readonly mean: number;
  readonly median: number;
  /** Todos los valores más frecuentes; vacío si ninguno se repite más que otro. */
  readonly modes: readonly number[];
  /** Varianza muestral (n − 1). Con un solo valor no existe. */
  readonly variance: number | null;
  readonly sd: number | null;
  readonly min: number;
  readonly q1: number;
  readonly q3: number;
  readonly max: number;
  readonly range: number;
  readonly iqr: number;
  /** G1. Necesita al menos tres valores y alguna variación. */
  readonly skewness: number | null;
}

export type DescriptiveError = { readonly code: "empty" } | { readonly code: "not-finite" };

/** Cuantil tipo 7 de Hyndman y Fan sobre valores ya ordenados. */
const sortedQuantile = (sorted: readonly number[], p: number): number => {
  const h = (sorted.length - 1) * p;
  const low = Math.floor(h);
  const lowValue = sorted[low] ?? Number.NaN;
  const highValue = sorted[Math.min(low + 1, sorted.length - 1)] ?? lowValue;
  return lowValue + (h - low) * (highValue - lowValue);
};

export const quantileType7 = (values: readonly number[], p: number): number =>
  sortedQuantile(
    [...values].sort((left, right) => left - right),
    p,
  );

export const modes = (values: readonly number[]): readonly number[] => {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const most = Math.max(...counts.values());
  const winners = [...counts].filter(([, count]) => count === most).map(([value]) => value);
  // Si todos los valores aparecen lo mismo, no hay moda que señalar.
  return winners.length === counts.size ? [] : winners.sort((left, right) => left - right);
};

export const describeSample = (
  values: readonly number[],
): Result<SampleSummary, DescriptiveError> => {
  if (values.length === 0) return err({ code: "empty" });
  if (values.some((value) => !Number.isFinite(value))) return err({ code: "not-finite" });

  const n = values.length;
  const sorted = [...values].sort((left, right) => left - right);
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  // Dos pasadas: restar la media antes de elevar evita perder dígitos.
  const m2 = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const m3 = values.reduce((sum, value) => sum + (value - mean) ** 3, 0);
  const variance = n > 1 ? m2 / (n - 1) : null;
  const skewness =
    n > 2 && m2 > 0 ? ((m3 / n / (m2 / n) ** 1.5) * Math.sqrt(n * (n - 1))) / (n - 2) : null;
  const min = sorted[0] ?? mean;
  const max = sorted[n - 1] ?? mean;
  const q1 = sortedQuantile(sorted, 0.25);
  const q3 = sortedQuantile(sorted, 0.75);

  return ok({
    n,
    mean,
    median: sortedQuantile(sorted, 0.5),
    modes: modes(values),
    variance,
    sd: variance === null ? null : Math.sqrt(variance),
    min,
    q1,
    q3,
    max,
    range: max - min,
    iqr: q3 - q1,
    skewness,
  });
};
