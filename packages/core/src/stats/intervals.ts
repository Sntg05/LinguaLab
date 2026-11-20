/**
 * Intervalos de confianza de los tamaños del efecto: d de Cohen, η² y V de
 * Cramér.
 *
 * MÉTODO
 *
 * El del parámetro de no centralidad (Steiger y Fouladi 1997; Steiger 2004), el
 * mismo que usa el paquete `effectsize` de R: se busca la no centralidad para la
 * que el estadístico observado queda justo en el percentil del intervalo, y se
 * convierte de vuelta a la escala del efecto. Aquí la raíz se busca por
 * bisección hasta la precisión de la máquina; `effectsize` usa Nelder–Mead y se
 * detiene antes, así que coinciden a unas seis cifras (`intervals.test.ts`).
 *
 * BILATERAL Y UNILATERAL, COMO `effectsize`
 *
 * d lleva un intervalo bilateral al 95 %. η² y V no pueden ser negativos, y
 * `effectsize` da para ellos un intervalo unilateral al 95 % —[límite, 1]—: la
 * pregunta útil es «¿cuán chico podría ser?». La interfaz dice cuál es cuál.
 */
import { err, ok, type Result } from "../result";
import { noncentralChiSquareCdf, noncentralFCdf, noncentralTCdf } from "./distributions";
import { cohensD, cohensDOneSample, cohensDPaired } from "./effects";
import { chiSquareIndependence, type TestError } from "./tests";

export interface EffectInterval {
  readonly low: number;
  readonly high: number;
}

/**
 * Bisección de una función decreciente en [low, high]: el punto donde vale
 * `target`. Las CDF no centrales decrecen al crecer la no centralidad.
 */
const solveDecreasing = (
  f: (x: number) => number,
  target: number,
  low: number,
  high: number,
): number => {
  let a = low;
  let b = high;
  for (let i = 0; i < 300 && b - a > 1e-13 * Math.max(1, Math.abs(a)); i += 1) {
    const middle = (a + b) / 2;
    if (f(middle) > target) a = middle;
    else b = middle;
  }
  return (a + b) / 2;
};

/** Amplía [low, high] hasta que encierre la raíz de una función decreciente. */
const bracket = (f: (x: number) => number, target: number, start: number): [number, number] => {
  let low = start - 1;
  let high = start + 1;
  for (let step = 1; f(low) < target && step < 1e6; step *= 2) low -= step;
  for (let step = 1; f(high) > target && step < 1e6; step *= 2) high += step;
  return [low, high];
};

/** Los límites de δ con P(T ≤ t; δ) = 1 − α/2 y = α/2. */
const tNoncentralityBounds = (t: number, df: number, level: number): EffectInterval => {
  const alpha = 1 - level;
  const cdf = (delta: number): number => noncentralTCdf(t, df, delta);
  const solve = (target: number): number => {
    const [low, high] = bracket(cdf, target, t);
    return solveDecreasing(cdf, target, low, high);
  };
  return { low: solve(1 - alpha / 2), high: solve(alpha / 2) };
};

/**
 * El λ ≥ 0 con cdf(λ) = p, o 0 si ni con λ = 0 se alcanza (el efecto observado
 * es compatible con ninguno): es la misma regla que aplica `effectsize`.
 */
const positiveNoncentrality = (cdf: (lambda: number) => number, p: number): number => {
  if (cdf(0) <= p) return 0;
  let high = 1;
  while (cdf(high) > p && high < 1e7) high *= 2;
  return solveDecreasing(cdf, p, 0, high);
};

const LEVEL = 0.95;

/** d con desviación combinada, bilateral al 95 %. */
export const cohensDInterval = (
  x: readonly number[],
  y: readonly number[],
): Result<EffectInterval, TestError> => {
  const d = cohensD(x, y);
  if (!d.ok) return d;
  const se = Math.sqrt(1 / x.length + 1 / y.length);
  const bounds = tNoncentralityBounds(d.value / se, x.length + y.length - 2, LEVEL);
  return ok({ low: bounds.low * se, high: bounds.high * se });
};

const oneSample = (d: number, n: number): EffectInterval => {
  const root = Math.sqrt(n);
  const bounds = tNoncentralityBounds(d * root, n - 1, LEVEL);
  return { low: bounds.low / root, high: bounds.high / root };
};

/** d de una muestra frente a `mu`, bilateral al 95 %. */
export const cohensDOneSampleInterval = (
  x: readonly number[],
  mu = 0,
): Result<EffectInterval, TestError> => {
  const d = cohensDOneSample(x, mu);
  return d.ok ? ok(oneSample(d.value, x.length)) : d;
};

/** d_z de datos pareados, bilateral al 95 %. */
export const cohensDPairedInterval = (
  x: readonly number[],
  y: readonly number[],
): Result<EffectInterval, TestError> => {
  const d = cohensDPaired(x, y);
  return d.ok ? ok(oneSample(d.value, x.length)) : d;
};

/** η² de un ANOVA con F(df1, df2): unilateral al 95 %, [límite, 1]. */
export const etaSquaredInterval = (
  f: number,
  df1: number,
  df2: number,
): Result<EffectInterval, TestError> => {
  if (!(f >= 0) || df1 <= 0 || df2 <= 0) return err({ code: "no-variation" });
  // Unilateral al 95 %: la cota es el λ con P(F ≤ f; λ) = 0,95.
  const lambda = positiveNoncentrality((l) => noncentralFCdf(f, df1, df2, l), LEVEL);
  return ok({ low: lambda / (lambda + df2), high: 1 });
};

/** V de Cramér, con o sin la corrección de Bergsma: unilateral al 95 %, [límite, 1]. */
export const cramersVInterval = (
  table: readonly (readonly number[])[],
  adjust = true,
): Result<EffectInterval, TestError> => {
  const test = chiSquareIndependence(table, false);
  if (!test.ok) return test;
  const rows = table.length;
  const columns = table[0]?.length ?? 0;
  const n = table.reduce((total, row) => total + row.reduce((a, b) => a + b, 0), 0);
  const df = (rows - 1) * (columns - 1);
  const lambda = positiveNoncentrality(
    (l) => noncentralChiSquareCdf(test.value.statistic, df, l),
    LEVEL,
  );
  if (!adjust)
    return ok({ low: Math.sqrt(lambda / n) / Math.sqrt(Math.min(rows, columns) - 1), high: 1 });
  const phi = Math.sqrt(Math.max(0, lambda / n - df / (n - 1)));
  const k = rows - (rows - 1) ** 2 / (n - 1);
  const l = columns - (columns - 1) ** 2 / (n - 1);
  return ok({ low: phi / Math.sqrt(Math.min(k, l) - 1), high: 1 });
};
