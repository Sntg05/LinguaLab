/* ============================================================
   LinguaLab — análisis cualitativo: cableado de la página

   Solo conecta los ganchos `data-qual-*` del componente con el motor del núcleo
   (`@lingualab/core`, módulo `qualitative`), las frases de `rules.ts` y las
   tablas de `render.ts`. Aquí no se calcula nada ni se redacta nada.
   ============================================================ */

import {
  type AgreementReport,
  type CodingSheet,
  type QualitativeCode,
  type SegmentMode,
  agreementReport,
  agreementToCsv,
  checkCodeName,
  codeKey,
  codebookToCsv,
  codingToCsv,
  cooccurrenceToCsv,
  createCodingSheet,
  frequenciesToCsv,
  parseCodebookCsv,
  parseCodingCsv,
  segmentsWithCode,
  segmentText,
  setMark,
  withCodes,
} from "@lingualab/core";
import { safeInit } from "../core/safe";
import { exampleFor } from "./example";
import {
  renderAgreement,
  renderCodebook,
  renderCoding,
  renderCooccurrence,
  renderFrequencies,
  renderRetrieved,
} from "./render";
import { browserStorage, clearProject, loadProject, saveProject } from "./persistence";
import { alignNames, describeAgreementError, describeCsvError, mergeCodebook } from "./rules";
import { createQualitativeStrings, parseQualitativeStrings } from "./strings";

type StatusState = "idle" | "ok" | "error";

const need = <T extends Element>(root: HTMLElement, selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (element === null) throw new Error(`falta ${selector}`);
  return element;
};

