/**
 * Pruebas de hipótesis, con las mismas decisiones que R para que los números
 * coincidan (`tests.test.ts`, contra `scripts/r/build-tests-reference.R`):
 *
 * - t de dos muestras: Welch por defecto (`var.equal = FALSE` en R); Student
 *   solo si se pide varianza igual.
 * - χ² de independencia: corrección de Yates solo en tablas 2×2 y solo si se
 *   pide (R la aplica por defecto en 2×2).
 * - Spearman: la aproximación t (R con `exact = FALSE`), la que R usa siempre
 *   que hay empates.
 * - Mann–Whitney y Wilcoxon: distribución exacta si no hay empates (ni ceros
 *   en la pareada) y cada muestra tiene menos de 50 valores; si no, la normal
 *   con corrección de continuidad y de empates.
 *
 * Los valores p salen de `distributions.ts`, contrastado aparte.
 */
import { err, ok, type Result } from "../result";
import {
  chiSquareCdf,
  fCdf,
  normalCdf,
  normalQuantile,
  studentTCdf,
  studentTQuantile,
} from "./distributions";

export type Alternative = "two.sided" | "less" | "greater";

export interface TestResult {
  readonly statistic: number;
  /** Grados de libertad, si la prueba los tiene. */
  readonly df: number | null;
  readonly p: number;
  /** Lo que se estima: medias, diferencia, correlación. */
  readonly estimate: readonly number[];
  /** Intervalo de confianza al 95 %; un extremo infinito en las pruebas de una cola. */
  readonly ci: readonly [number, number] | null;
}

export type TestError =
  | { readonly code: "too-few"; readonly minimum: number }
  | { readonly code: "different-lengths" }
  | { readonly code: "no-variation" }
  | { readonly code: "bad-table" }
  | { readonly code: "bad-probabilities" };

const CONFIDENCE = 0.95;

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);
const mean = (values: readonly number[]): number => sum(values) / values.length;
const variance = (values: readonly number[]): number => {
  const center = mean(values);
  return sum(values.map((value) => (value - center) ** 2)) / (values.length - 1);
};

/** p de un estadístico t según la alternativa. */
const tTail = (t: number, df: number, alternative: Alternative): number => {
  if (alternative === "less") return studentTCdf(t, df);
  if (alternative === "greater") return studentTCdf(t, df, { upper: true });
  return 2 * studentTCdf(-Math.abs(t), df);
};

/** Intervalo alrededor de `center` con error estándar `se`, como `t.test`. */
const tInterval = (
  center: number,
  se: number,
  df: number,
  alternative: Alternative,
): readonly [number, number] => {
  if (alternative === "less") {
    return [Number.NEGATIVE_INFINITY, center + studentTQuantile(CONFIDENCE, df) * se];
  }
  if (alternative === "greater") {
    return [center - studentTQuantile(CONFIDENCE, df) * se, Number.POSITIVE_INFINITY];
  }
  const half = studentTQuantile(1 - (1 - CONFIDENCE) / 2, df) * se;
  return [center - half, center + half];
};

/* ---------------------------------------------------------------
   t
   --------------------------------------------------------------- */

export const tTestOneSample = (
  x: readonly number[],
  mu = 0,
  alternative: Alternative = "two.sided",
): Result<TestResult, TestError> => {
  if (x.length < 2) return err({ code: "too-few", minimum: 2 });
  const se = Math.sqrt(variance(x) / x.length);
  if (se === 0) return err({ code: "no-variation" });
  const df = x.length - 1;
  const estimate = mean(x);
  const t = (estimate - mu) / se;
  const [low, high] = tInterval(estimate - mu, se, df, alternative);
  return ok({
    statistic: t,
    df,
    p: tTail(t, df, alternative),
    estimate: [estimate],
    ci: [low + mu, high + mu],
  });
};

export const tTestPaired = (
  x: readonly number[],
  y: readonly number[],
  alternative: Alternative = "two.sided",
): Result<TestResult, TestError> => {
  if (x.length !== y.length) return err({ code: "different-lengths" });
  return tTestOneSample(
    x.map((value, index) => value - (y[index] ?? Number.NaN)),
    0,
    alternative,
  );
};

