/**
 * Tamaños del efecto: cuánto, no solo si. Un valor p dice si una diferencia es
 * compatible con el azar; el tamaño del efecto dice si importa.
 *
 * Se contrastan con el paquete `effectsize` de R (`effects.test.ts`, con los
 * valores de `scripts/r/build-effects-reference.R`), una implementación
 * independiente de estas fórmulas:
 *
 * - d de Cohen (1988): con desviación combinada para dos muestras; para datos
 *   pareados, d_z = media de las diferencias / su desviación.
 * - g de Hedges: d por la corrección exacta del sesgo,
 *   J = Γ(gl/2) / (√(gl/2)·Γ((gl − 1)/2)).
 * - V de Cramér, con la corrección de sesgo de Bergsma (2013), que es lo que
 *   `effectsize` da por defecto, o sin ella.
 * - η² y ω² del ANOVA de un factor.
 * - r biserial de rangos para Mann–Whitney: 2U/(n₁n₂) − 1.
 *
 * Aquí van las estimaciones puntuales; los intervalos de d, η² y V están en
 * `intervals.ts`, con las distribuciones no centrales.
 */
import { err, ok, type Result } from "../result";
import { logGamma } from "./distributions";
import {
  type AnovaResult,
  type TestError,
  anovaOneWay,
  chiSquareIndependence,
  ranks,
} from "./tests";

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);
const mean = (values: readonly number[]): number => sum(values) / values.length;
const variance = (values: readonly number[]): number => {
  const center = mean(values);
  return sum(values.map((value) => (value - center) ** 2)) / (values.length - 1);
};

const pooledSd = (x: readonly number[], y: readonly number[]): number =>
  Math.sqrt(
    ((x.length - 1) * variance(x) + (y.length - 1) * variance(y)) / (x.length + y.length - 2),
  );

export const cohensD = (x: readonly number[], y: readonly number[]): Result<number, TestError> => {
  if (x.length < 2 || y.length < 2) return err({ code: "too-few", minimum: 2 });
  const sd = pooledSd(x, y);
  return sd === 0 ? err({ code: "no-variation" }) : ok((mean(x) - mean(y)) / sd);
};

export const hedgesG = (x: readonly number[], y: readonly number[]): Result<number, TestError> => {
  const d = cohensD(x, y);
  if (!d.ok) return d;
  const df = x.length + y.length - 2;
  const correction = Math.exp(
    logGamma(df / 2) - Math.log(Math.sqrt(df / 2)) - logGamma((df - 1) / 2),
  );
  return ok(d.value * correction);
};

export const cohensDOneSample = (x: readonly number[], mu = 0): Result<number, TestError> => {
  if (x.length < 2) return err({ code: "too-few", minimum: 2 });
  const sd = Math.sqrt(variance(x));
  return sd === 0 ? err({ code: "no-variation" }) : ok((mean(x) - mu) / sd);
};

/** d_z de datos pareados. */
export const cohensDPaired = (
  x: readonly number[],
  y: readonly number[],
): Result<number, TestError> => {
  if (x.length !== y.length) return err({ code: "different-lengths" });
  return cohensDOneSample(x.map((value, index) => value - (y[index] ?? Number.NaN)));
};

export const cramersV = (
  table: readonly (readonly number[])[],
  adjust = true,
): Result<number, TestError> => {
  const test = chiSquareIndependence(table, false);
  if (!test.ok) return test;
  const r = table.length;
  const k = table[0]?.length ?? 0;
  const n = sum(table.map(sum));
  const phi2 = test.value.statistic / n;
  if (!adjust) return ok(Math.sqrt(phi2 / (Math.min(r, k) - 1)));
  const phi2Adjusted = Math.max(0, phi2 - ((k - 1) * (r - 1)) / (n - 1));
  const kAdjusted = k - (k - 1) ** 2 / (n - 1);
  const rAdjusted = r - (r - 1) ** 2 / (n - 1);
  return ok(Math.sqrt(phi2Adjusted / Math.min(kAdjusted - 1, rAdjusted - 1)));
};

export interface AnovaEffects {
  readonly etaSquared: number;
  readonly omegaSquared: number;
}

export const anovaEffects = (anova: AnovaResult): AnovaEffects => {
  const total = anova.ssBetween + anova.ssWithin;
  const msWithin = anova.ssWithin / anova.df2;
  return {
    etaSquared: anova.ssBetween / total,
    omegaSquared: (anova.ssBetween - (anova.df ?? 0) * msWithin) / (total + msWithin),
  };
};

export const anovaEffectsOf = (
  groups: readonly (readonly number[])[],
): Result<AnovaEffects, TestError> => {
  const anova = anovaOneWay(groups);
  return anova.ok ? ok(anovaEffects(anova.value)) : anova;
};

export const rankBiserial = (
  x: readonly number[],
  y: readonly number[],
): Result<number, TestError> => {
  if (x.length < 1 || y.length < 1) return err({ code: "too-few", minimum: 1 });
  const rank = ranks([...x, ...y]);
  const u = sum(rank.slice(0, x.length)) - (x.length * (x.length + 1)) / 2;
  return ok((2 * u) / (x.length * y.length) - 1);
};
