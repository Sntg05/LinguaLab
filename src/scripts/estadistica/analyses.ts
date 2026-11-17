/* ============================================================
   LinguaLab — estadística: cada pregunta del asistente, resuelta

   Sin DOM y con pruebas. Recibe la tabla y lo que la persona eligió, corre las
   pruebas del núcleo (`@lingualab/core`, contrastadas con R) y devuelve lo que
   la página muestra: las cifras, los supuestos que hay que mirar, la frase en
   formato APA y el gráfico que corresponde. Nunca da un p sin su tamaño del
   efecto, y siempre con el umbral a la vista (α = .05).
   ============================================================ */

import {
  type Dataset,
  type TestError,
  type Variable,
  anovaEffects,
  anovaOneWay,
  chiSquareIndependence,
  cohensD,
  cohensDOneSample,
  cohensDPaired,
  cramersV,
  hedgesG,
  levels,
  linearRegression,
  mannWhitneyTest,
  pearsonTest,
  rankBiserial,
  signedRankTest,
  spearmanTest,
  tTestOneSample,
  tTestPaired,
  tTestTwoSample,
} from "@lingualab/core";
import { apaBounded, apaDf, apaNumber, apaP } from "./apa";

export const ALPHA = 0.05;

export type Question =
  | "one-mean"
  | "two-groups"
  | "paired"
  | "many-groups"
  | "correlation"
  | "association"
  | "regression";

export interface AnalysisRequest {
  readonly question: Question;
  readonly outcome?: string;
  readonly group?: string;
  readonly second?: string;
  readonly predictors?: readonly string[];
  readonly mu?: number;
}

/** Una cifra con su rótulo, que la página traduce por la clave. */
export interface Figure {
  readonly key: string;
  readonly value: string;
}

export type ChartSpec =
  | { readonly kind: "histogram"; readonly values: readonly number[]; readonly reference?: number }
  | { readonly kind: "boxplots"; readonly groups: readonly { readonly label: string; readonly values: readonly number[] }[] }
  | {
      readonly kind: "scatter";
      readonly x: readonly number[];
      readonly y: readonly number[];
      readonly line?: { readonly intercept: number; readonly slope: number };
    }
  | { readonly kind: "bars"; readonly labels: readonly string[]; readonly series: readonly { readonly label: string; readonly counts: readonly number[] }[] };

export interface AnalysisReport {
  readonly question: Question;
  /** Las pruebas, cada una con su línea APA. */
  readonly tests: readonly { readonly name: string; readonly apa: string; readonly significant: boolean }[];
  readonly figures: readonly Figure[];
  /** Avisos que dependen de los datos (frecuencias esperadas bajas, pocos casos). */
  readonly warnings: readonly string[];
  readonly chart: ChartSpec;
  /** Coeficientes de una regresión, si la hay. */
  readonly coefficients?: readonly (readonly string[])[];
}

export type AnalysisError =
  | { readonly code: "missing-variable" }
  | { readonly code: "not-numeric"; readonly name: string }
  | { readonly code: "not-categorical"; readonly name: string }
  | { readonly code: "levels"; readonly name: string; readonly wanted: "two" | "three-or-more" }
  | { readonly code: "same-variable" }
  | { readonly code: "collinear" }
  | { readonly code: "test"; readonly error: TestError };

type Outcome<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: AnalysisError };

const fail = (error: AnalysisError): Outcome<never> => ({ ok: false, error });

const find = (dataset: Dataset, name: string | undefined): Variable | null =>
  dataset.variables.find((variable) => variable.name === name) ?? null;

const numeric = (dataset: Dataset, name: string | undefined): Outcome<Variable> => {
  const variable = find(dataset, name);
  if (variable === null) return fail({ code: "missing-variable" });
  return variable.kind === "numeric" && variable.numbers !== null
    ? { ok: true, value: variable }
    : fail({ code: "not-numeric", name: variable.name });
};

const categorical = (dataset: Dataset, name: string | undefined): Outcome<Variable> => {
  const variable = find(dataset, name);
  if (variable === null) return fail({ code: "missing-variable" });
  return variable.kind === "numeric" ? fail({ code: "not-categorical", name: variable.name }) : { ok: true, value: variable };
};

/** Los valores de `outcome` separados por nivel de `group`, sin filas con faltantes. */
const byGroup = (outcome: Variable, group: Variable): { label: string; values: number[] }[] =>
  levels(group).map((label) => ({
    label,
    values: group.raw
      .map((value, row) => (value === label ? (outcome.numbers?.[row] ?? null) : null))
      .filter((value): value is number => value !== null),
  }));

