/* ============================================================
   LinguaLab — estadística: frases y tablas de la página, sin DOM
   ============================================================ */

import { type DatasetError, type Variable, describeSample, levels, presentNumbers } from "@lingualab/core";
import type { AnalysisError } from "./analyses";
import { apaNumber } from "./apa";
import type { StatisticsStrings } from "./strings";

export const describeDatasetError = (error: DatasetError, strings: StatisticsStrings): string => {
  switch (error.code) {
    case "empty":
      return strings.text("stats.error.empty");
    case "unclosed-quote":
      return strings.format("stats.error.unclosed-quote", { line: error.line });
    case "bad-header":
      return strings.format("stats.error.bad-header", { column: error.column });
    case "ragged-row":
      return strings.format("stats.error.ragged-row", { row: error.row, expected: error.expected, found: error.found });
  }
};

export const describeAnalysisError = (error: AnalysisError, strings: StatisticsStrings): string => {
  switch (error.code) {
    case "missing-variable":
      return strings.text("stats.error.missing-variable");
    case "not-numeric":
      return strings.format("stats.error.not-numeric", { name: error.name });
    case "not-categorical":
      return strings.format("stats.error.not-categorical", { name: error.name });
    case "levels":
      return strings.format(error.wanted === "two" ? "stats.error.levels-two" : "stats.error.levels-many", { name: error.name });
    case "same-variable":
      return strings.text("stats.error.same-variable");
    case "collinear":
      return strings.text("stats.error.collinear");
    case "test": {
      const inner = error.error;
      if (inner.code === "too-few") return strings.format("stats.error.too-few", { minimum: inner.minimum });
      return strings.text(`stats.error.${inner.code}`);
    }
  }
};

/**
 * Las filas de la descripción de una variable: medidas si es numérica,
 * frecuencias si es categórica. Los números con dos decimales.
 */
export const summaryRows = (variable: Variable, strings: StatisticsStrings): readonly (readonly string[])[] => {
  const n = variable.raw.length - variable.missing;
  if (variable.kind === "numeric") {
    const summary = describeSample(presentNumbers(variable));
    if (!summary.ok) return [[strings.text("stats.col.n"), "0"]];
    const s = summary.value;
    const value = (number: number | null): string => (number === null ? strings.text("stats.none") : apaNumber(number));
    return [
      [strings.text("stats.col.n"), String(s.n)],
      [strings.text("stats.col.missing"), String(variable.missing)],
      [strings.text("stats.measure.mean"), value(s.mean)],
      [strings.text("stats.measure.sd"), value(s.sd)],
      [strings.text("stats.measure.median"), value(s.median)],
      [strings.text("stats.measure.q1"), value(s.q1)],
      [strings.text("stats.measure.q3"), value(s.q3)],
      [strings.text("stats.measure.min"), value(s.min)],
      [strings.text("stats.measure.max"), value(s.max)],
      [strings.text("stats.measure.iqr"), value(s.iqr)],
      [strings.text("stats.measure.skewness"), value(s.skewness)],
      [
        strings.text("stats.measure.modes"),
        s.modes.length === 0 ? strings.text("stats.none") : s.modes.map((mode) => apaNumber(mode)).join(", "),
      ],
    ];
  }
  return levels(variable).map((level) => {
    const count = variable.raw.filter((value) => value === level).length;
    return [level, String(count), apaNumber(n === 0 ? 0 : (count / n) * 100, 1)];
  });
};
