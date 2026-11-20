/* ============================================================
   LinguaLab — etiquetado POS: cableado de la página

   Conecta los ganchos `data-pos-*` con el etiquetador (`lingualab.posTagger`)
   y con `rules.ts`. Todo lo que viene del texto entra como nodo de texto.
   ============================================================ */

import { lingualab } from "../../composition-root";
import { safeInit } from "../core/safe";
import { posRowsToCsv, splitForTagging, tagSummary, uposName } from "./rules";
import { createPosStrings } from "./strings";

const cell = (tag: "td" | "th", text: string, title?: string): HTMLTableCellElement => {
  const element = document.createElement(tag);
  element.textContent = text;
  if (title !== undefined) element.title = title;
  if (tag === "th") element.scope = "row";
  return element;
};

export const initPosLab = (): void => {
  const root = document.querySelector<HTMLElement>("[data-pos]");
  if (root === null) return;
  const locale = document.documentElement.lang === "en" ? "en" : "es";
  const strings = createPosStrings(root.dataset["posStrings"]);
  const $ = <T extends Element>(name: string): T | null => root.querySelector<T>(`[data-pos-${name}]`);
  const input = $<HTMLTextAreaElement>("text");
  const language = $<HTMLSelectElement>("lang");
  const run = $<HTMLButtonElement>("run");
  const status = $<HTMLElement>("status");
  const results = $<HTMLElement>("results");
  const tagged = $<HTMLElement>("tagged");
  const summary = $<HTMLElement>("summary");
  const exportButton = $<HTMLButtonElement>("export");
  if (!input || !language || !run || !status || !results || !tagged || !summary || !exportButton) return;

  let rows: { word: string; tag: string }[] = [];
  const say = (message: string, state: "idle" | "busy" | "ok" | "error"): void => {
    status.textContent = message;
    status.dataset["state"] = state;
  };

  const tag = async (): Promise<void> => {
    const tokens = splitForTagging(input.value, language.value);
    if (tokens.length === 0) {
      say(strings.text("pos.status.empty"), "error");
      return;
    }
    run.disabled = true;
    say(strings.text("pos.status.loading"), "busy");
    const result = await lingualab.posTagger.tag(
      tokens.map((token) => token.text),
      language.value,
    );
    run.disabled = false;
    if (!result.ok) {
      results.hidden = true;
      // Lo que se descargue tiene que corresponder a lo que se ve.
      rows = [];
      exportButton.disabled = true;
      say(strings.text("pos.status.error"), "error");
      return;
    }
    rows = tokens.map((token, index) => ({ word: token.text, tag: result.value[index] ?? "X" }));
    tagged.replaceChildren(
      ...tokens.map((token, index) => {
        const row = document.createElement("tr");
        const label = result.value[index] ?? "X";
        const note =
          token.contraction === undefined ? undefined : strings.format("pos.contractionNote", { word: token.contraction });
        row.append(cell("th", token.text, note), cell("td", `${label} · ${uposName(label, locale)}`));
        return row;
      }),
    );
    const counts = tagSummary(result.value);
    const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
    summary.replaceChildren(
      ...counts.map((entry) => {
        const row = document.createElement("tr");
        row.append(
          cell("th", `${entry.tag} · ${uposName(entry.tag, locale)}`),
          cell("td", String(entry.count)),
          cell("td", percent.format(entry.share)),
        );
        return row;
      }),
    );
    results.hidden = false;
    exportButton.disabled = false;
    const errorRate = Number(root.dataset[`posAccuracy${language.value === "en" ? "En" : "Es"}`] ?? "0.95");
    say(
      strings.format("pos.status.done", {
        count: rows.length,
        every: Math.max(2, Math.round(1 / Math.max(0.001, 1 - errorRate))),
      }),
      "ok",
    );
  };

  run.addEventListener("click", () => void tag());
  $<HTMLButtonElement>("example")?.addEventListener("click", () => {
    input.value = root.dataset["posExampleText"] ?? "";
    language.value = locale;
    void tag();
  });
  exportButton.addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([`﻿${posRowsToCsv(rows)}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pos.csv";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });
  say(strings.text("pos.status.ready"), "idle");
};

safeInit("pos tagging", initPosLab);
