/**
 * Acuerdo entre codificadores.
 *
 * Tres medidas, cada una con su alcance:
 *
 * - **Acuerdo porcentual**: de los segmentos que codificaron TODAS las
 *   personas, en qué proporción coinciden todas. Es intuitivo pero no descuenta
 *   el acuerdo que se daría por azar.
 * - **Kappa de Cohen** (Cohen, 1960): solo para dos personas; descuenta el azar
 *   a partir de cuánto usó cada una cada categoría. Usa los segmentos que
 *   codificaron las dos.
 * - **Alfa de Krippendorff**, nominal (Hayes y Krippendorff, 2007): dos o más
 *   personas y datos faltantes; usa todo valor que tenga con quién compararse.
 *
 * Las tres se contrastan con el paquete `irr` de R en `agreement.test.ts`, con
 * las mismas matrices (`irr-reference.ts`, generado por
 * `scripts/r/build-agreement-reference.R`).
 *
 * UNA DIFERENCIA DECLARADA CON R
 *
 * Si todas las personas usan siempre la misma categoría, la alfa es 0/0:
 * Krippendorff la da por indefinida, porque no hay variación con la que medir
 * la fiabilidad. `irr::kripp.alpha` devuelve 1 en ese caso; aquí es `null`, y
 * la interfaz explica por qué.
 *
 * Las matrices son personas × unidades; `null` es una unidad que esa persona no
 * codificó.
 */
import { err, ok, type Result } from "../result";
import { codeKey } from "./codebook";
import { toCsv } from "./csv";
import type { CodingSheet, Mark } from "./coding";

export type Rating = number | null;
export type RatingMatrix = readonly (readonly Rating[])[];

const unitCount = (ratings: RatingMatrix): number =>
  ratings.reduce((most, row) => Math.max(most, row.length), 0);

const unitValues = (ratings: RatingMatrix, unit: number): number[] =>
  ratings.map((row) => row[unit] ?? null).filter((value): value is number => value !== null);

/** Unidades que codificaron todas las personas. */
const completeUnits = (ratings: RatingMatrix): number[][] => {
  const units: number[][] = [];
  for (let unit = 0; unit < unitCount(ratings); unit += 1) {
    const values = unitValues(ratings, unit);
    if (values.length === ratings.length) units.push(values);
  }
  return units;
};

/** Proporción (0–1) de unidades completas en las que todas coinciden. */
export const percentAgreement = (ratings: RatingMatrix): number | null => {
  const units = completeUnits(ratings);
  if (units.length === 0 || ratings.length < 2) return null;
  const agreeing = units.filter((values) => values.every((value) => value === values[0]));
  return agreeing.length / units.length;
};

/** Kappa de Cohen sin pesos. Solo dos personas; `null` si no se puede calcular. */
export const cohenKappa = (ratings: RatingMatrix): number | null => {
  if (ratings.length !== 2) return null;
  const units = completeUnits(ratings);
  if (units.length === 0) return null;

  const total = units.length;
  const first = new Map<number, number>();
  const second = new Map<number, number>();
  let observed = 0;
  for (const [a, b] of units) {
    if (a === undefined || b === undefined) continue;
    if (a === b) observed += 1;
    first.set(a, (first.get(a) ?? 0) + 1);
    second.set(b, (second.get(b) ?? 0) + 1);
  }
  let expected = 0;
  for (const [category, count] of first) {
    expected += (count / total) * ((second.get(category) ?? 0) / total);
  }
  if (1 - expected === 0) return null;
  return (observed / total - expected) / (1 - expected);
};

/**
 * Alfa de Krippendorff para datos nominales, por la matriz de coincidencias
 * (Krippendorff, 2011): α = 1 − (n − 1) · Σ o_ck / Σ n_c·n_k, con c ≠ k.
 */
export const krippendorffAlphaNominal = (ratings: RatingMatrix): number | null => {
  const pairs = coincidencePairs(ratings);
  const marginals = new Map<number, number>();
  let disagreement = 0;
  for (const { c, k, weight } of pairs) {
    marginals.set(c, (marginals.get(c) ?? 0) + weight);
    if (c !== k) disagreement += weight;
  }
  const totals = [...marginals.values()];
  const n = totals.reduce((sum, value) => sum + value, 0);
  // Σ n_c·n_k con c ≠ k es (Σ n_c)² − Σ n_c².
  const chance = n * n - totals.reduce((sum, value) => sum + value * value, 0);
  if (n < 2 || chance <= 0) return null;
  return 1 - ((n - 1) * disagreement) / chance;
};

interface Coincidence {
  readonly c: number;
  readonly k: number;
  readonly weight: number;
}

/**
 * Cada par ordenado de valores de una misma unidad, con peso 1/(m_u − 1): la
 * matriz de coincidencias sin acumular. Una unidad con un solo valor no aporta.
 */
const coincidencePairs = (ratings: RatingMatrix): Coincidence[] => {
  const pairs: Coincidence[] = [];
  for (let unit = 0; unit < unitCount(ratings); unit += 1) {
    const values = unitValues(ratings, unit);
    const weight = 1 / (values.length - 1);
    values.forEach((c, i) => {
      values.forEach((k, j) => {
        if (i !== j) pairs.push({ c, k, weight });
      });
    });
  }
  return pairs;
};

