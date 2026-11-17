/* ============================================================
   LinguaLab — estación de texto: cableado de la página
   Lee el texto, guarda los tokens y pinta el panel de la pestaña activa.
   Qué se calcula y qué se dice vive en `station-rules.ts` y en los motores
   de `analysis.ts`, `readability.ts` y `tokenize.ts`.
   ============================================================ */

import type { Locale } from "../../i18n";
import { byteLength, validateFile, validateText } from "../core/guardrails";
import { download } from "../trees/export";
import { kwic, ngrams, statistics } from "./analysis";
import { type NgramSettings, normaliseNgramSettings } from "./ngram-settings";
import { readability } from "./readability";
import {
  KWIC_ROWS,
  analysisReady,
  concordanceNote,
  counterLabel,
  exportPayload,
  fileErrorMessage,
  frequencyRows,
  gramLabel,
  gramLabelSingular,
  measureLabel,
  noRepeatsMessage,
  readabilityRows,
  sizeErrorMessage,
  statsRows,
} from "./station-rules";
import { nextTabIndex } from "./tabs";
import { type StopwordMode, type Token, tokenizeDetailed } from "./tokenize";

interface StationState {
  tokens: Token[];
  sentences: number;
  activeTab: string;
  hasResults: boolean;
}

const state: StationState = { tokens: [], sentences: 0, activeTab: "freq", hasResults: false };

const locale = (): Locale => (document.documentElement.lang === "en" ? "en" : "es");
const isSpanish = (): boolean => locale() === "es";

const $ = <T extends Element>(selector: string): T | null => document.querySelector<T>(selector);

/* ---------------- Ayudas de DOM ---------------- */

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const table = (headers: readonly string[], rows: readonly (readonly (string | Node)[])[]): HTMLTableElement => {
  const head = el("thead");
  const headRow = el("tr");
  for (const header of headers) {
    const th = el("th", undefined, header);
    th.scope = "col";
    headRow.append(th);
  }
  head.append(headRow);

  const body = el("tbody");
  for (const row of rows) {
    const tr = el("tr");
    for (const cell of row) {
      const td = el("td");
      if (typeof cell === "string") td.textContent = cell;
      else td.append(cell);
      tr.append(td);
    }
    body.append(tr);
  }

  const element = el("table", "tbl");
  element.append(head, body);
  return element;
};

/** Una barra, con el ancho en porcentaje sobre un span interior (CSSOM: la CSP no lo bloquea). */
const bar = (value: number, max: number): HTMLElement => {
  const wrap = el("span", "bar");
  const fill = el("span");
  fill.style.width = `${max > 0 ? (value / max) * 100 : 0}%`;
  wrap.append(fill);
  return wrap;
};

const definitionList = (pairs: readonly (readonly [string, string])[]): HTMLElement => {
  const list = el("dl", "stats");
  for (const [term, value] of pairs) {
    const group = el("div");
    group.append(el("dt", undefined, term), el("dd", undefined, value));
    list.append(group);
  }
  return list;
};

const note = (text: string): HTMLElement => el("p", "faint", text);

const showPanel = (...children: Node[]): void => {
  $("[data-panel]")?.replaceChildren(...children);
};

/* ---------------- Ajustes del formulario ---------------- */

const stopwordMode = (): StopwordMode =>
  ($<HTMLSelectElement>("[data-stopwords]")?.value ?? "es") as StopwordMode;

const readabilityLang = (): "es" | "en" =>
  $<HTMLSelectElement>("[data-lang]")?.value === "en" ? "en" : "es";

/** Los ajustes del constructor, leídos del formulario y normalizados antes de usarlos. */
const ngramSettings = (): NgramSettings =>
  normaliseNgramSettings({
    n: $<HTMLInputElement>("[data-ngram-n]")?.value,
    minCount: $<HTMLInputElement>("[data-ngram-min]")?.value,
    limit: $<HTMLInputElement>("[data-ngram-limit]")?.value,
    sortBy: $<HTMLSelectElement>("[data-ngram-sort]")?.value,
  });

/* ---------------- Paneles ---------------- */