/** t de dos muestras independientes: Welch, o Student con `equalVariance`. */
export const tTestTwoSample = (
  x: readonly number[],
  y: readonly number[],
  alternative: Alternative = "two.sided",
  equalVariance = false,
): Result<TestResult, TestError> => {
  if (x.length < 2 || y.length < 2) return err({ code: "too-few", minimum: 2 });
  const [nx, ny] = [x.length, y.length];
  const [vx, vy] = [variance(x), variance(y)];
  let se: number;
  let df: number;
  if (equalVariance) {
    df = nx + ny - 2;
    const pooled = ((nx - 1) * vx + (ny - 1) * vy) / df;
    se = Math.sqrt(pooled * (1 / nx + 1 / ny));
  } else {
    const [sx, sy] = [vx / nx, vy / ny];
    se = Math.sqrt(sx + sy);
    // Welch–Satterthwaite.
    df = (sx + sy) ** 2 / (sx ** 2 / (nx - 1) + sy ** 2 / (ny - 1));
  }
  if (se === 0) return err({ code: "no-variation" });
  const [mx, my] = [mean(x), mean(y)];
  const t = (mx - my) / se;
  return ok({
    statistic: t,
    df,
    p: tTail(t, df, alternative),
    estimate: [mx, my],
    ci: tInterval(mx - my, se, df, alternative),
  });
};

/* ---------------------------------------------------------------
   χ²
   --------------------------------------------------------------- */

export interface ChiSquareResult extends TestResult {
  /** Frecuencias esperadas bajo independencia: si alguna es menor que 5, la aproximación falla. */
  readonly expected: readonly (readonly number[])[];
}

export const chiSquareIndependence = (
  table: readonly (readonly number[])[],
  yates = true,
): Result<ChiSquareResult, TestError> => {
  const rows = table.length;
  const columns = table[0]?.length ?? 0;
  if (
    rows < 2 ||
    columns < 2 ||
    table.some((row) => row.length !== columns || row.some((cell) => !(cell >= 0)))
  ) {
    return err({ code: "bad-table" });
  }
  const rowTotals = table.map(sum);
  const columnTotals = Array.from({ length: columns }, (_, j) =>
    sum(table.map((row) => row[j] ?? 0)),
  );
  const total = sum(rowTotals);
  if (total === 0 || rowTotals.includes(0) || columnTotals.includes(0))
    return err({ code: "bad-table" });
  const expected = rowTotals.map((rowTotal) =>
    columnTotals.map((columnTotal) => (rowTotal * columnTotal) / total),
  );
  const cells = table.flatMap((row, i) =>
    row.map((observed, j) => [observed, expected[i]?.[j] ?? 0] as const),
  );
  // Como R: una sola corrección para toda la tabla, la menor entre 0,5 y |O − E|.
  const correction =
    yates && rows === 2 && columns === 2
      ? Math.min(0.5, ...cells.map(([observed, wanted]) => Math.abs(observed - wanted)))
      : 0;
  const statistic = sum(
    cells.map(([observed, wanted]) => (Math.abs(observed - wanted) - correction) ** 2 / wanted),
  );
  const df = (rows - 1) * (columns - 1);
  return ok({
    statistic,
    df,
    p: chiSquareCdf(statistic, df, { upper: true }),
    estimate: [],
    ci: null,
    expected,
  });
};

/** Bondad de ajuste; sin proporciones, se contrasta con la distribución uniforme. */
export const chiSquareGoodnessOfFit = (
  observed: readonly number[],
  probabilities: readonly number[] | null = null,
): Result<TestResult, TestError> => {
  if (observed.length < 2) return err({ code: "too-few", minimum: 2 });
  const probs = probabilities ?? observed.map(() => 1 / observed.length);
  if (
    probs.length !== observed.length ||
    Math.abs(sum(probs) - 1) > 1e-9 ||
    probs.some((p) => !(p > 0))
  ) {
    return err({ code: "bad-probabilities" });
  }
  const n = sum(observed);
  const statistic = sum(
    observed.map(
      (count, index) => (count - n * (probs[index] ?? 0)) ** 2 / (n * (probs[index] ?? 1)),
    ),
  );
  const df = observed.length - 1;
  return ok({
    statistic,
    df,
    p: chiSquareCdf(statistic, df, { upper: true }),
    estimate: [],
    ci: null,
  });
};

/* ---------------------------------------------------------------
   Correlación
   --------------------------------------------------------------- */

const pearsonR = (x: readonly number[], y: readonly number[]): number => {
  const [mx, my] = [mean(x), mean(y)];
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  x.forEach((value, index) => {
    const dx = value - mx;
    const dy = (y[index] ?? Number.NaN) - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  });
  return sxy / Math.sqrt(sxx * syy);
};

const checkPairs = (
  x: readonly number[],
  y: readonly number[],
  minimum: number,
): TestError | null => {
  if (x.length !== y.length) return { code: "different-lengths" };
  if (x.length < minimum) return { code: "too-few", minimum };
  return null;
};

