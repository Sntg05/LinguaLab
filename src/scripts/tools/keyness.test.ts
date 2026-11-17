import { describe, expect, it } from "vitest";
import {
  chiSquareOneDfUpperTail,
  logLikelihood,
  logRatio,
  normalUpperTail,
} from "./keyness";
import { KEYNESS_REFERENCE } from "./keyness-reference";

/** Same value to 1e-10 relative, or both below 1e-9 in absolute terms. */
const close = (actual: number, expected: number): boolean =>
  Math.abs(actual - expected) <= 1e-9 || Math.abs(actual / expected - 1) <= 1e-10;

describe("keyness matches base R", () => {
  for (const reference of KEYNESS_REFERENCE) {
    const { a, b, n1, n2 } = reference;
    const label = `a=${a}, b=${b}, n1=${n1}, n2=${n2}`;

    it(`${label}: G² equals the deviance of R's Poisson independence model`, () => {
      expect(close(logLikelihood(a, b, n1, n2), reference.g2)).toBe(true);
    });

    it(`${label}: p equals pchisq(G², 1, lower.tail = FALSE)`, () => {
      // With equal rates R's glm leaves a residue of ~1e-12 in G², so its p is
      // 0.999999 where the exact value is 1.
      const p = chiSquareOneDfUpperTail(logLikelihood(a, b, n1, n2));
      if (reference.g2 < 1e-9) {
        expect(p).toBe(1);
      } else {
        expect(close(p, reference.p)).toBe(true);
      }
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
