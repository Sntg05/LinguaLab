/* ============================================================
   LinguaLab — estadística: cadenas en tiempo de ejecución

   Solo estas claves viajan al navegador, ya traducidas (ADR 0004). La lista es
   `satisfies readonly MessageKey[]`: una clave mal escrita rompe `npm run check`.
   ============================================================ */

import type { MessageKey } from "../../i18n";

const KEYS = [
  "stats.status.ready",
  "stats.status.read",
  "stats.status.example",
  "stats.status.computed",
  "stats.status.copied",
  "stats.error.empty",
  "stats.error.unclosed-quote",
  "stats.error.bad-header",
  "stats.error.ragged-row",
  "stats.error.file",
  "stats.error.missing-variable",
  "stats.error.not-numeric",
  "stats.error.not-categorical",
  "stats.error.levels-two",
  "stats.error.levels-many",
  "stats.error.same-variable",
  "stats.error.collinear",
  "stats.error.too-few",
  "stats.error.different-lengths",
  "stats.error.no-variation",
  "stats.error.bad-table",
  "stats.error.bad-probabilities",
  "stats.col.variable",
  "stats.col.kind",
  "stats.col.n",
  "stats.col.missing",
  "stats.col.measure",
  "stats.col.value",
  "stats.col.term",
  "stats.col.estimate",
  "stats.col.se",
  "stats.col.t",
  "stats.col.p",
  "stats.col.test",
  "stats.col.result",
  "stats.col.level",
  "stats.col.count",
  "stats.col.percent",
  "stats.kind.numeric",
  "stats.kind.nominal",
  "stats.kind.ordinal",
  "stats.kindLabel",
  "stats.measure.mean",
  "stats.measure.sd",
  "stats.measure.median",
  "stats.measure.q1",
  "stats.measure.q3",
  "stats.measure.min",
  "stats.measure.max",
  "stats.measure.range",
  "stats.measure.iqr",
  "stats.measure.skewness",
  "stats.measure.modes",
  "stats.figure.n",
  "stats.figure.mean",
  "stats.figure.ci",
  "stats.figure.d",
  "stats.figure.g",
  "stats.figure.groups",
  "stats.figure.means",
  "stats.figure.difference-ci",
  "stats.figure.pairs",
  "stats.figure.mean-difference",
  "stats.figure.dz",
  "stats.figure.group-mean",
  "stats.figure.r-squared",
  "stats.figure.adjusted-r-squared",
  "stats.figure.sigma",
  "stats.testName.t",
  "stats.testName.wilcoxon",
  "stats.testName.welch",
  "stats.testName.mann-whitney",
  "stats.testName.paired-t",
  "stats.testName.anova",
  "stats.testName.pearson",
  "stats.testName.spearman",
  "stats.testName.chi-square",
  "stats.testName.regression",
  "stats.significant",
  "stats.notSignificant",
  "stats.warning.small-n",
  "stats.warning.low-expected",
  "stats.chart.histogram",
  "stats.chart.boxplots",
  "stats.chart.scatter",
  "stats.chart.bars",
  "stats.none",
] as const satisfies readonly MessageKey[];

export const STATISTICS_STRING_KEYS: readonly MessageKey[] = KEYS;

export type StatisticsStringKey = (typeof KEYS)[number];

export interface StatisticsStrings {
  readonly text: (key: StatisticsStringKey) => string;
  readonly format: (key: StatisticsStringKey, values: Readonly<Record<string, string | number>>) => string;
  /** Una clave armada en tiempo de ejecución («stats.testName.» + nombre); si no existe, el texto de respaldo. */
  readonly dynamic: (key: string, fallback: string) => string;
}

const fill = (template: string, values: Readonly<Record<string, string | number>>): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });

/** Copia solo cadenas de claves conocidas: un atributo manipulado no llega a la página. */
export const parseStatisticsStrings = (raw: string | undefined): Readonly<Record<string, string>> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw ?? "");
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null) return {};
  const record = parsed as Record<string, unknown>;
  const values: Record<string, string> = {};
  for (const key of KEYS) {
    const value = record[key];
    if (typeof value === "string") values[key] = value;
  }
  return values;
};

export const createStatisticsStrings = (values: Readonly<Record<string, string>>): StatisticsStrings => ({
  text: (key) => values[key] ?? key,
  format: (key, holes) => fill(values[key] ?? key, holes),
  dynamic: (key, fallback) => values[key] ?? fallback,
});