/** Pearson, con su intervalo por la transformación z de Fisher (como `cor.test`). */
export const pearsonTest = (
  x: readonly number[],
  y: readonly number[],
): Result<TestResult, TestError> => {
  const bad = checkPairs(x, y, 4);
  if (bad !== null) return err(bad);
  const r = pearsonR(x, y);
  if (!Number.isFinite(r)) return err({ code: "no-variation" });
  const df = x.length - 2;
  const t = r * Math.sqrt(df / (1 - r * r));
  const z = Math.atanh(r);
  const half = normalQuantile(1 - (1 - CONFIDENCE) / 2) / Math.sqrt(x.length - 3);
  return ok({
    statistic: t,
    df,
    p: tTail(t, df, "two.sided"),
    estimate: [r],
    ci: [Math.tanh(z - half), Math.tanh(z + half)],
  });
};

/** Rangos con empates promediados, como `rank()` de R. */
export const ranks = (values: readonly number[]): number[] => {
  const order = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);
  const result = new Array<number>(values.length).fill(0);
  for (let start = 0; start < order.length; ) {
    let end = start;
    while (end + 1 < order.length && order[end + 1]?.value === order[start]?.value) end += 1;
    const average = (start + end) / 2 + 1;
    for (let k = start; k <= end; k += 1) result[order[k]?.index ?? 0] = average;
    start = end + 1;
  }
  return result;
};

/** Tamaños de los grupos de empates. */
const tieSizes = (values: readonly number[]): number[] => {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.values()].filter((count) => count > 1);
};

/** Spearman con la aproximación t de R (`exact = FALSE`); el estadístico es S = Σ d². */
export const spearmanTest = (
  x: readonly number[],
  y: readonly number[],
): Result<TestResult, TestError> => {
  const bad = checkPairs(x, y, 4);
  if (bad !== null) return err(bad);
  const rho = pearsonR(ranks(x), ranks(y));
  if (!Number.isFinite(rho)) return err({ code: "no-variation" });
  const n = x.length;
  const denominator = (n * (n * n - 1)) / 6;
  const s = denominator * (1 - rho);
  // `pspearman` de R (`cor.test.default`), rama asintótica: r = 1 − q/den y la t
  // con n − 2, tomando la cola del lado en que cae S.
  const tailOf = (lower: boolean): number => {
    const r = 1 - s / denominator;
    return studentTCdf(r / Math.sqrt((1 - r * r) / (n - 2)), n - 2, { upper: lower });
  };
  const p = tailOf(s <= denominator);
  return ok({ statistic: s, df: null, p: Math.min(2 * p, 1), estimate: [rho], ci: null });
};

/* ---------------------------------------------------------------
   ANOVA de un factor
   --------------------------------------------------------------- */

export interface AnovaResult extends TestResult {
  readonly df2: number;
  readonly ssBetween: number;
  readonly ssWithin: number;
}

export const anovaOneWay = (
  groups: readonly (readonly number[])[],
): Result<AnovaResult, TestError> => {
  if (groups.length < 2 || groups.some((group) => group.length < 1))
    return err({ code: "too-few", minimum: 2 });
  const all = groups.flat();
  if (all.length <= groups.length) return err({ code: "too-few", minimum: groups.length + 1 });
  const grand = mean(all);
  const ssBetween = sum(groups.map((group) => group.length * (mean(group) - grand) ** 2));
  const ssWithin = sum(
    groups.map((group) => sum(group.map((value) => (value - mean(group)) ** 2))),
  );
  if (ssWithin === 0) return err({ code: "no-variation" });
  const df = groups.length - 1;
  const df2 = all.length - groups.length;
  const statistic = ssBetween / df / (ssWithin / df2);
  return ok({
    statistic,
    df,
    df2,
    p: fCdf(statistic, df, df2, { upper: true }),
    estimate: groups.map(mean),
    ci: null,
    ssBetween,
    ssWithin,
  });
};

/* ---------------------------------------------------------------
   Rangos: Mann–Whitney y Wilcoxon
   --------------------------------------------------------------- */

export interface RankTestResult extends TestResult {
  /** Verdadero si el p sale de la distribución exacta y no de la normal. */
  readonly exact: boolean;
}

/** Cuántas maneras hay de obtener cada U = 0…m·n: el binomial gaussiano [m+n, m]. */
const mannWhitneyCounts = (m: number, n: number): number[] => {
  const size = m * n;
  const counts = new Array<number>(size + 1).fill(0);
  counts[0] = 1;
  for (let i = 1; i <= m; i += 1) {
    // Dividir por (1 − qⁱ) y multiplicar por (1 − q^(n+i)).
    for (let k = i; k <= size; k += 1) counts[k] = (counts[k] ?? 0) + (counts[k - i] ?? 0);
    for (let k = size; k >= n + i; k -= 1) counts[k] = (counts[k] ?? 0) - (counts[k - n - i] ?? 0);
  }
  return counts;
};