/** Pares completos de dos variables numéricas (se descartan las filas con un faltante). */
const pairs = (first: Variable, second: Variable): { x: number[]; y: number[] } => {
  const x: number[] = [];
  const y: number[] = [];
  (first.numbers ?? []).forEach((value, row) => {
    const other = second.numbers?.[row] ?? null;
    if (value !== null && other !== null) {
      x.push(value);
      y.push(other);
    }
  });
  return { x, y };
};

const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: TestError }): Outcome<T> =>
  result.ok ? result : fail({ code: "test", error: result.error });

const line = (name: string, apa: string, p: number) => ({ name, apa, significant: p < ALPHA });

/* ---------------------------------------------------------------
   Cada pregunta
   --------------------------------------------------------------- */

const oneMean = (dataset: Dataset, request: AnalysisRequest): Outcome<AnalysisReport> => {
  const outcome = numeric(dataset, request.outcome);
  if (!outcome.ok) return outcome;
  const values = (outcome.value.numbers ?? []).filter((value): value is number => value !== null);
  const mu = request.mu ?? 0;
  const t = unwrap(tTestOneSample(values, mu));
  if (!t.ok) return t;
  const d = unwrap(cohensDOneSample(values, mu));
  if (!d.ok) return d;
  const v = unwrap(signedRankTest(values, values.map(() => mu)));
  if (!v.ok) return v;
  return {
    ok: true,
    value: {
      question: "one-mean",
      tests: [
        line("t", `t(${apaDf(t.value.df ?? 0)}) = ${apaNumber(t.value.statistic)}, ${apaP(t.value.p)}, d = ${apaNumber(d.value)}`, t.value.p),
        line("wilcoxon", `V = ${apaNumber(v.value.statistic, 1)}, ${apaP(v.value.p)}`, v.value.p),
      ],
      figures: [
        { key: "n", value: String(values.length) },
        { key: "mean", value: apaNumber(t.value.estimate[0] ?? 0) },
        { key: "ci", value: `[${apaNumber(t.value.ci?.[0] ?? 0)}, ${apaNumber(t.value.ci?.[1] ?? 0)}]` },
        { key: "d", value: apaNumber(d.value) },
      ],
      warnings: values.length < 15 ? ["small-n"] : [],
      chart: { kind: "histogram", values, reference: mu },
    },
  };
};

const twoGroups = (dataset: Dataset, request: AnalysisRequest): Outcome<AnalysisReport> => {
  const outcome = numeric(dataset, request.outcome);
  if (!outcome.ok) return outcome;
  const group = categorical(dataset, request.group);
  if (!group.ok) return group;
  const groups = byGroup(outcome.value, group.value);
  if (groups.length !== 2) return fail({ code: "levels", name: group.value.name, wanted: "two" });
  const [a, b] = groups as [{ label: string; values: number[] }, { label: string; values: number[] }];
  const t = unwrap(tTestTwoSample(a.values, b.values));
  if (!t.ok) return t;
  const d = unwrap(cohensD(a.values, b.values));
  const g = unwrap(hedgesG(a.values, b.values));
  const u = unwrap(mannWhitneyTest(a.values, b.values));
  const r = unwrap(rankBiserial(a.values, b.values));
  if (!d.ok || !g.ok || !u.ok || !r.ok) return [d, g, u, r].find((item) => !item.ok) as Outcome<never>;
  return {
    ok: true,
    value: {
      question: "two-groups",
      tests: [
        line("welch", `t(${apaDf(t.value.df ?? 0)}) = ${apaNumber(t.value.statistic)}, ${apaP(t.value.p)}, d = ${apaNumber(d.value)}`, t.value.p),
        line("mann-whitney", `W = ${apaNumber(u.value.statistic, 1)}, ${apaP(u.value.p)}, r = ${apaBounded(r.value)}`, u.value.p),
      ],
      figures: [
        { key: "groups", value: `${a.label} (n = ${a.values.length}), ${b.label} (n = ${b.values.length})` },
        { key: "means", value: `${apaNumber(t.value.estimate[0] ?? 0)}, ${apaNumber(t.value.estimate[1] ?? 0)}` },
        { key: "difference-ci", value: `[${apaNumber(t.value.ci?.[0] ?? 0)}, ${apaNumber(t.value.ci?.[1] ?? 0)}]` },
        { key: "d", value: apaNumber(d.value) },
        { key: "g", value: apaNumber(g.value) },
      ],
      warnings: Math.min(a.values.length, b.values.length) < 15 ? ["small-n"] : [],
      chart: { kind: "boxplots", groups },
    },
  };
};

