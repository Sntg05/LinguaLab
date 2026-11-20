/**
 * Distribuciones de probabilidad: normal, t de Student, χ² y F.
 *
 * Cada función de distribución da la cola inferior o, con `{ upper: true }`, la
 * superior, calculada directamente y no como 1 − inferior: un valor p de 1e-20
 * se perdería entero en esa resta. Los cuantiles invierten esas funciones.
 *
 * Se contrastan con R (`pnorm`, `pt`, `pchisq`, `pf` y sus cuantiles) en
 * `distributions.test.ts`, con los valores que escribe
 * `scripts/r/build-stats-reference.R`, a 1e-10 de error relativo.
 *
 * DE DÓNDE SALE CADA ALGORITMO
 *
 * - Normal: las aproximaciones racionales de Cody (1969), las mismas que usa
 *   `pnorm` de R, en el mismo orden de operaciones.
 * - t, χ² y F: la beta incompleta regularizada y la gamma incompleta
 *   regularizada, por serie y fracción continua (Press et al., *Numerical
 *   Recipes*, §6.2 y §6.4), con el logaritmo de la función gamma de Lanczos.
 * - Cuantiles: bisección sobre la cola que corresponde, hasta la precisión de
 *   la máquina. Es más lenta que una fórmula cerrada y por eso mismo no
 *   depende de constantes copiadas: su precisión es la de la función que
 *   invierte.
 */

export interface TailOption {
  /** Cola superior, P(X > x), en vez de la inferior, P(X ≤ x). */
  readonly upper?: boolean;
}

/* ---------------------------------------------------------------
   Normal (Cody, 1969, como `pnorm` de R)
   --------------------------------------------------------------- */

const A = [
  2.2352520354606837, 161.02823106855587, 1067.6894854603709, 18154.98125334356,
  0.06568233791820745,
];
const B = [47.202581904688245, 976.0985517377767, 10260.932208618979, 45507.78933502673];
const C = [
  0.39894151208813466, 8.883149794388377, 93.50665613217785, 597.2702763948002, 2494.5375852903726,
  6848.190450536283, 11602.65143764735, 9842.714838383978, 1.0765576773720192e-8,
];
const D = [
  22.266688044328117, 235.387901782625, 1519.3775994075547, 6485.558298266761, 18615.571640885097,
  34900.95272114598, 38912.00328609327, 19685.429676859992,
];
const P = [
  0.215898534057957, 0.12740116116024736, 0.022235277870649807, 0.0014216191932278934,
  2.9112874951168793e-5, 0.023073441764940174,
];
const Q = [
  1.284260096144911, 0.4682382124808651, 0.06598813786892856, 0.0037823963320275824,
  7.297515550839662e-5,
];

const SQRT_32 = 5.656854249492381;
const ONE_OVER_SQRT_2PI = 0.3989422804014327;

const at = (values: readonly number[], index: number): number => values[index] ?? 0;

/**
 * exp(−y²/2) en dos productos, como `pnorm`: y² redondeado a 1/16 más el resto.
 * Así reproduce a R exactamente en la cola lejana (ver la prueba).
 */
const gaussian = (y: number): number => {
  const rounded = Math.trunc(y * 16) / 16;
  const delta = (y - rounded) * (y + rounded);
  return Math.exp(-rounded * rounded * 0.5) * Math.exp(-delta * 0.5);
};

/** P(Z > y) para y > 0,67448975. */
const farUpperTail = (y: number): number => {
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
  // El mismo orden que R: primero el cociente, después el producto. En la cola
  // lejana el resultado es un número subnormal y el orden cambia el redondeo.
  return gaussian(y) * ((ONE_OVER_SQRT_2PI - ratio) / y);
};

/** P(Z ≤ x), o P(Z > x) con `{ upper: true }`. */
export const normalCdf = (x: number, options: TailOption = {}): number => {
  if (Number.isNaN(x)) return Number.NaN;
  const upperOf = (value: number): number => {
    if (Math.abs(value) <= 0.67448975) {
      const square = value * value;
      let numerator = at(A, 4) * square;
      let denominator = square;
      for (let i = 0; i < 3; i += 1) {
        numerator = (numerator + at(A, i)) * square;
        denominator = (denominator + at(B, i)) * square;
      }
      return 0.5 - (value * (numerator + at(A, 3))) / (denominator + at(B, 3));
    }
    return value > 0 ? farUpperTail(value) : 1 - farUpperTail(-value);
  };
  return options.upper === true ? upperOf(x) : upperOf(-x);
};