/** Cuántos subconjuntos de {1…n} suman cada valor: la distribución del rango con signo. */
const signedRankCounts = (n: number): number[] => {
  const size = (n * (n + 1)) / 2;
  const counts = new Array<number>(size + 1).fill(0);
  counts[0] = 1;
  for (let i = 1; i <= n; i += 1) {
    for (let k = size; k >= i; k -= 1) counts[k] = (counts[k] ?? 0) + (counts[k - i] ?? 0);
  }
  return counts;
};

/** p exacto de un estadístico con distribución `counts`, con las reglas de R. */
const exactP = (counts: readonly number[], statistic: number, alternative: Alternative): number => {
  const total = sum(counts);
  const atMost = (q: number): number => sum(counts.slice(0, Math.floor(q) + 1)) / total;
  const above = (q: number): number => sum(counts.slice(Math.floor(q) + 1)) / total;
  if (alternative === "less") return atMost(statistic);
  if (alternative === "greater") return above(statistic - 1);
  const center = (counts.length - 1) / 2;
  const p = statistic > center ? above(statistic - 1) : atMost(statistic);
  return Math.min(2 * p, 1);
};

/** p normal con corrección de continuidad, como `wilcox.test`. */
const normalP = (z: number, sigma: number, alternative: Alternative): number => {
  const correction =
    alternative === "two.sided" ? Math.sign(z) * 0.5 : alternative === "greater" ? 0.5 : -0.5;
  const standard = (z - correction) / sigma;
  if (alternative === "less") return normalCdf(standard);
  if (alternative === "greater") return normalCdf(standard, { upper: true });
  return 2 * Math.min(normalCdf(standard), normalCdf(standard, { upper: true }));
};

/** Mann–Whitney (Wilcoxon de suma de rangos); el estadístico es W de R. */
export const mannWhitneyTest = (
  x: readonly number[],
  y: readonly number[],
  alternative: Alternative = "two.sided",
): Result<RankTestResult, TestError> => {
  if (x.length < 1 || y.length < 1) return err({ code: "too-few", minimum: 1 });
  const [m, n] = [x.length, y.length];
  const combined = [...x, ...y];
  const rank = ranks(combined);
  const w = sum(rank.slice(0, m)) - (m * (m + 1)) / 2;
  const ties = tieSizes(combined);
  if (m < 50 && n < 50 && ties.length === 0) {
    return ok({
      statistic: w,
      df: null,
      p: exactP(mannWhitneyCounts(m, n), w, alternative),
      estimate: [],
      ci: null,
      exact: true,
    });
  }
  const tieTerm = sum(ties.map((t) => t ** 3 - t)) / ((m + n) * (m + n - 1));
  const sigma = Math.sqrt(((m * n) / 12) * (m + n + 1 - tieTerm));
  if (sigma === 0) return err({ code: "no-variation" });
  return ok({
    statistic: w,
    df: null,
    p: normalP(w - (m * n) / 2, sigma, alternative),
    estimate: [],
    ci: null,
    exact: false,
  });
};

/** Wilcoxon de rangos con signo para datos pareados; el estadístico es V de R. */
export const signedRankTest = (
  x: readonly number[],
  y: readonly number[],
  alternative: Alternative = "two.sided",
): Result<RankTestResult, TestError> => {
  if (x.length !== y.length) return err({ code: "different-lengths" });
  const differences = x.map((value, index) => value - (y[index] ?? Number.NaN));
  const hasZeros = differences.some((value) => value === 0);
  // Como R por defecto: las diferencias nulas se descartan.
  const kept = differences.filter((value) => value !== 0);
  const n = kept.length;
  if (n < 1) return err({ code: "too-few", minimum: 1 });
  const rank = ranks(kept.map(Math.abs));
  const v = sum(rank.filter((_, index) => (kept[index] ?? 0) > 0));
  const ties = tieSizes(kept.map(Math.abs));
  if (n < 50 && ties.length === 0 && !hasZeros) {
    return ok({
      statistic: v,
      df: null,
      p: exactP(signedRankCounts(n), v, alternative),
      estimate: [],
      ci: null,
      exact: true,
    });
  }
  const sigma = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24 - sum(ties.map((t) => t ** 3 - t)) / 48);
  if (sigma === 0) return err({ code: "no-variation" });
  return ok({
    statistic: v,
    df: null,
    p: normalP(v - (n * (n + 1)) / 4, sigma, alternative),
    estimate: [],
    ci: null,
    exact: false,
  });
};
