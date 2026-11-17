/* ============================================================
   LinguaLab — estadística: cableado de la página

   Conecta los ganchos `data-stats-*` con el núcleo (`parseDataset`), las
   preguntas de `analyses.ts`, las frases de `rules.ts` y el dibujo de
   `render.ts`. Aquí no se calcula ni se redacta nada.
   ============================================================ */

import { type Dataset, type VariableKind, parseDataset, withKind } from "@lingualab/core";
import { safeInit } from "../core/safe";
import { type AnalysisRequest, type ChartSpec, type Question, runAnalysis } from "./analyses";
import { sceneFor } from "./charts";
import { EXAMPLE_CSV } from "./example";
import { reportNodes, sceneToSvg, table, variablesTable } from "./render";
import { describeAnalysisError, describeDatasetError, summaryRows } from "./rules";
import { createStatisticsStrings, parseStatisticsStrings, type StatisticsStrings } from "./strings";

type StatusState = "idle" | "ok" | "error";

/** Qué campos pide cada pregunta. */
const FIELDS: Readonly<Record<Question, readonly string[]>> = {
  "one-mean": ["outcome", "mu"],
  "two-groups": ["outcome", "group"],
  paired: ["outcome", "second"],
  "many-groups": ["outcome", "group"],
  correlation: ["outcome", "second"],
  association: ["categoryA", "categoryB"],
  regression: ["outcome", "predictors"],
};

const chartTitle = (spec: ChartSpec, strings: StatisticsStrings): string => strings.text(`stats.chart.${spec.kind}`);

