/* ============================================================
   LinguaLab — comparación de documentos: cableado de la página

   Conecta los ganchos `data-cmp-*` con el lector de documentos (que entrega el
   composition root), el motor de `../tools/compare` y las tablas de
   `render.ts`. Aquí no se calcula ni se redacta nada.
   ============================================================ */

import { MAX_DOCUMENT_BYTES } from "@lingualab/core";
import { lingualab } from "../../composition-root";
import { safeInit } from "../core/safe";
import {
  type KeywordList,
  type PreparedDocument,
  compareVocabulary,
  concordanceByDocument,
  frequencyTable,
  keywords,
  prepareDocument,
} from "../tools/compare";
import type { StopwordMode } from "../tools/tokenize";
import { concordanceBlocks, documentList, keywordTables, table, vocabularyBlocks } from "./render";
import {
  MIN_DOCUMENTS,
  admit,
  describeReadError,
  formatDecimal,
  frequencyCsv,
  keywordsCsv,
  profileCsv,
  profileRows,
} from "./rules";
import { createCompareStrings, parseCompareStrings } from "./strings";

type StatusState = "idle" | "busy" | "ok" | "error";

/** Filas por dirección en las palabras clave y palabras por documento en la tabla de frecuencias. */
const KEYWORD_ROWS = 25;
const FREQUENCY_TOP = 15;

