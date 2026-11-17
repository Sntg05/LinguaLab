/**
 * Regresión lineal por mínimos cuadrados, simple o múltiple, con intercepto.
 *
 * Se resuelve con la descomposición QR de Householder y no con las ecuaciones
 * normales (XᵀX)b = Xᵀy: estas elevan al cuadrado el número de condición y
 * pierden dígitos cuando los predictores se parecen. Es el mismo camino que
 * sigue `lm` de R, y con él se contrasta (`regression.test.ts`, valores de
 * `scripts/r/build-regression-reference.R`): coeficientes, errores estándar,
 * t, p, σ residual, R², R² ajustado, F y residuos.
 */
import { err, ok, type Result } from "../result";
import { fCdf, studentTCdf } from "./distributions";

export interface RegressionResult {
  /** Intercepto primero, después un coeficiente por predictor. */
  readonly coefficients: readonly number[];
  readonly standardErrors: readonly number[];
  readonly tValues: readonly number[];
  readonly pValues: readonly number[];
  /** Error estándar residual. */
  readonly sigma: number;
  readonly rSquared: number;
  readonly adjustedRSquared: number;
  readonly f: number;
  readonly dfModel: number;
  readonly dfResidual: number;
  readonly fP: number;
  readonly residuals: readonly number[];
  readonly fitted: readonly number[];
}

export type RegressionError =
  | { readonly code: "too-few"; readonly minimum: number }
  | { readonly code: "different-lengths" }
  | { readonly code: "collinear" }
  | { readonly code: "no-variation" };

/**
 * QR de Householder sobre una copia de X (n × p, por columnas). Devuelve R
 * (triangular superior p × p) y Qᵀy, sin formar Q.
 */
const householder = (
  columns: number[][],
  y: number[],
): { readonly r: number[][]; readonly qty: number[] } | null => {
  const n = y.length;
  const p = columns.length;
  const scale = Math.max(
    ...columns.map((column) => Math.sqrt(column.reduce((s, v) => s + v * v, 0))),
  );
  for (let k = 0; k < p; k += 1) {
    const column = columns[k] ?? [];
    let norm = 0;
    for (let i = k; i < n; i += 1) norm += (column[i] ?? 0) ** 2;
    norm = Math.sqrt(norm);
    // Una columna que ya no aporta nada nuevo: los predictores son colineales.
    if (norm <= 1e-10 * scale) return null;
    const alpha = (column[k] ?? 0) > 0 ? -norm : norm;
    const v = column.map((value, i) => (i < k ? 0 : i === k ? value - alpha : value));
    const vv = v.reduce((s, value) => s + value * value, 0);
    const reflect = (target: number[]): void => {
      let dot = 0;
      for (let i = k; i < n; i += 1) dot += (v[i] ?? 0) * (target[i] ?? 0);
      const factor = (2 * dot) / vv;
      for (let i = k; i < n; i += 1) target[i] = (target[i] ?? 0) - factor * (v[i] ?? 0);
    };
    for (let j = k; j < p; j += 1) reflect(columns[j] ?? []);
    reflect(y);
  }
  const r = Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) => (j >= i ? (columns[j]?.[i] ?? 0) : 0)),
  );
  return { r, qty: y };
};

/** Resuelve R·b = c por sustitución hacia atrás. */
const backSolve = (r: readonly (readonly number[])[], c: readonly number[]): number[] => {
  const p = r.length;
  const b = new Array<number>(p).fill(0);
  for (let i = p - 1; i >= 0; i -= 1) {
    let value = c[i] ?? 0;
    for (let j = i + 1; j < p; j += 1) value -= (r[i]?.[j] ?? 0) * (b[j] ?? 0);
    b[i] = value / (r[i]?.[i] ?? 1);
  }
  return b;
};

/** Diagonal de (RᵀR)⁻¹ = R⁻¹R⁻ᵀ: la suma de cuadrados de cada fila de R⁻¹. */
const inverseDiagonal = (r: readonly (readonly number[])[]): number[] => {
  const p = r.length;
  const inverseColumns = Array.from({ length: p }, (_, j) =>
    backSolve(
      r,
      Array.from({ length: p }, (_, i) => (i === j ? 1 : 0)),
    ),
  );
  return Array.from({ length: p }, (_, i) =>
    inverseColumns.reduce((s, column) => s + (column[i] ?? 0) ** 2, 0),
  );
};

/** y ~ x₁ + … + x_k, con intercepto. `predictors` va por variables (una lista por predictor). */
export const linearRegression = (
  y: readonly number[],
  predictors: readonly (readonly number[])[],
): Result<RegressionResult, RegressionError> => {
  const n = y.length;
  const p = predictors.length + 1;
  if (predictors.some((column) => column.length !== n)) return err({ code: "different-lengths" });
  if (n <= p) return err({ code: "too-few", minimum: p + 1 });

  const columns = [new Array<number>(n).fill(1), ...predictors.map((column) => [...column])];
  const decomposition = householder(columns, [...y]);
  if (decomposition === null) return err({ code: "collinear" });
  const { r, qty } = decomposition;

  const coefficients = backSolve(r, qty);
  const fitted = y.map((_, i) =>
    coefficients.reduce((s, b, j) => s + b * (j === 0 ? 1 : (predictors[j - 1]?.[i] ?? 0)), 0),
  );
  const residuals = y.map((value, i) => value - (fitted[i] ?? 0));
  const rss = residuals.reduce((s, e) => s + e * e, 0);
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  const tss = y.reduce((s, v) => s + (v - meanY) ** 2, 0);
  if (tss === 0) return err({ code: "no-variation" });

  const dfResidual = n - p;
  const dfModel = p - 1;
  const sigma2 = rss / dfResidual;
  const standardErrors = inverseDiagonal(r).map((value) => Math.sqrt(sigma2 * value));
  const tValues = coefficients.map((b, j) => b / (standardErrors[j] ?? Number.NaN));
  const rSquared = 1 - rss / tss;
  const f = (tss - rss) / dfModel / sigma2;

  return ok({
    coefficients,
    standardErrors,
    tValues,
    pValues: tValues.map((t) => 2 * studentTCdf(-Math.abs(t), dfResidual)),
    sigma: Math.sqrt(sigma2),
    rSquared,
    adjustedRSquared: 1 - ((1 - rSquared) * (n - 1)) / dfResidual,
    f,
    dfModel,
    dfResidual,
    fP: fCdf(f, dfModel, dfResidual, { upper: true }),
    residuals,
    fitted,
  });
};