const paired = (dataset: Dataset, request: AnalysisRequest): Outcome<AnalysisReport> => {
  if (request.outcome === request.second) return fail({ code: "same-variable" });
  const first = numeric(dataset, request.outcome);
  if (!first.ok) return first;
  const second = numeric(dataset, request.second);
  if (!second.ok) return second;
  const { x, y } = pairs(first.value, second.value);
  const t = unwrap(tTestPaired(x, y));
  if (!t.ok) return t;
  const d = unwrap(cohensDPaired(x, y));
  const v = unwrap(signedRankTest(x, y));
  if (!d.ok || !v.ok) return [d, v].find((item) => !item.ok) as Outcome<never>;
  return {
    ok: true,
    value: {
      question: "paired",
      tests: [
        line("paired-t", `t(${apaDf(t.value.df ?? 0)}) = ${apaNumber(t.value.statistic)}, ${apaP(t.value.p)}, dz = ${apaNumber(d.value)}`, t.value.p),
        line("wilcoxon", `V = ${apaNumber(v.value.statistic, 1)}, ${apaP(v.value.p)}`, v.value.p),
      ],
      figures: [
        { key: "pairs", value: String(x.length) },
        { key: "mean-difference", value: apaNumber(t.value.estimate[0] ?? 0) },
        { key: "difference-ci", value: `[${apaNumber(t.value.ci?.[0] ?? 0)}, ${apaNumber(t.value.ci?.[1] ?? 0)}]` },
        { key: "dz", value: apaNumber(d.value) },
      ],
      warnings: x.length < 15 ? ["small-n"] : [],
      chart: {
        kind: "boxplots",
        groups: [
          { label: first.value.name, values: x },
          { label: second.value.name, values: y },
        ],
      },
    },
  };
};

const manyGroups = (dataset: Dataset, request: AnalysisRequest): Outcome<AnalysisReport> => {
  const outcome = numeric(dataset, request.outcome);
  if (!outcome.ok) return outcome;
  const group = categorical(dataset, request.group);
  if (!group.ok) return group;
  const groups = byGroup(outcome.value, group.value);
  if (groups.length < 3) return fail({ code: "levels", name: group.value.name, wanted: "three-or-more" });
  const anova = unwrap(anovaOneWay(groups.map((item) => item.values)));
  if (!anova.ok) return anova;
  const effects = anovaEffects(anova.value);
  return {
    ok: true,
    value: {
      question: "many-groups",
      tests: [
        line(
          "anova",
          `F(${anova.value.df}, ${anova.value.df2}) = ${apaNumber(anova.value.statistic)}, ${apaP(anova.value.p)}, η² = ${apaBounded(effects.etaSquared)}, ω² = ${apaBounded(effects.omegaSquared)}`,
          anova.value.p,
        ),
      ],
      figures: groups.map((item, index) => ({
        key: "group-mean",
        value: `${item.label}: ${apaNumber(anova.value.estimate[index] ?? 0)} (n = ${item.values.length})`,
      })),
      warnings: groups.some((item) => item.values.length < 10) ? ["small-n"] : [],
      chart: { kind: "boxplots", groups },
    },
  };
};

const correlation = (dataset: Dataset, request: AnalysisRequest): Outcome<AnalysisReport> => {
  if (request.outcome === request.second) return fail({ code: "same-variable" });
  const first = numeric(dataset, request.outcome);
  if (!first.ok) return first;
  const second = numeric(dataset, request.second);
  if (!second.ok) return second;
  const { x, y } = pairs(first.value, second.value);
  const r = unwrap(pearsonTest(x, y));
  if (!r.ok) return r;
  const rho = unwrap(spearmanTest(x, y));
  const fit = linearRegression(y, [x]);
  if (!rho.ok) return rho;
  const estimate = r.value.estimate[0] ?? 0;
  return {
    ok: true,
    value: {
      question: "correlation",
      tests: [
        line(
          "pearson",
          `r(${r.value.df}) = ${apaBounded(estimate)}, ${apaP(r.value.p)}, 95% CI [${apaBounded(r.value.ci?.[0] ?? 0)}, ${apaBounded(r.value.ci?.[1] ?? 0)}]`,
          r.value.p,
        ),
        line("spearman", `ρ = ${apaBounded(rho.value.estimate[0] ?? 0)}, ${apaP(rho.value.p)}`, rho.value.p),
      ],
      figures: [
        { key: "pairs", value: String(x.length) },
        { key: "r-squared", value: apaBounded(estimate * estimate) },
      ],
      warnings: x.length < 15 ? ["small-n"] : [],
      chart: fit.ok
        ? { kind: "scatter", x, y, line: { intercept: fit.value.coefficients[0] ?? 0, slope: fit.value.coefficients[1] ?? 0 } }
        : { kind: "scatter", x, y },
    },
  };
};

