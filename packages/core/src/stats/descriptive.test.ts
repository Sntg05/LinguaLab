import { describe, expect, it } from "vitest";
import { describeSample, modes, quantileType7 } from "./descriptive";
import { DESCRIPTIVE_REFERENCE } from "./stats-reference";

const close = (actual: number | null, expected: number | null): boolean =>
  expected === null
    ? actual === null
    : actual !== null && Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected));

describe("descriptive statistics match R", () => {
  for (const reference of DESCRIPTIVE_REFERENCE) {
    it(`${reference.name}: mean, median, var, sd, quantile(type = 7) and skewness`, () => {
      const result = describeSample(reference.values);
      if (!result.ok) throw new Error("expected a summary");
      const summary = result.value;
      expect(summary.n).toBe(reference.values.length);
      expect(close(summary.mean, reference.mean)).toBe(true);
      expect(close(summary.median, reference.median)).toBe(true);
      expect(close(summary.variance, reference.variance)).toBe(true);
      expect(close(summary.sd, reference.sd)).toBe(true);
      expect(close(summary.skewness, reference.skewness)).toBe(true);
      const quartiles = [summary.min, summary.q1, summary.median, summary.q3, summary.max];
      quartiles.forEach((value, index) => {
        expect(close(value, reference.quartiles[index] ?? null)).toBe(true);
      });
      expect(summary.range).toBe(summary.max - summary.min);
    });
  }
});

describe("modes and quantiles", () => {
  it("returns every most frequent value, in order, and none when all tie", () => {
    expect(modes([4, 1, 3, 3, 10, 2])).toEqual([3]);
    expect(modes([2, 1, 2, 1, 5])).toEqual([1, 2]);
    expect(modes([1, 2, 3])).toEqual([]);
  });

  it("interpolates like R's type 7", () => {
    expect(quantileType7([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantileType7([10], 0.9)).toBe(10);
  });

  it("refuses an empty sample or a value that is not a number instead of returning NaN figures", () => {
    expect(describeSample([])).toEqual({ ok: false, error: { code: "empty" } });
    expect(describeSample([1, Number.NaN])).toEqual({ ok: false, error: { code: "not-finite" } });
  });
});