/* ---------------------------------------------------------------
   Gamma y beta incompletas
   --------------------------------------------------------------- */

const LANCZOS = [
  0.9999999999998099, 676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
  12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
];
const HALF_LOG_2PI = 0.9189385332046728;

/** ln Γ(x) para x > 0 (Lanczos, g = 7). */
export const logGamma = (x: number): number => {
  if (x < 0.5) {
    // Reflexión: Γ(x)·Γ(1 − x) = π / sen(πx).
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x);
  }
  const shifted = x - 1;
  let sum = at(LANCZOS, 0);
  for (let i = 1; i < LANCZOS.length; i += 1) sum += at(LANCZOS, i) / (shifted + i);
  const t = shifted + 7.5;
  return HALF_LOG_2PI + (shifted + 0.5) * Math.log(t) - t + Math.log(sum);
};

const EPSILON = 1e-16;
const TINY = 1e-300;
const MAX_ITERATIONS = 10_000;

/** Fracción continua de Lentz para la beta incompleta (Numerical Recipes, `betacf`). */
const betaFraction = (a: number, b: number, x: number): number => {
  const sum = a + b;
  let c = 1;
  let d = 1 - (sum * x) / (a + 1);
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  const step = (coefficient: number): number => {
    d = 1 + coefficient * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + coefficient / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    return d * c;
  };
  for (let m = 1; m <= MAX_ITERATIONS; m += 1) {
    const m2 = 2 * m;
    h *= step((m * (b - m) * x) / ((a - 1 + m2) * (a + m2)));
    const delta = step((-(a + m) * (sum + m) * x) / ((a + m2) * (a + 1 + m2)));
    h *= delta;
    if (Math.abs(delta - 1) < EPSILON) break;
  }
  return h;
};

/**
 * I_x(a, b), la beta incompleta regularizada. `y` es 1 − x, que se pide aparte
 * porque quien llama suele poder escribirlo sin restar (t²/(ν + t²) en la t).
 */
const betaRegularized = (x: number, y: number, a: number, b: number, upper: boolean): number => {
  if (x <= 0) return upper ? 1 : 0;
  if (y <= 0) return upper ? 0 : 1;
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(y),
  );
  if (x < (a + 1) / (a + b + 2)) {
    const lower = (front * betaFraction(a, b, x)) / a;
    return upper ? 1 - lower : lower;
  }
  const upperTail = (front * betaFraction(b, a, y)) / b;
  return upper ? upperTail : 1 - upperTail;
};

/** Serie de P(a, x), sin el factor e^(−x)·x^a/Γ(a). Converge rápido para x < a + 1. */
const gammaSeries = (a: number, x: number): number => {
  let term = 1 / a;
  let sum = term;
  for (let n = 1; n <= MAX_ITERATIONS; n += 1) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * EPSILON) break;
  }
  return sum;
};

/** Fracción continua de Q(a, x) (Lentz), sin el mismo factor. Para x ≥ a + 1. */
const gammaFraction = (a: number, x: number): number => {
  let b = x + 1 - a;
  let c = 1 / TINY;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= MAX_ITERATIONS; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPSILON) break;
  }
  return h;
};

/** P(a, x), la gamma incompleta regularizada inferior, o Q(a, x) con `upper`. */
const gammaRegularized = (a: number, x: number, upper: boolean): number => {
  if (x <= 0) return upper ? 1 : 0;
  const front = Math.exp(-x + a * Math.log(x) - logGamma(a));
  if (x < a + 1) {
    const lower = front * gammaSeries(a, x);
    return upper ? 1 - lower : lower;
  }
  const upperTail = front * gammaFraction(a, x);
  return upper ? upperTail : 1 - upperTail;
};

/* ---------------------------------------------------------------
   t, χ² y F
   --------------------------------------------------------------- */

const invalid = (...values: readonly number[]): boolean =>
  values.some((value) => Number.isNaN(value));

/** P(T ≤ t) con ν grados de libertad. */
export const studentTCdf = (t: number, df: number, options: TailOption = {}): number => {
  if (invalid(t, df) || df <= 0) return Number.NaN;
  if (t === 0) return 0.5;
  const square = t * t;
  // P(|T| > |t|) = I_x(ν/2, 1/2) con x = ν/(ν + t²).
  const twoSided = betaRegularized(df / (df + square), square / (df + square), df / 2, 0.5, false);
  // P(T > |t|): la cola que queda del lado de t.
  const beyond = twoSided / 2;
  const sameSide = options.upper === true ? t > 0 : t < 0;
  return sameSide ? beyond : 1 - beyond;
};