const download = (name: string, csv: string): void => {
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const initDocumentCompare = (): void => {
  const root = document.querySelector<HTMLElement>("[data-cmp]");
  if (root === null) return;
  const locale = document.documentElement.lang === "en" ? "en" : "es";
  const strings = createCompareStrings(parseCompareStrings(root.dataset["cmpStrings"]));
  const $ = <T extends Element>(name: string): T => {
    const element = root.querySelector<T>(`[data-cmp-${name}]`);
    if (element === null) throw new Error(`falta [data-cmp-${name}]`);
    return element;
  };

  const status = $<HTMLElement>("status");
  const fileInput = $<HTMLInputElement>("files");
  const list = $<HTMLElement>("list");
  const empty = $<HTMLElement>("empty");
  const runButton = $<HTMLButtonElement>("run");
  const results = $<HTMLElement>("results");
  const stopwordSelect = $<HTMLSelectElement>("stopwords");
  const minCountInput = $<HTMLInputElement>("min");
  const alphaSelect = $<HTMLSelectElement>("alpha");
  const kwicInput = $<HTMLInputElement>("kwic-word");
  const exportButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-cmp-export]")];

  let documents: PreparedDocument[] = [];
  let details: { format: string; pages?: number }[] = [];
  let lists: KeywordList[] = [];

  const say = (message: string, state: StatusState): void => {
    status.textContent = message;
    status.dataset["state"] = state;
  };
  const stopwords = (): StopwordMode => stopwordSelect.value as StopwordMode;

  const clearResults = (): void => {
    results.hidden = true;
    lists = [];
    for (const button of exportButtons) button.disabled = true;
  };

  const refreshList = (): void => {
    documentList(list, documents, details, strings, removeDocument);
    empty.hidden = documents.length > 0;
    runButton.disabled = documents.length < MIN_DOCUMENTS;
  };

  function removeDocument(index: number): void {
    const name = documents[index]?.name ?? "";
    documents = documents.filter((_, at) => at !== index);
    details = details.filter((_, at) => at !== index);
    clearResults();
    refreshList();
    say(strings.format("cmp.status.removed", { name }), "ok");
  }

  const load = async (file: File): Promise<void> => {
    const admission = admit(
      documents.map((document) => document.name),
      file.name,
    );
    if (admission !== "ok") {
      const key = admission === "tooMany" ? "cmp.error.tooMany" : "cmp.error.duplicate";
      say(strings.format(key, { name: file.name }), "error");
      return;
    }
    // El tope se mira antes de leer el archivo: un PDF de 2 GB no llega a la memoria.
    if (file.size > MAX_DOCUMENT_BYTES) {
      say(describeReadError({ code: "too-large", bytes: file.size, limit: MAX_DOCUMENT_BYTES }, file.name, strings), "error");
      return;
    }
    say(strings.format("cmp.status.reading", { name: file.name }), "busy");
    try {
      const result = await lingualab.readDocument(file.name, new Uint8Array(await file.arrayBuffer()));
      if (!result.ok) {
        say(describeReadError(result.error, file.name, strings), "error");
        return;
      }
      const prepared = prepareDocument({ name: file.name, text: result.value.text });
      documents = [...documents, prepared];
      details = [...details, result.value.pages === undefined ? { format: result.value.format } : { format: result.value.format, pages: result.value.pages }];
      clearResults();
      refreshList();
      say(strings.format("cmp.status.loaded", { name: file.name, words: prepared.size }), "ok");
    } catch {
      say(strings.format("cmp.error.read", { name: file.name }), "error");
    }
  };

  fileInput.addEventListener("change", () => {
    const files = [...(fileInput.files ?? [])];
    fileInput.value = "";
    void (async () => {
      for (const file of files) await load(file);
    })();
  });

  const section = (name: string, children: readonly Node[]): void => {
    $<HTMLElement>(name).replaceChildren(...children);
  };

  const compare = (): void => {
    if (documents.length < MIN_DOCUMENTS) {
      say(strings.text("cmp.error.tooFew"), "error");
      return;
    }
    const mode = stopwords();
    const minCount = Math.max(1, Number.parseInt(minCountInput.value, 10) || 1);
    const alpha = Number(alphaSelect.value) || 0.05;
    lists = documents.map((_, index) => keywords(documents, index, { stopwords: mode, minCount, limit: KEYWORD_ROWS, alpha }));

    const names = documents.map((document) => document.name);
    section("profile", [table([strings.text("cmp.col.measure"), ...names], profileRows(documents, mode, locale, strings))]);
    section("keywords", keywordTables(documents, lists, locale, strings));
    section("vocabulary", vocabularyBlocks(documents, compareVocabulary(documents, mode), locale, strings));
    section("frequency", [
      table(
        [strings.text("cmp.col.word"), ...names],
        frequencyTable(documents, mode, FREQUENCY_TOP).map((row) => [
          row.display,
          ...row.per10k.map((value) => formatDecimal(value, locale, 1)),
        ]),
      ),
    ]);
    section("kwic-results", []);
    results.hidden = false;
    for (const button of exportButtons) button.disabled = false;
    say(strings.format("cmp.status.compared", { count: documents.length }), "ok");
  };
  runButton.addEventListener("click", compare);

  $<HTMLFormElement>("kwic").addEventListener("submit", (event) => {
    event.preventDefault();
    const word = kwicInput.value.trim();
    if (word === "") return;
    const groups = concordanceByDocument(documents, word);
    section("kwic-results", concordanceBlocks(groups, strings));
    const count = groups.reduce((sum, group) => sum + group.lines.length, 0);
    say(strings.format("cmp.status.kwic", { count, word }), "ok");
  });

  const exports: Record<string, () => [string, string]> = {
    keywords: () => ["keywords.csv", keywordsCsv(documents, lists)],
    frequency: () => ["frequencies.csv", frequencyCsv(documents, stopwords(), FREQUENCY_TOP)],
    profile: () => ["profile.csv", profileCsv(documents, stopwords())],
  };
  for (const button of exportButtons) {
    button.addEventListener("click", () => {
      const file = exports[button.dataset["cmpExport"] ?? ""]?.();
      if (file !== undefined) download(file[0], file[1]);
    });
  }

  clearResults();
  refreshList();
  say(strings.text("cmp.status.ready"), "idle");
};

safeInit("document compare", initDocumentCompare);