const renderFrequency = (): void => {
  const es = isSpanish();
  const rows = frequencyRows(state.tokens, stopwordMode());
  if (rows.length === 0) {
    showPanel(note(es ? "Sin palabras." : "No words."));
    return;
  }

  const max = rows[0]?.count ?? 1;
  showPanel(
    table(
      [
        "#",
        es ? "Palabra" : "Word",
        es ? "Frec." : "Freq.",
        es ? "Relativa" : "Relative",
        es ? "Dispersión" : "Dispersion",
        "",
      ],
      rows.map((row) => [...row.cells, bar(row.count, max)]),
    ),
    note(
      es
        ? "La dispersión es la proporción de segmentos del texto que contienen la palabra: un recuento alto en un solo tramo da una dispersión baja."
        : "Dispersion is the share of text segments containing the word: a high count in one stretch gives a low dispersion.",
    ),
    note(
      es
        ? "Las palabras se agrupan ignorando acentos y mayúsculas; se muestra la grafía más frecuente."
        : "Words are grouped ignoring accents and case; the most frequent spelling is shown.",
    ),
  );
};

/** El constructor solo tiene sentido en su pestaña, así que en las demás se esconde. */
const syncNgramBuilder = (): void => {
  const builder = $<HTMLElement>("[data-ngram-builder]");
  if (builder) builder.hidden = state.activeTab !== "colloc";
};

const renderCollocations = (): void => {
  const es = isSpanish();
  const settings = ngramSettings();
  const mode = stopwordMode();
  const { n } = settings;
  const grams = ngrams(state.tokens, n, {
    stopwords: mode,
    minCount: settings.minCount,
    limit: settings.limit,
    sortBy: settings.sortBy,
  });

  if (grams.length === 0) {
    showPanel(note(noRepeatsMessage(n, settings.minCount, es)));
    return;
  }

  // Un tamaño más, como fichas. Con el n por defecto es la fila de trigramas
  // que el panel mostraba bajo la tabla de bigramas.
  const nextLabel = gramLabel(n + 1, es);
  const next = ngrams(state.tokens, n + 1, { stopwords: mode, minCount: 2, limit: 10 });
  const chipList = el("div", "chips");
  for (const gram of next) {
    const chip = el("span", "chip");
    chip.append(el("code", undefined, gram.display), el("b", undefined, String(gram.count)));
    chipList.append(chip);
  }

  showPanel(
    el("h3", "eyebrow", `${gramLabel(n, es)} · ${measureLabel(settings.sortBy, es)}`),
    table(
      [gramLabelSingular(n, es), es ? "Frec." : "Freq.", "log-Dice", "PMI", "t-score", "G²"],
      grams.map((gram) => [
        gram.display,
        String(gram.count),
        gram.logDice.toFixed(2),
        gram.pmi.toFixed(2),
        gram.tScore.toFixed(2),
        gram.logLikelihood.toFixed(1),
      ]),
    ),
    note(
      es
        ? "log-Dice va de 0 a 14 y favorece las colocaciones frecuentes; PMI favorece las raras; t-score las muy frecuentes; G² es la medida de significación habitual."
        : "log-Dice runs 0 to 14 and favours frequent collocations; PMI favours rare ones; t-score very frequent ones; G² is the usual significance measure.",
    ),
    ...(n > 2
      ? [
          note(
            es
              ? "Por encima de n = 2 las medidas se calculan contra la primera y la última palabra del n-grama, así que son una aproximación: de ese tamaño, el recuento es el dato fiable."
              : "Above n = 2 the measures are computed against the first and the last word of the n-gram, so they are an approximation: at that size the count is the reliable figure.",
          ),
        ]
      : []),
    el("h3", "eyebrow", nextLabel),
    next.length > 0 ? chipList : note(es ? `Sin ${nextLabel} repetidos.` : `No repeated ${nextLabel}.`),
  );
};