const association = (dataset: Dataset, request: AnalysisRequest): Outcome<AnalysisReport> => {
  if (request.outcome === request.second) return fail({ code: "same-variable" });
  const rows = categorical(dataset, request.outcome);
  if (!rows.ok) return rows;
  const columns = categorical(dataset, request.second);
  if (!columns.ok) return columns;
  const rowLevels = levels(rows.value);
  const columnLevels = levels(columns.value);
  const table = rowLevels.map((rowLevel) =>
    columnLevels.map(
      (columnLevel) =>
        rows.value.raw.filter((value, row) => value === rowLevel && columns.value.raw[row] === columnLevel).length,
    ),
  );
  const chi = unwrap(chiSquareIndependence(table));
  if (!chi.ok) return chi;
  const v = unwrap(cramersV(table));
  if (!v.ok) return v;
  const n = table.flat().reduce((total, count) => total + count, 0);
  const lowExpected = chi.value.expected.flat().some((value) => value < 5);
  return {
    ok: true,
    value: {
      question: "association",
      tests: [
        line(
          "chi-square",
          `χ²(${chi.value.df}, N = ${n}) = ${apaNumber(chi.value.statistic)}, ${apaP(chi.value.p)}, V = ${apaBounded(v.value)}`,
          chi.value.p,
        ),
      ],
      figures: [{ key: "n", value: String(n) }],
      warnings: lowExpected ? ["low-expected"] : [],
      chart: {
        kind: "bars",
        labels: columnLevels,
        series: rowLevels.map((label, index) => ({ label, counts: table[index] ?? [] })),
      },
    },
  };
};

const regression = (dataset: Dataset, request: AnalysisRequest): Outcome<AnalysisReport> => {
  const outcome = numeric(dataset, request.outcome);
  if (!outcome.ok) return outcome;
  const names = (request.predictors ?? []).filter((name) => name !== request.outcome);
  if (names.length === 0) return fail({ code: "missing-variable" });
  const predictors: Variable[] = [];
  for (const name of names) {
    const variable = numeric(dataset, name);
    if (!variable.ok) return variable;
    predictors.push(variable.value);
  }
  // Solo filas completas: la regresión no puede usar una fila con un faltante.
  const complete = (outcome.value.numbers ?? []).flatMap((value, row) =>
    value !== null && predictors.every((variable) => variable.numbers?.[row] !== null) ? [row] : [],
  );
  const y = complete.map((row) => outcome.value.numbers?.[row] ?? 0);
  const x = predictors.map((variable) => complete.map((row) => variable.numbers?.[row] ?? 0));
  const fit = linearRegression(y, x);
  if (!fit.ok) {
    return fail(fit.error.code === "collinear" ? { code: "collinear" } : { code: "test", error: fit.error });
  }
  const model = fit.value;
  return {
    ok: true,
    value: {
      question: "regression",
      tests: [
        line(
          "regression",
          `R² = ${apaBounded(model.rSquared)}, F(${model.dfModel}, ${model.dfResidual}) = ${apaNumber(model.f)}, ${apaP(model.fP)}`,
          model.fP,
        ),
      ],
      figures: [
        { key: "n", value: String(y.length) },
        { key: "adjusted-r-squared", value: apaBounded(model.adjustedRSquared) },
        { key: "sigma", value: apaNumber(model.sigma) },
      ],
      coefficients: ["(Intercept)", ...names].map((name, index) => [
        name,
        apaNumber(model.coefficients[index] ?? 0),
        apaNumber(model.standardErrors[index] ?? 0),
        apaNumber(model.tValues[index] ?? 0),
        apaP(model.pValues[index] ?? 1).replace(/^p /, ""),
      ]),
      warnings: y.length < 10 * names.length ? ["small-n"] : [],
      chart: { kind: "scatter", x: model.fitted, y: model.residuals },
    },
  };
};

const RUNNERS: Readonly<Record<Question, (dataset: Dataset, request: AnalysisRequest) => Outcome<AnalysisReport>>> = {
  "one-mean": oneMean,
  "two-groups": twoGroups,
  paired,
  "many-groups": manyGroups,
  correlation,
  association,
  regression,
};

export const runAnalysis = (dataset: Dataset, request: AnalysisRequest): Outcome<AnalysisReport> =>
  RUNNERS[request.question](dataset, request);
