import { describe, expect, it } from "vitest";
import {
  chiSquareCdf,
  fCdf,
  noncentralChiSquareCdf,
  noncentralFCdf,
  noncentralTCdf,
  studentTCdf,
} from "./distributions";
import {
  cohensDInterval,
  cohensDOneSampleInterval,
  cohensDPairedInterval,
  cramersVInterval,
  etaSquaredInterval,
} from "./intervals";
import { INTERVAL_REFERENCE, NONCENTRAL_CDF_REFERENCE } from "./noncentral-reference";

/**
 * Intervalos de confianza de d, η² y V por el método del parámetro de no
 * centralidad (Steiger 2004), contrastados con R (`scripts/r/build-noncentral-reference.R`).
 *
 * Dos tolerancias, y por qué: contra el intervalo «exacto» (la raíz buscada con
 * `uniroot` sobre `pt`, `pf` y `pchisq` de R) se exige 1e-7; contra lo que
 * imprime `effectsize`, 1e-6, porque ese paquete busca la raíz con Nelder–Mead
 * y se detiene antes.
 */
const close = (actual: number, expected: number, tolerance: number): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    tolerance * Math.max(1, Math.abs(expected)),
  );
};

describe("las distribuciones no centrales coinciden con pt, pchisq y pf de R", () => {
  it.each(NONCENTRAL_CDF_REFERENCE)("$dist($x; $df, ncp $ncp)", (row) => {
    const p =
      row.dist === "t"
        ? noncentralTCdf(row.x, row.df, row.ncp)
        : row.dist === "chisq"
          ? noncentralChiSquareCdf(row.x, row.df, row.ncp)
          : noncentralFCdf(row.x, row.df, row.df2 ?? Number.NaN, row.ncp);
    close(p, row.p, 1e-9);
  });

  it("con no centralidad cero, son las distribuciones centrales (ya contrastadas con R)", () => {
    close(noncentralTCdf(1.5, 7, 0), studentTCdf(1.5, 7), 1e-12);
    close(noncentralChiSquareCdf(3.84, 1, 0), chiSquareCdf(3.84, 1), 1e-12);
    close(noncentralFCdf(2.5, 3, 20, 0), fCdf(2.5, 3, 20), 1e-12);
  });
});

const auto = [
  21.4, 18.7, 18.1, 14.3, 24.4, 22.8, 19.2, 17.8, 16.4, 17.3, 15.2, 10.4, 10.4, 14.7, 21.5, 15.5,
  15.2, 13.3, 19.2,
];
const manual = [21, 21, 22.8, 32.4, 30.4, 33.9, 27.3, 26, 30.4, 15.8, 19.7, 15, 21.4];
const sleep1 = [0.7, -1.6, -0.2, -1.2, -0.1, 3.4, 3.7, 0.8, 0, 2];
const sleep2 = [1.9, 0.8, 1.1, 0.1, -0.1, 4.4, 5.5, 1.6, 4.6, 3.4];
const mpg = [...auto, ...manual];
const cylAm = [
  [3, 8],
  [4, 3],
  [12, 2],
];
const table3 = [
  [30, 8, 5],
  [10, 25, 7],
  [12, 9, 28],
];

const reference = (name: string) => {
  const row = INTERVAL_REFERENCE.find((entry) => entry.name === name);
  if (row === undefined) throw new Error(`falta ${name}`);
  return row;
};

const check = (name: string, interval: { ok: boolean; value?: { low: number; high: number } }) => {
  expect(interval.ok).toBe(true);
  const value = interval.value as { low: number; high: number };
  const row = reference(name);
  close(value.low, row.low, 1e-7);
  close(value.high, row.high, 1e-7);
  close(value.low, row.effectsizeLow, 1e-6);
  close(value.high, row.effectsizeHigh, 1e-6);
};

describe("los intervalos al 95 % coinciden con R", () => {
  it("d de Cohen con desviación combinada (bilateral)", () => {
    check("cohens_d_pooled", cohensDInterval(auto, manual));
  });
  it("d_z de datos pareados (bilateral)", () => {
    check("cohens_d_paired", cohensDPairedInterval(sleep1, sleep2));
  });
  it("d de una muestra (bilateral)", () => {
    check("cohens_d_one_sample", cohensDOneSampleInterval(mpg, 20));
  });
  it("η² del ANOVA de un factor (unilateral, como effectsize: el techo es 1)", () => {
    const anova = { f: 119.26450218450466, df1: 2, df2: 147 };
    check("eta_squared", etaSquaredInterval(anova.f, anova.df1, anova.df2));
  });
  it("V de Cramér sin corregir y corregida (unilateral)", () => {
    check("cramers_v_raw", cramersVInterval(cylAm, false));
    check("cramers_v_adjusted", cramersVInterval(cylAm, true));
    check("cramers_v_adjusted_3x3", cramersVInterval(table3, true));
  });
});