const renderKwic = (): void => {
  const es = isSpanish();
  const keyword = $<HTMLInputElement>("[data-keyword]")?.value ?? "";
  if (!keyword.trim()) {
    showPanel(note(es ? "Escribe una palabra clave arriba." : "Type a keyword above."));
    return;
  }

  const window = Number($<HTMLInputElement>("[data-window]")?.value ?? 5);
  const lines = kwic(state.tokens, keyword, { window });
  if (lines.length === 0) {
    showPanel(note(es ? "Sin coincidencias." : "No matches."));
    return;
  }

  showPanel(
    table(
      [es ? "Izquierda" : "Left", es ? "Nodo" : "Node", es ? "Derecha" : "Right"],
      lines
        .slice(0, KWIC_ROWS)
        .map((line) => [
          el("span", "faint", line.left),
          el("strong", "node", line.node),
          el("span", "faint", line.right),
        ]),
    ),
    note(concordanceNote(lines.length, es)),
  );
};

const renderStats = (): void => {
  const es = isSpanish();
  const stats = statistics(state.tokens, { stopwords: stopwordMode(), sentences: state.sentences });
  showPanel(
    definitionList(statsRows(stats, es)),
    note(
      es
        ? "El TTR depende de la longitud del texto, así que para comparar textos de distinto tamaño usa el MSTTR o la entropía. La pendiente de Zipf se acerca a −1 en lenguaje natural."
        : "Raw TTR depends on text length, so use MSTTR or entropy to compare texts of different sizes. The Zipf slope approaches −1 in natural language.",
    ),
  );
};

const renderReadability = (): void => {
  const text = $<HTMLTextAreaElement>("[data-corpus]")?.value ?? "";
  showPanel(
    definitionList(readabilityRows(readability(text, readabilityLang()), locale())),
    note(
      isSpanish()
        ? "Las sílabas del español se cuentan con reglas de diptongo e hiato; las del inglés son una aproximación declarada."
        : "Spanish syllables use diphthong and hiatus rules; English syllables are a stated approximation.",
    ),
  );
};

const render = (): void => {
  syncNgramBuilder();
  if (state.tokens.length === 0) {
    state.hasResults = false;
    $("[data-export]")?.setAttribute("disabled", "true");
    return;
  }
  $<HTMLElement>("[data-empty]")?.remove();
  state.hasResults = true;
  $("[data-export]")?.removeAttribute("disabled");

  switch (state.activeTab) {
    case "colloc":
      renderCollocations();
      break;
    case "kwic":
      renderKwic();
      break;
    case "stats":
      renderStats();
      break;
    case "read":
      renderReadability();
      break;
    default:
      renderFrequency();
  }
};

/* ---------------- Entrada ---------------- */

const updateCounter = (): void => {
  const input = $<HTMLTextAreaElement>("[data-corpus]");
  const counter = $<HTMLElement>("[data-counter]");
  if (input && counter) counter.textContent = counterLabel(input.value, isSpanish());
};

const analyse = (): void => {
  const input = $<HTMLTextAreaElement>("[data-corpus]");
  const error = $<HTMLElement>("[data-error]");
  if (!input) return;
  if (error) error.textContent = "";

  const text = input.value;
  if (!validateText(text).ok) {
    if (error) error.textContent = sizeErrorMessage(byteLength(text), isSpanish());
    return;
  }

  const detailed = tokenizeDetailed(text);
  state.tokens = detailed.tokens;
  state.sentences = detailed.sentences.length;
  render();
  const live = $<HTMLElement>("[data-live-region]");
  if (live) live.textContent = analysisReady(state.tokens.length, isSpanish());
};

/** El texto de ejemplo viaja como un bloque de datos JSON y se lee al pedirlo. */
const sampleText = (): string => {
  const holder = $<HTMLScriptElement>("[data-sample-text]");
  if (!holder?.textContent) return "";
  try {
    return JSON.parse(holder.textContent) as string;
  } catch {
    return "";
  }
};

const exportResults = (): void => {
  if (!state.hasResults) return;
  const payload = exportPayload({
    tokens: state.tokens,
    sentences: state.sentences,
    text: $<HTMLTextAreaElement>("[data-corpus]")?.value ?? "",
    locale: locale(),
    stopwords: stopwordMode(),
    settings: ngramSettings(),
    readabilityLang: readabilityLang(),
    generated: new Date().toISOString(),
  });
  download(
    "lingualab-analisis.json",
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8",
  );
};

/* ---------------- Inicializador ---------------- */

