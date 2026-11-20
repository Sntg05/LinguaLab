import { describe, expect, it } from "vitest";
import {
  chiSquareOneDfUpperTail,
  logLikelihood,
  logRatio,
  normalUpperTail,
} from "./keyness";
import { KEYNESS_REFERENCE } from "./keyness-reference";

/**
 * Same value to 1e-10 relative. An absolute floor would let every p below it
 * pass unchecked (an independent verifier showed a broken Cody constant
 * slipping through one), so only an exact zero is accepted as such.
 */
const close = (actual: number, expected: number): boolean =>
  expected === 0 ? actual === 0 : Math.abs(actual / expected - 1) <= 1e-10;

describe("keyness matches base R", () => {
  for (const reference of KEYNESS_REFERENCE) {
    const { a, b, n1, n2 } = reference;
    const label = `a=${a}, b=${b}, n1=${n1}, n2=${n2}`;

    it(`${label}: G² equals the deviance of R's Poisson independence model`, () => {
      // With equal rates the exact G² is 0 and R's glm leaves a ~1e-12 residue.
      const g2 = logLikelihood(a, b, n1, n2);
      expect(reference.g2 < 1e-9 ? g2 < 1e-9 : close(g2, reference.g2)).toBe(true);
    });

    it(`${label}: p at R's G² equals pchisq(G², 1, lower.tail = FALSE)`, () => {
      // The tail is checked at R's own G². Fed our G² instead, p would also carry
      // the ~1e-12 gap between glm's iterative deviance and the closed formula,
      // multiplied by G²/2 (185 for the 500/100 case): that is G²'s precision,
      // already checked above, not the tail's.
      expect(close(chiSquareOneDfUpperTail(reference.g2), reference.p)).toBe(true);
    });

    it(`${label}: log ratio equals Hardie's formula in R`, () => {
      expect(logRatio(a, b, n1, n2)).toBeCloseTo(reference.logRatio, 12);
    });
  }
});

describe("normal and chi-square tails", () => {
  it("covers the three ranges of Cody's approximation", () => {
    // Values printed by R 4.5.2 with sprintf("%.17g"): 1 - pnorm(0.5), pnorm(-10), qnorm(0.975).
    expect(normalUpperTail(0)).toBe(0.5);
    expect(normalUpperTail(0.5)).toBeCloseTo(0.308537538725987, 15);
    expect(normalUpperTail(1.9599639845400536)).toBeCloseTo(0.025, 15);
    expect(normalUpperTail(10) / 7.619853024160527e-24).toBeCloseTo(1, 12);
  });

  it("matches pnorm bit for bit far into the tail (R 4.5.2, sprintf %.17g)", () => {
    const cases: [number, number][] = [
      [8.3, 5.2055697448902552e-17],
      [15.7, 7.5621031746837832e-56],
      [26.9, 1.098106956511132e-159],
      [37.5, 4.6053530095819552e-308],
    ];
    for (const [y, expected] of cases) {
      expect(Math.abs(normalUpperTail(y) / expected - 1)).toBeLessThanOrEqual(1e-15);
    }
  });

  it("gives the usual critical values of G² (qchisq(0.95, 1) and qchisq(0.99, 1) in R)", () => {
    expect(chiSquareOneDfUpperTail(3.841458820694124)).toBeCloseTo(0.05, 12);
    expect(chiSquareOneDfUpperTail(6.634896601021213)).toBeCloseTo(0.01, 12);
    expect(chiSquareOneDfUpperTail(0)).toBe(1);
  });

  it("G² is zero when the word is in neither or in every position", () => {
    expect(logLikelihood(0, 0, 100, 100)).toBe(0);
    expect(logLikelihood(100, 100, 100, 100)).toBe(0);
  });
});
