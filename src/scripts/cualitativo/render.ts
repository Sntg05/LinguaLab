/* ============================================================
   LinguaLab — análisis cualitativo: las tablas que se construyen en el navegador

   NADA DE `innerHTML`: los nombres de código, las definiciones y el material
   vienen de la persona o de un archivo ajeno, y entran siempre como nodos de
   texto. La CSP sin `unsafe-inline` depende de eso.
   ============================================================ */

import {
  type AgreementReport,
  type CodedSegment,
  type CodingSheet,
  type QualitativeCode,
  codeFrequencies,
  codeTree,
  cooccurrenceMatrix,
} from "@lingualab/core";
import { describeAlpha, describeKappa, formatPercent } from "./rules";
import type { QualitativeStrings } from "./strings";

const node = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className !== undefined) element.className = className;
  return element;
};

const headerRow = (labels: readonly string[]): HTMLTableRowElement => {
  const row = node("tr");
  for (const label of labels) {
    const th = node("th", label);
    th.scope = "col";
    row.append(th);
  }
  return row;
};

const rowHeader = (text: string): HTMLTableCellElement => {
  const th = node("th", text);
  th.scope = "row";
  return th;
};

/**
 * El libro en orden de árbol: cada hijo debajo de su padre y sangrado. El color
 * va en una muestra al lado del nombre, nunca en lugar de él (WCAG 1.4.1). Se
 * pinta con el CSSOM (`style.backgroundColor`), que la CSP permite; un atributo
 * `style` escrito en el marcado no lo estaría.
 */
export const renderCodebook = (
  body: HTMLElement,
  codes: readonly QualitativeCode[],
  strings: QualitativeStrings,
  onRemove: (name: string) => void,
): void => {
  body.replaceChildren(
    ...codeTree(codes).map(({ code, depth }) => {
      const row = node("tr");
      const remove = node("button", strings.text("qual.remove"), "btn btn--quiet btn--sm");
      remove.type = "button";
      remove.setAttribute("aria-label", strings.format("qual.removeLabel", { code: code.name }));
      remove.addEventListener("click", () => onRemove(code.name));
      const actions = node("td");
      actions.append(remove);
      const rules = [code.include, code.exclude, code.example].filter((value) => value !== "");
      const definition = node("td");
      definition.append(node("span", code.definition));
      if (rules.length > 0) definition.append(node("span", rules.join(" · "), "qual-muted"));
      if (code.memo !== undefined) {
        definition.append(node("span", `${strings.text("qual.memo")}: ${code.memo}`, "qual-muted"));
      }
      const header = rowHeader(code.name);
      header.classList.add(`qual-depth-${Math.min(depth, 4)}`);
      if (code.color !== undefined) {
        const swatch = node("span", undefined, "qual-swatch");
        swatch.setAttribute("aria-hidden", "true");
        swatch.style.backgroundColor = code.color;
        header.prepend(swatch);
      }
      row.append(header, definition, actions);
      return row;
    }),
  );
};

/** Los segmentos de un código, como lista numerada con su número de segmento. */
export const renderRetrieved = (list: HTMLElement, segments: readonly CodedSegment[]): void => {
  list.replaceChildren(
    ...segments.map((segment) => {
      const item = node("li", segment.text);
      item.value = Number(segment.id);
      return item;
    }),
  );
};

/** La hoja: un segmento por fila y una casilla por código. */
export const renderCoding = (
  table: HTMLTableElement,
  sheet: CodingSheet,
  codebook: readonly QualitativeCode[],
  strings: QualitativeStrings,
  onToggle: (segment: number, code: number, checked: boolean) => void,
): void => {
  const head = node("thead");
  const header = headerRow([strings.text("qual.col.segment"), strings.text("qual.col.text")]);
  for (const name of sheet.codes) {
    const th = node("th", name, "qual-code-head");
    th.scope = "col";
    const definition = codebook.find((code) => code.name === name)?.definition ?? "";
    if (definition !== "") th.title = definition;
    header.append(th);
  }
  head.append(header);

  const body = node("tbody");
  for (const [segmentIndex, segment] of sheet.segments.entries()) {
    const row = node("tr");
    row.append(rowHeader(segment.id), node("td", segment.text, "qual-segment"));
    for (const [codeIndex, name] of sheet.codes.entries()) {
      const box = node("input");
      box.type = "checkbox";
      box.checked = segment.marks[codeIndex] === true;
      box.dataset["qualMark"] = `${segmentIndex}:${codeIndex}`;
      box.setAttribute(
        "aria-label",
        strings.format("qual.markLabel", { code: name, segment: segment.id }),
      );
      box.addEventListener("change", () => onToggle(segmentIndex, codeIndex, box.checked));
      const cell = node("td", undefined, "qual-mark");
      cell.append(box);
      row.append(cell);
    }
    body.append(row);
  }
  table.replaceChildren(head, body);
};

export const renderFrequencies = (
  table: HTMLTableElement,
  sheet: CodingSheet,
  locale: string,
  strings: QualitativeStrings,
): void => {
  const head = node("thead");
  head.append(
    headerRow([
      strings.text("qual.col.code"),
      strings.text("qual.col.segments"),
      strings.text("qual.col.share"),
    ]),
  );
  const body = node("tbody");
  for (const frequency of codeFrequencies(sheet)) {
    const row = node("tr");
    row.append(
      rowHeader(frequency.code),
      node("td", String(frequency.segments), "qual-number"),
      node("td", formatPercent(frequency.share, locale), "qual-number"),
    );
    body.append(row);
  }
  table.replaceChildren(head, body);
};

export const renderCooccurrence = (
  table: HTMLTableElement,
  sheet: CodingSheet,
  strings: QualitativeStrings,
): void => {
  const head = node("thead");
  head.append(headerRow([strings.text("qual.col.code"), ...sheet.codes]));
  const body = node("tbody");
  for (const [i, counts] of cooccurrenceMatrix(sheet).entries()) {
    const row = node("tr");
    row.append(rowHeader(sheet.codes[i] ?? ""));
    for (const [j, count] of counts.entries()) {
      row.append(node("td", String(count), i === j ? "qual-number qual-diagonal" : "qual-number"));
    }
    body.append(row);
  }
  table.replaceChildren(head, body);
};

export const renderAgreement = (
  table: HTMLTableElement,
  report: AgreementReport,
  locale: string,
  strings: QualitativeStrings,
): void => {
  const head = node("thead");
  head.append(
    headerRow([
      strings.text("qual.col.code"),
      strings.text("qual.col.complete"),
      strings.text("qual.col.percent"),
      strings.text("qual.col.kappa"),
      strings.text("qual.col.alpha"),
    ]),
  );
  const body = node("tbody");
  for (const code of report.codes) {
    const row = node("tr");
    row.dataset["qualAgreementCode"] = code.code;
    row.append(
      rowHeader(code.code),
      node("td", String(code.complete), "qual-number"),
      node(
        "td",
        code.percent === null ? strings.text("qual.notComputable") : formatPercent(code.percent, locale),
        "qual-number",
      ),
      node("td", describeKappa(code.kappa, locale, strings), "qual-number"),
      node("td", describeAlpha(code.alpha, locale, strings), "qual-number"),
    );
    body.append(row);
  }
  table.replaceChildren(head, body);
};
