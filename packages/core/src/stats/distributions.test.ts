import { describe, expect, it } from "vitest";
import {
  chiSquareCdf,
  chiSquareQuantile,
  fCdf,
  fQuantile,
  normalCdf,
  normalQuantile,
  studentTCdf,
  studentTQuantile,
} from "./distributions";
import { DISTRIBUTION_REFERENCE } from "./stats-reference";

/** Every function under test, by the name R gives it in the reference. */
const FUNCTIONS: Readonly<Record<string, (...args: number[]) => number>> = {
  pnorm: (x) => normalCdf(x ?? 0),
  pnormUpper: (x) => normalCdf(x ?? 0, { upper: true }),
  qnorm: (p) => normalQuantile(p ?? 0),
  pt: (t, df) => studentTCdf(t ?? 0, df ?? 1),
  ptUpper: (t, df) => studentTCdf(t ?? 0, df ?? 1, { upper: true }),
  qt: (p, df) => studentTQuantile(p ?? 0, df ?? 1),
  pchisq: (x, df) => chiSquareCdf(x ?? 0, df ?? 1),
  pchisqUpper: (x, df) => chiSquareCdf(x ?? 0, df ?? 1, { upper: true }),
  qchisq: (p, df) => chiSquareQuantile(p ?? 0, df ?? 1),
  pf: (f, d1, d2) => fCdf(f ?? 0, d1 ?? 1, d2 ?? 1),
  pfUpper: (f, d1, d2) => fCdf(f ?? 0, d1 ?? 1, d2 ?? 1, { upper: true }),
  qf: (p, d1, d2) => fQuantile(p ?? 0, d1 ?? 1, d2 ?? 1),
};

/** Relative error; an exact zero must be an exact zero. */
const relativeError = (actual: number, expected: number): number =>
  expected === 0 ? Math.abs(actual) : Math.abs(actual / expected - 1);

describe("distributions match R", () => {
  for (const reference of DISTRIBUTION_REFERENCE) {
    it(`${reference.fn}(${reference.args.join(", ")}) = ${reference.value}`, () => {
      const fn = FUNCTIONS[reference.fn];
      if (fn === undefined) throw new Error(`no function for ${reference.fn}`);
      expect(relativeError(fn(...reference.args), reference.value)).toBeLessThanOrEqual(1e-10);
    });
  }
});

describe("distribution edges", () => {
  it("returns the limits at 0 and 1 and refuses impossible arguments", () => {
    expect(normalQuantile(0)).toBe(Number.NEGATIVE_INFINITY);
    expect(normalQuantile(1)).toBe(Number.POSITIVE_INFINITY);
    expect(chiSquareCdf(0, 3)).toBe(0);
    expect(chiSquareCdf(-1, 3)).toBe(0);
    expect(fCdf(0, 2, 5, { upper: true })).toBe(1);
    expect(Number.isNaN(studentTCdf(1, 0))).toBe(true);
    expect(Number.isNaN(normalQuantile(1.5))).toBe(true);
  });
});
