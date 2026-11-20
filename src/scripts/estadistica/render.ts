/* ============================================================
   LinguaLab — estadística: lo que se dibuja en el navegador

   NADA DE `innerHTML`: nombres de variables, niveles y valores vienen del
   archivo de la persona y entran como nodos de texto. Los gráficos se arman
   con `createElementNS` a partir de la escena de `charts.ts`.
   ============================================================ */

import type { Dataset, VariableKind } from "@lingualab/core";
import type { AnalysisReport } from "./analyses";
import type { Scene } from "./charts";
import type { StatisticsStrings } from "./strings";

const SVG = "http://www.w3.org/2000/svg";

const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className !== undefined) element.className = className;
  return element;
};

export const table = (headers: readonly string[], rows: readonly (readonly string[])[], caption?: string): HTMLElement => {
  const element = node("table", undefined, "stats-table");
  if (caption !== undefined) element.append(node("caption", caption));
  const head = node("thead");
  const headRow = node("tr");
  for (const header of headers) {
    const th = node("th", header);
    th.scope = "col";
    headRow.append(th);
  }
  head.append(headRow);
  const body = node("tbody");
  for (const row of rows) {
    const tr = node("tr");
    row.forEach((cell, index) => {
      if (index === 0) {
        const th = node("th", cell);
        th.scope = "row";
        tr.append(th);
      } else {
        tr.append(node("td", cell, "stats-number"));
      }
    });
    body.append(tr);
  }
  element.append(head, body);
  const scroll = node("div", undefined, "table-scroll");
  scroll.append(element);
  return scroll;
};

const KINDS: readonly VariableKind[] = ["numeric", "nominal", "ordinal"];

/** La tabla de variables, con un selector de tipo por variable. */
export const variablesTable = (
  dataset: Dataset,
  strings: StatisticsStrings,
  onKind: (name: string, kind: VariableKind) => void,
): HTMLElement => {
  const wrapper = table(
    [strings.text("stats.col.variable"), strings.text("stats.col.kind"), strings.text("stats.col.n"), strings.text("stats.col.missing")],
    dataset.variables.map((variable) => [variable.name, "", String(variable.raw.length - variable.missing), String(variable.missing)]),
  );
  const rows = wrapper.querySelectorAll("tbody tr");
  dataset.variables.forEach((variable, index) => {
    const cell = rows[index]?.children[1];
    if (cell === undefined) return;
    cell.textContent = "";
    const select = node("select");
    select.dataset["statsKind"] = variable.name;
    select.setAttribute("aria-label", strings.format("stats.kindLabel", { name: variable.name }));
    for (const kind of KINDS) {
      // Una variable con texto no puede pasar a numérica: esa opción no se ofrece.
      if (kind === "numeric" && variable.numbers === null) continue;
      const option = node("option", strings.text(`stats.kind.${kind}`));
      option.value = kind;
      option.selected = variable.kind === kind;
      select.append(option);
    }
    select.addEventListener("change", () => onKind(variable.name, select.value as VariableKind));
    cell.append(select);
  });
  return wrapper;
};

export const sceneToSvg = (scene: Scene, title: string): SVGSVGElement => {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${scene.width} ${scene.height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("class", "stats-chart");
  const titleNode = document.createElementNS(SVG, "title");
  titleNode.textContent = title;
  svg.append(titleNode);
  const round = (value: number): string => String(Math.round(value * 10) / 10);
  for (const item of scene.items) {
    let element: SVGElement;
    if (item.type === "rect") {
      element = document.createElementNS(SVG, "rect");
      element.setAttribute("x", round(item.x));
      element.setAttribute("y", round(item.y));
      element.setAttribute("width", round(item.w));
      element.setAttribute("height", round(item.h));
      element.setAttribute("class", `stats-bar stats-tone-${item.tone % 4}`);
    } else if (item.type === "line") {
      element = document.createElementNS(SVG, "line");
      element.setAttribute("x1", round(item.x1));
      element.setAttribute("y1", round(item.y1));
      element.setAttribute("x2", round(item.x2));
      element.setAttribute("y2", round(item.y2));
      element.setAttribute("class", `stats-line stats-line--${item.role}`);
    } else if (item.type === "circle") {
      element = document.createElementNS(SVG, "circle");
      element.setAttribute("cx", round(item.cx));
      element.setAttribute("cy", round(item.cy));
      element.setAttribute("r", String(item.r));
      element.setAttribute("class", "stats-point");
    } else {
      element = document.createElementNS(SVG, "text");
      element.setAttribute("x", round(item.x));
      element.setAttribute("y", round(item.y));
      element.setAttribute("text-anchor", item.anchor);
      element.setAttribute("class", "stats-label");
      element.textContent = item.text;
    }
    svg.append(element);
  }
  return svg;
};

/** El informe: pruebas con su frase APA, cifras, avisos y coeficientes. */
export const reportNodes = (report: AnalysisReport, strings: StatisticsStrings): HTMLElement[] => {
  const nodes: HTMLElement[] = [];
  nodes.push(
    table(
      [strings.text("stats.col.test"), strings.text("stats.col.result")],
      report.tests.map((test) => [
        strings.dynamic(`stats.testName.${test.name}`, test.name),
        `${test.apa} (${strings.text(test.significant ? "stats.significant" : "stats.notSignificant")})`,
      ]),
    ),
  );
  nodes.push(
    table(
      [strings.text("stats.col.measure"), strings.text("stats.col.value")],
      report.figures.map((figure) => [strings.dynamic(`stats.figure.${figure.key}`, figure.key), figure.value]),
    ),
  );
  if (report.coefficients !== undefined) {
    nodes.push(
      table(
        [strings.text("stats.col.term"), strings.text("stats.col.estimate"), strings.text("stats.col.se"), strings.text("stats.col.t"), strings.text("stats.col.p")],
        report.coefficients,
      ),
    );
  }
  for (const warning of report.warnings) {
    nodes.push(node("p", strings.dynamic(`stats.warning.${warning}`, warning), "callout callout--warn"));
  }
  return nodes;
};
