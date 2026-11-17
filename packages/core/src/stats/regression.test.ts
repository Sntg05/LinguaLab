import { describe, expect, it } from "vitest";
import { linearRegression } from "./regression";
import { REGRESSION_REFERENCE } from "./regression-reference";

const close = (actual: number | undefined, expected: number, tolerance: number): boolean =>
  actual !== undefined &&
  (expected === 0 ? Math.abs(actual) < tolerance : Math.abs(actual / expected - 1) <= tolerance);

describe("linear regression matches R's lm", () => {
  for (const reference of REGRESSION_REFERENCE) {
    it(`${reference.name}: coefficients, errors, t, p, R², F`, () => {
      const result = linearRegression(reference.y, reference.x);
      if (!result.ok) throw new Error(`expected a fit, got ${result.error.code}`);
      const fit = result.value;
      for (const key of ["coefficients", "standardErrors", "tValues", "pValues"] as const) {
        reference[key].forEach((value, index) => {
          expect(
            close(fit[key][index], value, 1e-9),
            `${key}[${index}]: ${fit[key][index]} vs ${value}`,
          ).toBe(true);
        });
      }
      for (const key of ["sigma", "rSquared", "adjustedRSquared", "f", "fP"] as const) {
        expect(
          close(fit[key], reference[key], 1e-9),
          `${key}: ${fit[key]} vs ${reference[key]}`,
        ).toBe(true);
      }
      expect([fit.dfModel, fit.dfResidual]).toEqual([reference.dfModel, reference.dfResidual]);
      // Residuos en escala absoluta: algunos están cerca de cero.
      reference.residuals.forEach((value, index) => {
        expect(Math.abs((fit.residuals[index] ?? Number.NaN) - value)).toBeLessThanOrEqual(1e-9);
      });
    });
  }
});

describe("regression refusals", () => {
  it("names collinear predictors, too few points and mismatched lengths", () => {
    expect(
      linearRegression(
        [1, 2, 3, 5],
        [
          [1, 2, 3, 4],
          [2, 4, 6, 8],
        ],
      ),
    ).toEqual({ ok: false, error: { code: "collinear" } });
    expect(linearRegression([1, 2], [[1, 2]])).toEqual({
      ok: false,
      error: { code: "too-few", minimum: 3 },
    });
    expect(linearRegression([1, 2, 3], [[1, 2]])).toEqual({
      ok: false,
      error: { code: "different-lengths" },
    });
    expect(linearRegression([4, 4, 4], [[1, 2, 3]])).toEqual({
      ok: false,
      error: { code: "no-variation" },
    });
  });
});
