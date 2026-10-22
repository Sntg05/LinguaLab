/**
 * The n-gram builder's form is free; the engine's contract is not. These tests
 * pin the boundary between the two, and they existed before the module did.
 *
 * Everything the form can produce goes through `normaliseNgramSettings`: a
 * number typed as text, a cleared field, an out-of-range value, a stale option.
 * The engine must never see any of that.
 */
import { describe, expect, it } from "vitest";

import { NGRAM_DEFAULTS, normaliseNgramSettings } from "./ngram-settings";

describe("normaliseNgramSettings", () => {
  it("reproduces the exact call the panel made before the builder existed", () => {
    // ngrams(tokens, 2, { minCount: 2, limit: 25 }) with the engine's default
    // sort. If these defaults drift, the previous behaviour silently changes.
    expect(normaliseNgramSettings({})).toEqual({
      n: 2,
      minCount: 2,
      limit: 25,
      sortBy: "logLikelihood",
    });
    expect(NGRAM_DEFAULTS).toEqual({ n: 2, minCount: 2, limit: 25, sortBy: "logLikelihood" });
  });

  it("keeps valid values as given, without rounding or reordering", () => {
    expect(normaliseNgramSettings({ n: "4", minCount: "3", limit: "100" })).toEqual({
      n: 4,
      minCount: 3,
      limit: 100,
      sortBy: "logLikelihood",
    });
  });

  it("clamps n to 2..5, the only sizes the builder offers", () => {
    expect(normaliseNgramSettings({ n: "1" }).n).toBe(2);
    expect(normaliseNgramSettings({ n: "0" }).n).toBe(2);
    expect(normaliseNgramSettings({ n: "-3" }).n).toBe(2);
    expect(normaliseNgramSettings({ n: "6" }).n).toBe(5);
    expect(normaliseNgramSettings({ n: "999" }).n).toBe(5);
    expect(normaliseNgramSettings({ n: "5" }).n).toBe(5);
  });

  it("clamps the minimum frequency to 1 and the row limit to 1..500", () => {
    expect(normaliseNgramSettings({ minCount: "0" }).minCount).toBe(1);
    expect(normaliseNgramSettings({ minCount: "-7" }).minCount).toBe(1);
    expect(normaliseNgramSettings({ limit: "0" }).limit).toBe(1);
    expect(normaliseNgramSettings({ limit: "100000" }).limit).toBe(500);
  });

  it("falls back to the defaults when a field is empty or not a number", () => {
    for (const raw of ["", "   ", "abc", Number.NaN, null, undefined]) {
      expect(normaliseNgramSettings({ n: raw, minCount: raw, limit: raw })).toEqual(NGRAM_DEFAULTS);
    }
  });

  it("truncates decimals instead of accepting a fractional n", () => {
    expect(normaliseNgramSettings({ n: "3.9" }).n).toBe(3);
    expect(normaliseNgramSettings({ minCount: "2.7" }).minCount).toBe(2);
  });

  it("passes through every sort key the engine supports", () => {
    for (const sortBy of ["logDice", "pmi", "tScore", "logLikelihood", "count"] as const) {
      expect(normaliseNgramSettings({ sortBy }).sortBy).toBe(sortBy);
    }
  });

  it("ignores a sort key the engine does not support", () => {
    // A stale <option>, or someone editing the URL. The engine has no such key.
    for (const sortBy of ["", "logdice", "LOG_DICE", "frequency", null, undefined]) {
      expect(normaliseNgramSettings({ sortBy }).sortBy).toBe("logLikelihood");
    }
  });
});