export const initTextStation = (): void => {
  const root = $<HTMLElement>("[data-station]");
  if (!root) return;

  const tabButtons = (): HTMLButtonElement[] => [
    ...root.querySelectorAll<HTMLButtonElement>("[data-tab]"),
  ];

  // Patrón de pestañas de WAI-ARIA: solo la pestaña activa entra en el orden
  // de Tab, el panel toma su nombre, y el foco sigue a la selección.
  const selectTab = (tab: HTMLButtonElement, focus = false): void => {
    const id = tab.dataset["tab"];
    if (!id) return;
    state.activeTab = id;
    for (const other of tabButtons()) {
      const selected = other === tab;
      other.setAttribute("aria-selected", selected ? "true" : "false");
      other.tabIndex = selected ? 0 : -1;
    }
    $("[data-panel]")?.setAttribute("aria-labelledby", tab.id);
    if (focus) tab.focus();
    render();
  };

  root.querySelector('[role="tablist"]')?.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent)) return;
    const tabs = tabButtons();
    const current = tabs.findIndex((tab) => tab === document.activeElement);
    if (current === -1) return;
    const next = nextTabIndex(current, tabs.length, event.key);
    const target = next === null ? undefined : tabs[next];
    if (target === undefined) return;
    event.preventDefault();
    selectTab(target, true);
  });

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const tab = target.closest<HTMLButtonElement>("[data-tab]");
    if (tab?.dataset["tab"]) {
      selectTab(tab);
      return;
    }

    if (target.closest("[data-analyse]")) {
      analyse();
      return;
    }

    if (target.closest("[data-sample]")) {
      const input = $<HTMLTextAreaElement>("[data-corpus]");
      if (input) input.value = sampleText();
      analyse();
      return;
    }

    if (target.closest("[data-clear]")) {
      const input = $<HTMLTextAreaElement>("[data-corpus]");
      if (input) input.value = "";
      state.tokens = [];
      state.sentences = 0;
      state.hasResults = false;
      showPanel(
        note(isSpanish() ? "Pega un texto y pulsa «Analizar»." : "Paste a text and press “Analyse”."),
      );
      $("[data-export]")?.setAttribute("disabled", "true");
      updateCounter();
      return;
    }

    if (target.closest("[data-export]")) exportResults();
  });

  // Un cambio de opción se ve en el acto.
  for (const selector of ["[data-stopwords]", "[data-lang]", "[data-window]"]) {
    $(selector)?.addEventListener("change", () => {
      if (state.tokens.length > 0) render();
    });
  }

  // El constructor de n-gramas responde al escribir, pero solo con su pestaña abierta.
  const refreshCollocations = (): void => {
    if (state.tokens.length > 0 && state.activeTab === "colloc") renderCollocations();
  };
  for (const selector of ["[data-ngram-n]", "[data-ngram-min]", "[data-ngram-limit]"]) {
    $(selector)?.addEventListener("input", refreshCollocations);
  }
  $("[data-ngram-sort]")?.addEventListener("change", refreshCollocations);

  const input = $<HTMLTextAreaElement>("[data-corpus]");
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      analyse();
    }
  });
  input?.addEventListener("input", updateCounter);

  // La concordancia sigue a la palabra clave mientras se escribe.
  $<HTMLInputElement>("[data-keyword]")?.addEventListener("input", () => {
    if (state.tokens.length > 0 && state.activeTab === "kwic") renderKwic();
  });

  $<HTMLInputElement>("[data-upload]")?.addEventListener("change", (event) => {
    const picker = event.target as HTMLInputElement;
    const file = picker.files?.[0];
    if (!file) return;

    const error = $<HTMLElement>("[data-error]");
    const check = validateFile(file);
    if (!check.ok) {
      if (error) error.textContent = fileErrorMessage(check.messageKey, isSpanish());
      picker.value = "";
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (input) input.value = String(reader.result ?? "");
      analyse();
      picker.value = "";
    });
    reader.addEventListener("error", () => {
      if (error) {
        error.textContent = isSpanish() ? "No se pudo leer el archivo." : "Could not read the file.";
      }
    });
    reader.readAsText(file, "utf-8");
  });

  updateCounter();
};