/** P(X ≤ x) para X ~ χ² con `df` grados de libertad. */
export const chiSquareCdf = (x: number, df: number, options: TailOption = {}): number => {
  if (invalid(x, df) || df <= 0) return Number.NaN;
  return gammaRegularized(df / 2, Math.max(0, x) / 2, options.upper === true);
};

/** P(X ≤ f) para X ~ F(d1, d2). */
export const fCdf = (f: number, d1: number, d2: number, options: TailOption = {}): number => {
  if (invalid(f, d1, d2) || d1 <= 0 || d2 <= 0) return Number.NaN;
  if (f <= 0) return options.upper === true ? 1 : 0;
  const scaled = d1 * f;
  return betaRegularized(
    scaled / (scaled + d2),
    d2 / (scaled + d2),
    d1 / 2,
    d2 / 2,
    options.upper === true,
  );
};

/* ---------------------------------------------------------------
   Distribuciones no centrales

   Las necesitan los intervalos de confianza de los tamaños del efecto (d, η²,
   V): bajo la hipótesis alternativa, el estadístico ya no sigue la t, la F o la
   χ² centrales, sino su versión desplazada por un parámetro de no centralidad.
   Se contrastan con `pt`, `pf` y `pchisq` de R (`intervals.test.ts`).
   --------------------------------------------------------------- */

/**
 * Suma una mezcla de Poisson Σ w_j · term(j), con w_j = e^(−μ)μ^j/j!, empezando
 * en la moda y avanzando hacia los dos lados hasta que los pesos no aportan. Es
 * la forma estable de sumar cuando μ es grande y los primeros pesos son ~0.
 */
const poissonMixture = (mu: number, term: (j: number) => number): number => {
  if (mu === 0) return term(0);
  const mode = Math.floor(mu);
  const logWeight = (j: number): number => -mu + j * Math.log(mu) - logGamma(j + 1);
  let total = 0;
  for (let j = mode; j <= mode + MAX_ITERATIONS; j += 1) {
    const weight = Math.exp(logWeight(j));
    total += weight * term(j);
    if (weight < 1e-17 && j > mu) break;
  }
  for (let j = mode - 1; j >= 0; j -= 1) {
    const weight = Math.exp(logWeight(j));
    total += weight * term(j);
    if (weight < 1e-17) break;
  }
  return total;
};

/** P(X ≤ x) para X ~ χ² no central con `df` grados de libertad y no centralidad λ. */
export const noncentralChiSquareCdf = (x: number, df: number, ncp: number): number => {
  if (invalid(x, df, ncp) || df <= 0 || ncp < 0) return Number.NaN;
  if (x <= 0) return 0;
  return Math.min(
    1,
    poissonMixture(ncp / 2, (j) => gammaRegularized(df / 2 + j, x / 2, false)),
  );
};

/** P(X ≤ f) para X ~ F no central (d1, d2, λ). */
export const noncentralFCdf = (f: number, d1: number, d2: number, ncp: number): number => {
  if (invalid(f, d1, d2, ncp) || d1 <= 0 || d2 <= 0 || ncp < 0) return Number.NaN;
  if (f <= 0) return 0;
  const scaled = d1 * f;
  const x = scaled / (scaled + d2);
  const y = d2 / (scaled + d2);
  return Math.min(
    1,
    poissonMixture(ncp / 2, (j) => betaRegularized(x, y, d1 / 2 + j, d2 / 2, false)),
  );
};

/**
 * P(T ≤ t) para T ~ t no central (ν, δ), por la serie de Lenth (1989, AS 243):
 * Φ(−δ) más una mezcla de betas incompletas con pesos de Poisson en δ²/2. Para
 * t < 0 se usa la simetría P(T ≤ t; ν, δ) = 1 − P(T ≤ −t; ν, −δ).
 */