/** Lectura de la alfa según Krippendorff (2004): ≥ .800 fiable; ≥ .667 provisional. */
export type AlphaVerdict = "reliable" | "tentative" | "unreliable";

export const alphaVerdict = (alpha: number): AlphaVerdict =>
  alpha >= 0.8 ? "reliable" : alpha >= 0.667 ? "tentative" : "unreliable";

/** Bandas de Landis y Koch (1977) para la kappa. Son convenciones, no umbrales de la teoría. */
export type KappaBand = "poor" | "slight" | "fair" | "moderate" | "substantial" | "almost-perfect";

export const kappaBand = (kappa: number): KappaBand =>
  kappa < 0
    ? "poor"
    : kappa <= 0.2
      ? "slight"
      : kappa <= 0.4
        ? "fair"
        : kappa <= 0.6
          ? "moderate"
          : kappa <= 0.8
            ? "substantial"
            : "almost-perfect";

export interface CodeAgreement {
  readonly code: string;
  /** Segmentos que codificaron todas las personas. */
  readonly complete: number;
  /** Segmentos con al menos dos valores: los que usa la alfa. */
  readonly pairable: number;
  readonly percent: number | null;
  /** Solo con dos hojas. */
  readonly kappa: number | null;
  readonly alpha: number | null;
}

export interface AgreementReport {
  readonly coders: number;
  readonly segments: number;
  readonly codes: readonly CodeAgreement[];
}

export type AgreementError =
  | { readonly code: "too-few-sheets" }
  | { readonly code: "text-mismatch"; readonly segment: string; readonly sheet: number };

const sameText = (left: string, right: string): boolean =>
  left.replace(/\s+/g, " ").trim() === right.replace(/\s+/g, " ").trim();

const asRating = (mark: Mark | undefined): Rating =>
  mark === undefined || mark === null ? null : mark ? 1 : 0;

/** Los identificadores de segmento de todas las hojas, si el texto coincide. */
const alignSegments = (sheets: readonly CodingSheet[]): Result<string[], AgreementError> => {
  const texts = new Map<string, string>();
  for (const [sheetIndex, sheet] of sheets.entries()) {
    for (const segment of sheet.segments) {
      const known = texts.get(segment.id);
      if (known !== undefined && !sameText(known, segment.text)) {
        return err({ code: "text-mismatch", segment: segment.id, sheet: sheetIndex + 1 });
      }
      texts.set(segment.id, known ?? segment.text);
    }
  }
  return ok([...texts.keys()]);
};

/** Los códigos de todas las hojas, sin repetir y en orden de aparición. */
const unionCodes = (sheets: readonly CodingSheet[]): string[] => {
  const codes: string[] = [];
  for (const code of sheets.flatMap((sheet) => sheet.codes)) {
    if (!codes.some((known) => codeKey(known) === codeKey(code))) codes.push(code);
  }
  return codes;
};

/** Personas × segmentos para un código. */
const ratingsFor = (
  code: string,
  sheets: readonly CodingSheet[],
  segmentIds: readonly string[],
): RatingMatrix =>
  sheets.map((sheet) => {
    const at = sheet.codes.findIndex((candidate) => codeKey(candidate) === codeKey(code));
    const byId = new Map(sheet.segments.map((segment) => [segment.id, segment]));
    return segmentIds.map((id) => (at < 0 ? null : asRating(byId.get(id)?.marks[at])));
  });

/**
 * Compara dos o más hojas del mismo material. Los segmentos se emparejan por su
 * identificador y deben tener el mismo texto: si no, las personas no codificaron
 * lo mismo y el número no significaría nada. Un código que una hoja no tiene, o
 * un segmento que le falta, cuenta como no codificado por esa persona.
 */
export const agreementReport = (
  sheets: readonly CodingSheet[],
): Result<AgreementReport, AgreementError> => {
  if (sheets.length < 2) return err({ code: "too-few-sheets" });
  const aligned = alignSegments(sheets);
  if (!aligned.ok) return aligned;
  const segmentIds = aligned.value;
  const codes = unionCodes(sheets);

  const report = codes.map((code): CodeAgreement => {
    const ratings = ratingsFor(code, sheets, segmentIds);
    const pairable = segmentIds.filter((_, unit) => unitValues(ratings, unit).length >= 2).length;
    return {
      code,
      complete: completeUnits(ratings).length,
      pairable,
      percent: percentAgreement(ratings),
      kappa: cohenKappa(ratings),
      alpha: krippendorffAlphaNominal(ratings),
    };
  });

  return ok({ coders: sheets.length, segments: segmentIds.length, codes: report });
};

const decimal = (value: number | null): string => (value === null ? "" : value.toFixed(4));

/** El informe para una hoja de cálculo. Una celda vacía es «no se puede calcular». */
export const agreementToCsv = (report: AgreementReport): string =>
  toCsv([
    [
      "code",
      "complete_segments",
      "pairable_segments",
      "percent_agreement",
      "cohen_kappa",
      "krippendorff_alpha",
    ],
    ...report.codes.map((row) => [
      row.code,
      String(row.complete),
      String(row.pairable),
      decimal(row.percent),
      decimal(row.kappa),
      decimal(row.alpha),
    ]),
  ]);