export const initStatisticsLab = (): void => {
  const root = document.querySelector<HTMLElement>("[data-stats]");
  if (root === null) return;
  const strings = createStatisticsStrings(parseStatisticsStrings(root.dataset["statsStrings"]));
  const $ = <T extends Element>(name: string): T => {
    const element = root.querySelector<T>(`[data-stats-${name}]`);
    if (element === null) throw new Error(`falta [data-stats-${name}]`);
    return element;
  };

  const input = $<HTMLTextAreaElement>("input");
  const status = $<HTMLElement>("status");
  const variablesBox = $<HTMLElement>("variables");
  const describeSelect = $<HTMLSelectElement>("describe");
  const description = $<HTMLElement>("description");
  const report = $<HTMLElement>("report");
  const chart = $<HTMLElement>("chart");
  const copyButton = $<HTMLButtonElement>("copy");
  const svgButton = $<HTMLButtonElement>("svg");
  const work = $<HTMLElement>("work");
  const field = (name: string): HTMLSelectElement | HTMLInputElement => $<HTMLSelectElement>(`field="${name}"`);

  let dataset: Dataset | null = null;
  let apaText = "";

  const say = (message: string, state: StatusState): void => {
    status.textContent = message;
    status.dataset["state"] = state;
  };

  const question = (): Question =>
    (root.querySelector<HTMLInputElement>('input[name="stats-question"]:checked')?.value ?? "two-groups") as Question;

  const fillSelect = (select: HTMLSelectElement, names: readonly string[]): void => {
    const previous = [...select.selectedOptions].map((option) => option.value);
    select.replaceChildren(
      ...names.map((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        option.selected = previous.includes(name);
        return option;
      }),
    );
  };

  const refreshFields = (): void => {
    const current = question();
    for (const wrapper of root.querySelectorAll<HTMLElement>("[data-stats-for]")) {
      wrapper.hidden = !FIELDS[current].includes(wrapper.dataset["statsFor"] ?? "");
    }
    for (const note of root.querySelectorAll<HTMLElement>("[data-stats-assume]")) {
      note.hidden = note.dataset["statsAssume"] !== current;
    }
  };

  const describe = (): void => {
    const variable = dataset?.variables.find((item) => item.name === describeSelect.value);
    if (variable === undefined) {
      description.replaceChildren();
      return;
    }
    const numeric = variable.kind === "numeric";
    const headers = numeric
      ? [strings.text("stats.col.measure"), strings.text("stats.col.value")]
      : [strings.text("stats.col.level"), strings.text("stats.col.count"), strings.text("stats.col.percent")];
    const rows = summaryRows(variable, strings);
    const spec: ChartSpec = numeric
      ? { kind: "histogram", values: (variable.numbers ?? []).filter((value): value is number => value !== null) }
      : { kind: "bars", labels: rows.map((row) => row[0] ?? ""), series: [{ label: variable.name, counts: rows.map((row) => Number(row[1])) }] };
    description.replaceChildren(table(headers, rows, variable.name), sceneToSvg(sceneFor(spec), `${chartTitle(spec, strings)}: ${variable.name}`));
  };

  const refreshVariables = (): void => {
    if (dataset === null) return;
    const current = dataset;
    variablesBox.replaceChildren(variablesTable(current, strings, setKind));
    const all = current.variables.map((variable) => variable.name);
    const numeric = current.variables.filter((variable) => variable.kind === "numeric").map((variable) => variable.name);
    const categorical = current.variables.filter((variable) => variable.kind !== "numeric").map((variable) => variable.name);
    fillSelect(describeSelect, all);
    for (const name of ["outcome", "second", "predictors"]) fillSelect(field(name) as HTMLSelectElement, numeric);
    for (const name of ["group", "categoryA", "categoryB"]) fillSelect(field(name) as HTMLSelectElement, categorical);
    work.hidden = false;
    describe();
  };

  function setKind(name: string, kind: VariableKind): void {
    if (dataset === null) return;
    dataset = withKind(dataset, name, kind);
    refreshVariables();
  }

  const load = (text: string, example: boolean): void => {
    const parsed = parseDataset(text);
    if (!parsed.ok) {
      say(describeDatasetError(parsed.error, strings), "error");
      return;
    }
    dataset = parsed.value;
    report.replaceChildren();
    chart.replaceChildren();
    copyButton.disabled = true;
    svgButton.disabled = true;
    refreshVariables();
    say(
      example
        ? strings.text("stats.status.example")
        : strings.format("stats.status.read", { rows: parsed.value.rows, columns: parsed.value.variables.length }),
      "ok",
    );
  };

  $<HTMLButtonElement>("read").addEventListener("click", () => load(input.value, false));
  $<HTMLButtonElement>("example").addEventListener("click", () => {
    input.value = EXAMPLE_CSV;
    load(EXAMPLE_CSV, true);
  });
  $<HTMLInputElement>("file").addEventListener("change", (event) => {
    const target = event.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    target.value = "";
    if (file === undefined) return;
    file.text().then(
      (text) => {
        input.value = text;
        load(text, false);
      },
      () => say(strings.text("stats.error.file"), "error"),
    );
  });

  describeSelect.addEventListener("change", describe);
  for (const radio of root.querySelectorAll<HTMLInputElement>('input[name="stats-question"]')) {
    radio.addEventListener("change", refreshFields);
  }

  const request = (): AnalysisRequest => {
    const current = question();
    const value = (name: string): string => field(name).value;
    if (current === "association") return { question: current, outcome: value("categoryA"), second: value("categoryB") };
    const selected = [...(field("predictors") as HTMLSelectElement).selectedOptions].map((option) => option.value);
    return {
      question: current,
      outcome: value("outcome"),
      group: value("group"),
      second: value("second"),
      predictors: selected,
      mu: Number((value("mu") || "0").replace(",", ".")),
    };
  };

  $<HTMLButtonElement>("run").addEventListener("click", () => {
    if (dataset === null) return;
    const result = runAnalysis(dataset, request());
    if (!result.ok) {
      report.replaceChildren();
      chart.replaceChildren();
      copyButton.disabled = true;
      svgButton.disabled = true;
      say(describeAnalysisError(result.error, strings), "error");
      return;
    }
    apaText = result.value.tests.map((test) => test.apa).join("; ");
    report.replaceChildren(...reportNodes(result.value, strings));
    chart.replaceChildren(sceneToSvg(sceneFor(result.value.chart), chartTitle(result.value.chart, strings)));
    copyButton.disabled = false;
    svgButton.disabled = false;
    say(strings.text("stats.status.computed"), "ok");
  });

  copyButton.addEventListener("click", () => {
    void navigator.clipboard?.writeText(apaText).then(() => say(strings.text("stats.status.copied"), "ok"));
  });

  svgButton.addEventListener("click", () => {
    const svg = chart.querySelector("svg");
    if (svg === null) return;
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}`;
    const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "grafico.svg";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });

  refreshFields();
  say(strings.text("stats.status.ready"), "idle");
};

safeInit("statistics", initStatisticsLab);