export const noncentralTCdf = (t: number, df: number, ncp: number): number => {
  if (invalid(t, df, ncp) || df <= 0) return Number.NaN;
  if (ncp === 0) return studentTCdf(t, df);
  if (t < 0) return 1 - noncentralTCdf(-t, df, -ncp);
  const x = (t * t) / (t * t + df);
  const y = df / (t * t + df);
  const half = (ncp * ncp) / 2;
  // Términos pares (j + 1/2) con pesos de Poisson; impares (j + 1) con pesos
  // δ/√2 · e^(−δ²/2)(δ²/2)^j / Γ(j + 3/2).
  const even = poissonMixture(half, (j) => betaRegularized(x, y, j + 0.5, df / 2, false));
  const oddFactor = ncp / Math.SQRT2;
  const odd = (() => {
    const mode = Math.floor(half);
    const logWeight = (j: number): number =>
      -half + j * Math.log(Math.max(half, Number.MIN_VALUE)) - logGamma(j + 1.5);
    let total = 0;
    for (let j = mode; j <= mode + MAX_ITERATIONS; j += 1) {
      const weight = Math.exp(logWeight(j));
      total += weight * betaRegularized(x, y, j + 1, df / 2, false);
      if (weight < 1e-17 && j > half) break;
    }
    for (let j = mode - 1; j >= 0; j -= 1) {
      const weight = Math.exp(logWeight(j));
      total += weight * betaRegularized(x, y, j + 1, df / 2, false);
      if (weight < 1e-17) break;
    }
    return oddFactor * total;
  })();
  const p = normalCdf(-ncp) + 0.5 * (even + odd);
  return Math.min(1, Math.max(0, p));
};

/* ---------------------------------------------------------------
   Cuantiles
   --------------------------------------------------------------- */

/**
 * El x > 0 en que una cola decreciente vale `target`: se acota duplicando y se
 * biseca en escala logarítmica, porque los cuantiles van de 1e-20 a 1e11.
 */
const solvePositive = (tail: (x: number) => number, target: number): number => {
  let low = 1;
  let high = 1;
  while (tail(low) < target && low > 1e-300) low /= 2;
  while (tail(high) > target && high < 1e300) high *= 2;
  for (let i = 0; i < 2000 && high / low - 1 > 4e-16; i += 1) {
    const middle = Math.sqrt(low * high);
    if (tail(middle) > target) low = middle;
    else high = middle;
  }
  return Math.sqrt(low * high);
};

const checkProbability = (p: number): number | null => {
  if (Number.isNaN(p) || p < 0 || p > 1) return Number.NaN;
  return null;
};

/** El z con P(Z ≤ z) = p. */
export const normalQuantile = (p: number): number => {
  const bad = checkProbability(p);
  if (bad !== null) return bad;
  if (p === 0) return Number.NEGATIVE_INFINITY;
  if (p === 1) return Number.POSITIVE_INFINITY;
  if (p === 0.5) return 0;
  // Por debajo de 0,5 el cuantil es negativo: se busca el z > 0 de la cola superior.
  return p < 0.5
    ? -solvePositive((z) => normalCdf(z, { upper: true }), p)
    : solvePositive((z) => normalCdf(z, { upper: true }), 1 - p);
};

/** El t con P(T ≤ t) = p. */
export const studentTQuantile = (p: number, df: number): number => {
  const bad = checkProbability(p);
  if (bad !== null || Number.isNaN(df) || df <= 0) return Number.NaN;
  if (p === 0) return Number.NEGATIVE_INFINITY;
  if (p === 1) return Number.POSITIVE_INFINITY;
  if (p === 0.5) return 0;
  const upper = (t: number): number => studentTCdf(t, df, { upper: true });
  return p < 0.5 ? -solvePositive(upper, p) : solvePositive(upper, 1 - p);
};

/** Invierte una distribución de soporte positivo usando la cola más precisa. */
const positiveQuantile = (p: number, cdf: (x: number, options: TailOption) => number): number => {
  if (p === 0) return 0;
  if (p === 1) return Number.POSITIVE_INFINITY;
  if (p < 0.5) {
    // Cola inferior creciente: se busca donde la superior vale 1 − p sería
    // perder dígitos; se invierte la inferior con el signo cambiado.
    return solvePositive((x) => -cdf(x, {}), -p);
  }
  return solvePositive((x) => cdf(x, { upper: true }), 1 - p);
};

export const chiSquareQuantile = (p: number, df: number): number => {
  const bad = checkProbability(p);
  if (bad !== null || Number.isNaN(df) || df <= 0) return Number.NaN;
  return positiveQuantile(p, (x, options) => chiSquareCdf(x, df, options));
};

export const fQuantile = (p: number, d1: number, d2: number): number => {
  const bad = checkProbability(p);
  if (bad !== null || Number.isNaN(d1) || Number.isNaN(d2) || d1 <= 0 || d2 <= 0) return Number.NaN;
  return positiveQuantile(p, (x, options) => fCdf(x, d1, d2, options));
};
