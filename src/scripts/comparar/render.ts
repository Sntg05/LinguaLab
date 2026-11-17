/* ============================================================
   LinguaLab — comparación de documentos: lo que se dibuja en el navegador

   NADA DE `innerHTML`: los nombres de archivo y las palabras vienen de los
   documentos de la persona y entran siempre como nodos de texto.
   ============================================================ */

import type { Concordance } from "../tools/analysis";
import type { DocumentConcordance, KeywordList, PreparedDocument, VocabularyComparison } from "../tools/compare";
import { formatDecimal, formatP } from "./rules";
import type { CompareStrings } from "./strings";

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

/** Una tabla; salvo que se diga otra cosa, la primera celda de cada fila es su encabezado. */
export const table = (
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  caption?: string,
  rowHeaders = true,
): HTMLElement => {
  const element = node("table", undefined, "cmp-table");
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
      if (index === 0 && rowHeaders) {
        const th = node("th", cell);
        th.scope = "row";
        tr.append(th);
      } else {
        tr.append(node("td", cell, rowHeaders ? "cmp-number" : undefined));
      }
    });
    body.append(tr);
  }
  element.append(head, body);
  const scroll = node("div", undefined, "table-scroll");
  scroll.append(element);
  return scroll;
};

export const documentList = (
  list: HTMLElement,
  documents: readonly PreparedDocument[],
  details: readonly { readonly format: string; readonly pages?: number }[],
  strings: CompareStrings,
  onRemove: (index: number) => void,
): void => {
  list.replaceChildren(
    ...documents.map((document, index) => {
      const item = node("li", undefined, "cmp-doc");
      const info = details[index];
      const meta = [
        info?.format.toUpperCase() ?? "",
        strings.format("cmp.words", { count: document.size }),
        info?.pages === undefined ? "" : strings.format("cmp.pages", { count: info.pages }),
      ].filter((part) => part !== "");
      const remove = node("button", strings.text("cmp.remove"), "btn btn--quiet btn--sm");
      remove.type = "button";
      remove.setAttribute("aria-label", strings.format("cmp.removeLabel", { name: document.name }));
      remove.addEventListener("click", () => onRemove(index));
      item.append(node("strong", document.name), node("span", meta.join(" · "), "faint"), remove);
      return item;
    }),
  );
};

export const keywordTables = (
  documents: readonly PreparedDocument[],
  lists: readonly KeywordList[],
  locale: string,
  strings: CompareStrings,
): HTMLElement[] => {
  const headers = [
    strings.text("cmp.col.word"),
    strings.text("cmp.col.here"),
    strings.text("cmp.col.rest"),
    strings.text("cmp.col.herePer10k"),
    strings.text("cmp.col.restPer10k"),
    strings.text("cmp.col.g2"),
    strings.text("cmp.col.p"),
    strings.text("cmp.col.logRatio"),
  ];
  return lists.flatMap((list, index) => {
    const name = documents[index]?.name ?? "";
    const group = node("div", undefined, "cmp-group");
    group.dataset["cmpKeywords"] = name;
    for (const direction of ["positive", "negative"] as const) {
      const rows = list[direction].map((row) => [
        row.display,
        String(row.here),
        String(row.rest),
        formatDecimal(row.herePer10k, locale, 1),
        formatDecimal(row.restPer10k, locale, 1),
        formatDecimal(row.g2, locale, 2),
        formatP(row.p, locale),
        formatDecimal(row.logRatio, locale, 2),
      ]);
      const title = strings.format(direction === "positive" ? "cmp.keywords.positive" : "cmp.keywords.negative", {
        name,
      });
      group.append(
        rows.length === 0
          ? node("p", `${title}: ${strings.text("cmp.none")}`, "faint")
          : table(headers, rows, title),
      );
    }
    group.append(node("p", strings.format("cmp.keywords.tested", { count: list.tested }), "faint"));
    return [group];
  });
};

const wordList = (title: string, words: readonly string[], strings: CompareStrings): HTMLElement => {
  const block = node("div", undefined, "cmp-group");
  block.append(node("h4", title, "cmp-subtitle"));
  block.append(
    node("p", words.length === 0 ? strings.text("cmp.none") : words.slice(0, 60).join(", "), "cmp-words"),
  );
  return block;
};

export const vocabularyBlocks = (
  documents: readonly PreparedDocument[],
  vocabulary: VocabularyComparison,
  locale: string,
  strings: CompareStrings,
): HTMLElement[] => [
  wordList(strings.text("cmp.vocabulary.shared"), vocabulary.shared, strings),
  ...vocabulary.unique.map((words, index) =>
    wordList(strings.format("cmp.vocabulary.unique", { name: documents[index]?.name ?? "" }), words, strings),
  ),
  table(
    [strings.text("cmp.col.pair"), strings.text("cmp.vocabulary.jaccard")],
    vocabulary.jaccard.map((pair) => [
      `${documents[pair.left]?.name ?? ""} — ${documents[pair.right]?.name ?? ""}`,
      formatDecimal(pair.value, locale, 3),
    ]),
  ),
];

const concordanceRows = (lines: readonly Concordance[]): string[][] =>
  lines.slice(0, 50).map((line) => [line.left, line.node, line.right]);

export const concordanceBlocks = (groups: readonly DocumentConcordance[], strings: CompareStrings): HTMLElement[] =>
  groups.map((group) => {
    const block = node("div", undefined, "cmp-group");
    block.append(node("h4", group.document, "cmp-subtitle"));
    block.append(
      group.lines.length === 0
        ? node("p", strings.text("cmp.none"), "faint")
        : table(
            [strings.text("cmp.col.left"), strings.text("cmp.col.node"), strings.text("cmp.col.right")],
            concordanceRows(group.lines),
            undefined,
            false,
          ),
    );
    return block;
  });
