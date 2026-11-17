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
     (the ratio would be infinite); it is replaced by 0.5, the same adjustment
     quanteda's `textstat_keyness` applies.
   - p: the upper tail of the chi-square distribution with one degree of
     freedom, the reference distribution of G² for a 2×2 table.
   ============================================================ */

/* ---------------------------------------------------------------
   Normal upper tail (W. J. Cody, 1969), as in R's `pnorm`.
   p for χ²(1) is 2·Φ(−√G²), so the precision of p is the precision of Φ.
   A series or a crude approximation loses the tiny p values (1e-80) that
   frequent keywords produce; Cody's rational approximations keep full
   double precision across the whole range.
   --------------------------------------------------------------- */

const A = [
  2.2352520354606837, 161.02823106855587, 1067.6894854603709, 18154.98125334356,
  0.06568233791820745,
];
const B = [47.202581904688245, 976.0985517377767, 10260.932208618979, 45507.78933502673];
const C = [
  0.39894151208813466, 8.883149794388377, 93.50665613217785, 597.2702763948002,
  2494.5375852903726, 6848.190450536283, 11602.65143764735, 9842.714838383978,
  1.0765576773720192e-8,
];
const D = [
  22.266688044328117, 235.387901782625, 1519.3775994075547, 6485.558298266761,
  18615.571640885097, 34900.95272114598, 38912.00328609327, 19685.429676859992,
];
const P = [
  0.215898534057957, 0.12740116116024736, 0.022235277870649807, 0.0014216191932278934,
  0.000029112874951168793, 0.023073441764940174,
];
const Q = [1.284260096144911, 0.4682382124808651, 0.06598813786892856, 0.0037823963320275824,
  0.00007297515550839662];

const SQRT_32 = 5.656854249492381;
const ONE_OVER_SQRT_2PI = 0.3989422804014327;

const at = (values: readonly number[], index: number): number => values[index] ?? 0;

/**
 * exp(−y²/2). R splits it in two products to save the last bits for large y;
 * against R's own values that refinement changes nothing measurable here (the
 * reference cases pass to 1e-10 either way), so the plain form stays.
 */
const gaussian = (y: number): number => Math.exp(-y * y * 0.5);

/** P(Z > y) for a standard normal Z and y ≥ 0. */
export const normalUpperTail = (y: number): number => {
  if (y <= 0.67448975) {
    const square = y * y;
    let numerator = at(A, 4) * square;
    let denominator = square;
    for (let i = 0; i < 3; i += 1) {
      numerator = (numerator + at(A, i)) * square;
      denominator = (denominator + at(B, i)) * square;
    }
    return 0.5 - (y * (numerator + at(A, 3))) / (denominator + at(B, 3));
  }
  if (y <= SQRT_32) {
    let numerator = at(C, 8) * y;
    let denominator = y;
    for (let i = 0; i < 7; i += 1) {
      numerator = (numerator + at(C, i)) * y;
      denominator = (denominator + at(D, i)) * y;
    }
    return gaussian(y) * ((numerator + at(C, 7)) / (denominator + at(D, 7)));
  }
  const inverse = 1 / (y * y);
  let numerator = at(P, 5) * inverse;
  let denominator = inverse;
  for (let i = 0; i < 4; i += 1) {
    numerator = (numerator + at(P, i)) * inverse;
    denominator = (denominator + at(Q, i)) * inverse;
  }
  const ratio = (inverse * (numerator + at(P, 4))) / (denominator + at(Q, 4));
  return (gaussian(y) * (ONE_OVER_SQRT_2PI - ratio)) / y;
};

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
