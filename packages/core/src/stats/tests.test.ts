import { describe, expect, it } from "vitest";
import type { Result } from "../result";
import {
  anovaOneWay,
  chiSquareGoodnessOfFit,
  chiSquareIndependence,
  mannWhitneyTest,
  pearsonTest,
  ranks,
  signedRankTest,
  spearmanTest,
  tTestOneSample,
  tTestPaired,
  tTestTwoSample,
} from "./tests";
import { TESTS_REFERENCE } from "./tests-reference";

/** Same value to 1e-10 relative; R's `null` stands for an infinite or missing figure. */
const same = (actual: number | null | undefined, expected: number | null): boolean => {
  if (expected === null) return actual === null || actual === undefined || !Number.isFinite(actual);
  if (actual === null || actual === undefined) return false;
  return expected === 0 ? Math.abs(actual) < 1e-15 : Math.abs(actual / expected - 1) <= 1e-10;
};

const RUN: Readonly<Record<string, (input: any) => Result<any, unknown>>> = {
  tOne: (input) => tTestOneSample(input.x, input.mu, input.alternative),
  tWelch: (input) => tTestTwoSample(input.x, input.y, input.alternative),
  tStudent: (input) => tTestTwoSample(input.x, input.y, input.alternative, true),
  tPaired: (input) => tTestPaired(input.x, input.y, input.alternative),
  chiIndependence: (input) => chiSquareIndependence(input.table, input.correct),
  chiGoodness: (input) => chiSquareGoodnessOfFit(input.observed, input.expected),
  pearson: (input) => pearsonTest(input.x, input.y),
  spearman: (input) => spearmanTest(input.x, input.y),
  anova: (input) => anovaOneWay(input.groups),
  mannWhitney: (input) => mannWhitneyTest(input.x, input.y, input.alternative),
  signedRank: (input) => signedRankTest(input.x, input.y, input.alternative),
};

const SCALARS = ["statistic", "df", "df2", "p", "ssBetween", "ssWithin"] as const;

/** Every figure R reported for a case, compared with ours. */
const compareWithR = (actual: any, expected: any): void => {
  for (const key of SCALARS) {
    if (key in expected) {
      expect(same(actual[key], expected[key]), `${key}: ${actual[key]} vs ${expected[key]}`).toBe(
        true,
      );
    }
  }
  if ("exact" in expected) expect(actual.exact).toBe(expected.exact);
  for (const key of ["estimate", "ci", "expected"] as const) {
    if (!(key in expected)) continue;
    const wanted = (expected[key] as (number | null)[] | number[][]).flat();
    const got = ((actual[key] ?? []) as number[] | number[][]).flat();
    wanted.forEach((value, index) => {
      expect(same(got[index], value), `${key}[${index}]: ${got[index]} vs ${value}`).toBe(true);
    });
  }
};

describe("hypothesis tests match R", () => {
  for (const reference of TESTS_REFERENCE) {
    it(`${reference.name} (${reference.kind})`, () => {
      const run = RUN[reference.kind];
      if (run === undefined) throw new Error(`no test for ${reference.kind}`);
      const result = run(reference.input);
      if (!result.ok) throw new Error(`expected a result, got ${JSON.stringify(result.error)}`);
      compareWithR(result.value, reference.result);
    });
  }
});

describe("refusals and ranks", () => {
  it("ranks ties with their average, like R's rank()", () => {
    expect(ranks([10, 20, 20, 5])).toEqual([2, 3.5, 3.5, 1]);
  });

  it("names what is missing instead of returning NaN", () => {
    expect(tTestOneSample([3])).toEqual({ ok: false, error: { code: "too-few", minimum: 2 } });
    expect(tTestOneSample([2, 2, 2])).toEqual({ ok: false, error: { code: "no-variation" } });
    expect(tTestPaired([1, 2], [1])).toEqual({ ok: false, error: { code: "different-lengths" } });
    expect(chiSquareIndependence([[1, 2]])).toEqual({ ok: false, error: { code: "bad-table" } });
    expect(
      chiSquareIndependence([
        [0, 0],
        [1, 2],
      ]),
    ).toEqual({ ok: false, error: { code: "bad-table" } });
    expect(chiSquareGoodnessOfFit([5, 5], [0.3, 0.3])).toEqual({
      ok: false,
      error: { code: "bad-probabilities" },
    });
    expect(
      anovaOneWay([
        [1, 1],
        [2, 2],
      ]),
    ).toEqual({ ok: false, error: { code: "no-variation" } });
  });
});