/** CSV con BOM: así una hoja de cálculo lo abre en UTF-8 y los acentos no se rompen. */
const download = (name: string, csv: string): void => {
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revocar en el mismo turno cancela la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const initQualitativeLab = (): void => {
  const root = document.querySelector<HTMLElement>("[data-qual]");
  if (root === null) return;

  const locale = document.documentElement.lang === "en" ? "en" : "es";
  const strings = createQualitativeStrings(parseQualitativeStrings(root.dataset["qualStrings"]));
  const $ = <T extends Element>(name: string): T => need<T>(root, `[data-qual-${name}]`);

  const status = $<HTMLElement>("status");
  const codeForm = $<HTMLFormElement>("code-form");
  const codebookBody = $<HTMLElement>("codebook");
  const codebookEmpty = $<HTMLElement>("codebook-empty");
  // Una tabla con cabecera y sin filas es una tabla vacía para un lector de
  // pantalla (axe: th-has-data-cells); mientras no hay códigos, se oculta.
  const codebookBox = $<HTMLElement>("codebook-box");
  const material = $<HTMLTextAreaElement>("material");
  const codingTable = $<HTMLTableElement>("coding");
  const codingBox = $<HTMLElement>("coding-box");
  const codingEmpty = $<HTMLElement>("coding-empty");
  const resultsBox = $<HTMLElement>("results-box");
  const resultsEmpty = $<HTMLElement>("results-empty");
  const frequencyTable = $<HTMLTableElement>("frequencies");
  const cooccurrenceTable = $<HTMLTableElement>("cooccurrence");
  const othersInput = $<HTMLInputElement>("others");
  const othersList = $<HTMLElement>("others-list");
  const includeMine = $<HTMLInputElement>("include-mine");
  const agreementBox = $<HTMLElement>("agreement-box");
  const agreementTable = $<HTMLTableElement>("agreement");
  const exportButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-qual-export]")];
  const parentSelect = $<HTMLSelectElement>("parent");
  const retrieveSelect = $<HTMLSelectElement>("retrieve");
  const retrieveList = $<HTMLElement>("retrieve-list");
  const retrieveCount = $<HTMLElement>("retrieve-count");
  const storage = browserStorage();
  let warnedNotSaved = false;

  let codebook: readonly QualitativeCode[] = [];
  let sheet: CodingSheet | null = null;
  let others: readonly { readonly name: string; readonly sheet: CodingSheet }[] = [];
  let report: AgreementReport | null = null;

  const say = (message: string, state: StatusState): void => {
    status.textContent = message;
    status.dataset["state"] = state;
  };

  const currentMode = (): SegmentMode =>
    root.querySelector<HTMLInputElement>('input[name="qual-mode"]:checked')?.value === "paragraph"
      ? "paragraph"
      : "line";

  /** Guarda en este navegador. Si no se puede, lo dice una vez y sigue. */
  const persist = (): void => {
    // Una página vacía no es un proyecto: guardarla haría que al recargar se
    // anunciara «se recuperó el trabajo» sin que hubiera ninguno.
    if (codebook.length === 0 && sheet === null && material.value.trim() === "") {
      clearProject(storage);
      return;
    }
    const saved = saveProject(storage, { codebook, material: material.value, mode: currentMode(), sheet });
    if (!saved && !warnedNotSaved) {
      warnedNotSaved = true;
      say(strings.text("qual.status.notSaved"), "error");
    }
  };

  /** Los segmentos del código elegido; la elección se conserva si el código sigue. */
  const refreshRetrieval = (): void => {
    if (sheet === null) return;
    const previous = retrieveSelect.value;
    retrieveSelect.replaceChildren(
      ...sheet.codes.map((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        return option;
      }),
    );
    if (sheet.codes.includes(previous)) retrieveSelect.value = previous;
    const chosen = retrieveSelect.value;
    const found = segmentsWithCode(sheet, chosen);
    renderRetrieved(retrieveList, found);
    retrieveCount.textContent =
      chosen === "" ? "" : strings.format("qual.retrieve.count", { count: found.length, code: chosen });
  };
  retrieveSelect.addEventListener("change", refreshRetrieval);

  /** Lo que depende de las marcas: tablas de resultados y botones de descarga. */
  const refreshResults = (): void => {
    const ready = sheet !== null && sheet.codes.length > 0 && sheet.segments.length > 0;
    resultsBox.hidden = !ready;
    resultsEmpty.hidden = ready;
    if (ready && sheet !== null) {
      renderFrequencies(frequencyTable, sheet, locale, strings);
      renderCooccurrence(cooccurrenceTable, sheet, strings);
      refreshRetrieval();
    }
    const available: Record<string, boolean> = {
      codebook: codebook.length > 0,
      coding: ready,
      frequencies: ready,
      cooccurrence: ready,
      agreement: report !== null,
    };
    for (const button of exportButtons) {
      button.disabled = !available[button.dataset["qualExport"] ?? ""];
    }
  };

  const toggle = (segment: number, code: number, checked: boolean): void => {
    if (sheet === null) return;
    sheet = setMark(sheet, segment, code, checked);
    refreshResults();
    persist();
  };

  /** El selector de padre ofrece los códigos que ya existen. */
  const refreshParentOptions = (): void => {
    const none = parentSelect.options[0];
    parentSelect.replaceChildren(
      ...(none === undefined ? [] : [none]),
      ...codebook.map((code) => {
        const option = document.createElement("option");
        option.value = code.name;
        option.textContent = code.name;
        return option;
      }),
    );
  };

  /** Lo que depende del libro o de los segmentos: se reconstruye la hoja entera. */
  const refreshAll = (): void => {
    renderCodebook(codebookBody, codebook, strings, removeCode);
    codebookEmpty.hidden = codebook.length > 0;
    codebookBox.hidden = codebook.length === 0;
    if (sheet !== null) sheet = withCodes(sheet, codebook.map((code) => code.name));
    const ready = sheet !== null && sheet.codes.length > 0 && sheet.segments.length > 0;
    codingBox.hidden = !ready;
    codingEmpty.hidden = ready;
    if (ready && sheet !== null) renderCoding(codingTable, sheet, codebook, strings, toggle);
    refreshParentOptions();
    refreshResults();
    persist();
  };

  /** Quitar un código deja a sus hijos como códigos principales, no huérfanos. */
  function removeCode(name: string): void {
    codebook = codebook
      .filter((code) => code.name !== name)
      .map((code) => {
        // Mismo criterio que el libro: «Actitud» y «actitud» son el mismo código.
        if (code.parent === undefined || codeKey(code.parent) !== codeKey(name)) return code;
        const { parent: _removed, ...rest } = code;
        return rest;
      });
    refreshAll();
    say(strings.format("qual.status.codeRemoved", { code: name }), "ok");
  }

  const field = (name: string): string =>
    (
      codeForm.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null
    )?.value ?? "";

  codeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = checkCodeName(field("name"), codebook.map((code) => code.name));
    if (!name.ok) {
      say(strings.text(name.error === "empty" ? "qual.error.codeEmpty" : "qual.error.codeDuplicate"), "error");
      return;
    }
    codebook = [
      ...codebook,
      {
        name: name.value,
        definition: field("definition").trim(),
        include: field("include").trim(),
        exclude: field("exclude").trim(),
        example: field("example").trim(),
        ...(field("parent") === "" ? {} : { parent: field("parent") }),
        ...(field("color") === "" ? {} : { color: field("color") }),
        ...(field("memo").trim() === "" ? {} : { memo: field("memo").trim() }),
      },
    ];
    codeForm.reset();
    refreshAll();
    say(strings.format("qual.status.codeAdded", { code: name.value }), "ok");
  });

  const readFile = async (input: HTMLInputElement, use: (text: string, name: string) => void) => {
    const files = [...(input.files ?? [])];
    input.value = "";
    for (const file of files) {
      try {
        use(await file.text(), file.name);
      } catch {
        say(strings.text("qual.error.file"), "error");
      }
    }
  };

  $<HTMLInputElement>("codebook-file").addEventListener("change", (event) => {
    void readFile(event.currentTarget as HTMLInputElement, (text) => {
      const parsed = parseCodebookCsv(text);
      if (!parsed.ok) {
        say(strings.format("qual.error.codebook", { detail: describeCsvError(parsed.error, strings) }), "error");
        return;
      }
      codebook = parsed.value;
      refreshAll();
      say(strings.format("qual.status.codebookLoaded", { count: codebook.length }), "ok");
    });
  });

  $<HTMLInputElement>("material-file").addEventListener("change", (event) => {
    void readFile(event.currentTarget as HTMLInputElement, (text) => {
      material.value = text;
      say(strings.text("qual.status.textLoaded"), "ok");
    });
  });

  const split = (): void => {
    const mode = (root.querySelector<HTMLInputElement>('input[name="qual-mode"]:checked')?.value ??
      "line") as SegmentMode;
    const segments = segmentText(material.value, mode);
    if (segments.length === 0) {
      say(strings.text("qual.error.materialEmpty"), "error");
      return;
    }
    sheet = createCodingSheet(segments, codebook.map((code) => code.name));
    report = null;
    agreementBox.hidden = true;
    refreshAll();
    say(strings.format("qual.status.split", { count: segments.length }), "ok");
  };
  $<HTMLButtonElement>("split").addEventListener("click", split);

  $<HTMLInputElement>("resume").addEventListener("change", (event) => {
    void readFile(event.currentTarget as HTMLInputElement, (text, file) => {
      const parsed = parseCodingCsv(text);
      if (!parsed.ok) {
        say(strings.format("qual.error.coding", { file, detail: describeCsvError(parsed.error, strings) }), "error");
        return;
      }
      codebook = mergeCodebook(codebook, parsed.value.codes);
      sheet = { ...parsed.value, codes: alignNames(codebook, parsed.value.codes) };
      material.value = parsed.value.segments.map((segment) => segment.text).join("\n");
      refreshAll();
      say(
        strings.format("qual.status.resumed", {
          segments: parsed.value.segments.length,
          codes: parsed.value.codes.length,
        }),
        "ok",
      );
    });
  });

  $<HTMLButtonElement>("example").addEventListener("click", () => {
    const example = exampleFor(locale);
    codebook = example.codebook;
    material.value = example.material;
    const lineMode = root.querySelector<HTMLInputElement>('input[name="qual-mode"][value="line"]');
    if (lineMode !== null) lineMode.checked = true;
    split();
    say(strings.text("qual.status.example"), "ok");
  });

  const renderOthers = (): void => {
    othersList.replaceChildren(
      ...others.map((other) => {
        const item = document.createElement("li");
        item.textContent = other.name;
        return item;
      }),
    );
  };

  othersInput.addEventListener("change", () => {
    void readFile(othersInput, (text, file) => {
      const parsed = parseCodingCsv(text);
      if (!parsed.ok) {
        say(strings.format("qual.error.coding", { file, detail: describeCsvError(parsed.error, strings) }), "error");
        return;
      }
      others = [...others, { name: file, sheet: parsed.value }];
      renderOthers();
    });
  });

  $<HTMLButtonElement>("clear-others").addEventListener("click", () => {
    others = [];
    report = null;
    agreementBox.hidden = true;
    renderOthers();
    refreshResults();
  });

  $<HTMLButtonElement>("agree").addEventListener("click", () => {
    const sheets = [
      ...(includeMine.checked && sheet !== null ? [sheet] : []),
      ...others.map((other) => other.sheet),
    ];
    const result = agreementReport(sheets);
    if (!result.ok) {
      report = null;
      agreementBox.hidden = true;
      refreshResults();
      say(describeAgreementError(result.error, strings), "error");
      return;
    }
    report = result.value;
    renderAgreement(agreementTable, report, locale, strings);
    agreementBox.hidden = false;
    refreshResults();
    say(
      strings.format("qual.status.agreement", { coders: report.coders, segments: report.segments }),
      "ok",
    );
  });

  const exports: Record<string, () => [string, string] | null> = {
    codebook: () => ["codebook.csv", codebookToCsv(codebook)],
    coding: () => (sheet === null ? null : ["coding.csv", codingToCsv(sheet)]),
    frequencies: () => (sheet === null ? null : ["frequencies.csv", frequenciesToCsv(sheet)]),
    cooccurrence: () => (sheet === null ? null : ["cooccurrence.csv", cooccurrenceToCsv(sheet)]),
    agreement: () => (report === null ? null : ["agreement.csv", agreementToCsv(report)]),
  };
  for (const button of exportButtons) {
    button.addEventListener("click", () => {
      const file = exports[button.dataset["qualExport"] ?? ""]?.();
      if (file != null) download(file[0], file[1]);
    });
  }

  // El material escrito a mano también se guarda, aunque todavía no se haya dividido.
  material.addEventListener("input", persist);

  $<HTMLButtonElement>("reset").addEventListener("click", () => {
    clearProject(storage);
    codebook = [];
    sheet = null;
    report = null;
    others = [];
    material.value = "";
    agreementBox.hidden = true;
    renderOthers();
    refreshAll();
    say(strings.text("qual.status.reset"), "ok");
  });

  // El trabajo guardado en este navegador vuelve al recargar.
  const restored = loadProject(storage);
  if (restored !== null) {
    codebook = restored.codebook;
    material.value = restored.material;
    sheet = restored.sheet;
    const mode = root.querySelector<HTMLInputElement>(`input[name="qual-mode"][value="${restored.mode}"]`);
    if (mode !== null) mode.checked = true;
  }
  refreshAll();
  say(strings.text(restored === null ? "qual.status.ready" : "qual.status.restored"), restored === null ? "idle" : "ok");
};

safeInit("qualitative", initQualitativeLab);
