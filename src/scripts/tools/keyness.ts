/* ============================================================
   LinguaLab — keyness: which words set one document apart from another

   Pure functions, no DOM. Checked against base R in `keyness.test.ts` with
   the values `scripts/r/build-keyness-reference.R` writes to
   `keyness-reference.ts`.

   THE MEASURES

   - Log-likelihood G² (Dunning, 1993) on the 2×2 table «this word / every
     other word» × «this document / the others». It answers "is the difference
     in frequency larger than chance would give?". It grows with corpus size,
     so it says how sure we are, not how big the difference is.
   - Log ratio (Hardie, 2014): log2 of the ratio of the two relative
     frequencies. It says how big the difference is: 1 means twice as frequent,
     2 four times. Hardie's post does not say what to do with a zero frequency
     (the ratio would be infinite). Here it is replaced by 0.5, a common
     practice in keyness tools (AntConc users report the same substitution);
     no primary source for it was found, so treat it as this site's convention.
   - p: the upper tail of the chi-square distribution with one degree of
     freedom, the reference distribution of G² for a 2×2 table.
   ============================================================ */

import { normalCdf } from "@lingualab/core";

/**
 * P(Z > y) for a standard normal Z. The implementation (Cody's rational
 * approximations, as R's `pnorm`) lives in the core, `packages/core/src/stats/`,
 * so the station and the statistics tool share one normal tail.
 */
export const normalUpperTail = (y: number): number => normalCdf(y, { upper: true });

/** P(χ²₁ > x): the p value of a G² or a chi-square with one degree of freedom. */
export const chiSquareOneDfUpperTail = (x: number): number =>
  x <= 0 ? 1 : 2 * normalUpperTail(Math.sqrt(x));

/* ---------------------------------------------------------------
   G² and log ratio
   --------------------------------------------------------------- */

/** O·ln(O/E), with 0·ln 0 = 0. */
const term = (observed: number, expected: number): number =>
  observed === 0 ? 0 : observed * Math.log(observed / expected);

/**
 * Dunning's G² for `a` occurrences in a corpus of `n1` words against `b` in
 * `n2`: 2·Σ O·ln(O/E) over the four cells of the 2×2 table.
 */
export const logLikelihood = (a: number, b: number, n1: number, n2: number): number => {
  const total = n1 + n2;
  const word = a + b;
  if (total === 0 || word === 0 || word === total) return 0;
  const expected = (corpus: number, cell: number): number => (corpus * cell) / total;
  const g2 =
    2 *
    (term(a, expected(n1, word)) +
      term(b, expected(n2, word)) +
      term(n1 - a, expected(n1, total - word)) +
      term(n2 - b, expected(n2, total - word)));
  // Rounding can leave −1e-13 where the exact value is 0.
  return Math.max(0, g2);
};

/** Hardie's log ratio: log2 of the ratio of relative frequencies, a zero frequency counted as 0.5. */
export const logRatio = (a: number, b: number, n1: number, n2: number): number =>
  Math.log2((Math.max(a, 0.5) / n1) / (Math.max(b, 0.5) / n2));
