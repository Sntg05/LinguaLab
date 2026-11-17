/* ============================================================
   LinguaLab — PhonemizerLab: cableado de la página
   Solo conecta elementos con las reglas de `rules.ts` y con el motor que
   entrega el composition root. Nada aquí decide qué transcribir ni qué decir.
   ============================================================ */

import { lingualab } from "../../composition-root";
import {
  busyMessage,
  compareWithTable,
  describePhonemizeError,
  doneMessage,
  listSkipped,
  phonemizeOptions,
  variantLine,
} from "./rules";

type StatusState = "idle" | "busy" | "ok" | "error";

export const initPhonemizerLab = (): void => {
  const root = document.querySelector<HTMLElement>("[data-phonemizer]");
  if (!root) return;

  const es = document.documentElement.lang !== "en";
  const $ = <T extends Element>(selector: string): T | null => root.querySelector<T>(selector);

  const input = $<HTMLTextAreaElement>("[data-phon-text]");
  const lang = $<HTMLSelectElement>("[data-phon-lang]");
  const variety = $<HTMLSelectElement>("[data-phon-variety]");
  const level = $<HTMLSelectElement>("[data-phon-level]");
  const skippedBox = $<HTMLElement>("[data-phon-skipped-box]");
  const skippedOut = $<HTMLElement>("[data-phon-skipped]");
  const variantsBox = $<HTMLElement>("[data-phon-variants-box]");
  const variantsOut = $<HTMLElement>("[data-phon-variants]");
  const runButton = $<HTMLButtonElement>("[data-phon-run]");
  const clearButton = $<HTMLButtonElement>("[data-phon-clear]");
  const ipaOut = $<HTMLOutputElement>("[data-phon-ipa]");
  const copyButton = $<HTMLButtonElement>("[data-phon-copy]");
  const copyNote = $<HTMLElement>("[data-phon-copy-note]");
  const tableOut = $<HTMLOutputElement>("[data-phon-table]");
  const tableName = $<HTMLElement>("[data-phon-table-name]");
  const engineBadge = $<HTMLElement>("[data-phon-engine]");
  const status = $<HTMLElement>("[data-phon-status]");
  const outputs = $<HTMLElement>("[data-phon-outputs]");

  if (!input || !lang || !runButton) return;

  /** Una frase, un estado. Nunca un panel en blanco que pase por resultado. */
  const say = (message: string, state: StatusState): void => {
    if (!status) return;
    status.textContent = message;
    status.dataset["state"] = state;
  };

  const setBusy = (busy: boolean): void => {
    runButton.disabled = busy;
    runButton.setAttribute("aria-busy", busy ? "true" : "false");
    outputs?.setAttribute("aria-busy", busy ? "true" : "false");
  };

  const setBadge = (text: string, className: string): void => {
    if (!engineBadge) return;
    engineBadge.textContent = text;
    engineBadge.className = className;
  };

  const clearResult = (): void => {
    if (ipaOut) ipaOut.textContent = "—";
    if (copyButton) copyButton.disabled = true;
    if (copyNote) copyNote.textContent = "";
    if (skippedBox) skippedBox.hidden = true;
    if (variantsBox) variantsBox.hidden = true;
  };

  /** Variedad y nivel son solo del español: ofrecerlos para el inglés sería mentir. */
  const syncLanguageControls = (): void => {
    for (const control of root.querySelectorAll<HTMLElement>("[data-phon-spanish-only]")) {
      control.hidden = lang.value !== "spa";
    }
  };
  syncLanguageControls();
  lang.addEventListener("change", syncLanguageControls);

  const renderUnresolved = (
    skipped: readonly string[],
    variants: readonly { readonly word: string; readonly ipa: readonly string[] }[],
  ): void => {
    if (skippedBox && skippedOut) {
      skippedOut.textContent = listSkipped(skipped);
      skippedBox.hidden = skipped.length === 0;
    }
    if (variantsBox && variantsOut) {
      variantsOut.replaceChildren(
        ...variants.map((entry) => {
          const item = document.createElement("li");
          item.textContent = variantLine(entry);
          return item;
        }),
      );
      variantsBox.hidden = variants.length === 0;
    }
  };

  const renderTable = (text: string): void => {
    const comparison = compareWithTable(text, lang.value, es);
    if (tableOut) tableOut.textContent = comparison.output;
    if (tableName) tableName.textContent = comparison.caption;
  };

  const phonemize = async (): Promise<void> => {
    const text = input.value.trim();
    if (text === "") {
      say(
        es
          ? "Escribe un texto primero: no hay nada que fonemizar."
          : "Type some text first: there is nothing to phonemize.",
        "idle",
      );
      return;
    }

    setBusy(true);
    clearResult();
    say(busyMessage(lang.value, es), "busy");

    // La tabla es local y síncrona: se pinta primero.
    renderTable(text);

    const result = await lingualab.phonemizeText({
      text,
      languageCode: lang.value,
      options: phonemizeOptions(variety?.value, level?.value),
    });
    setBusy(false);

    if (!result.ok) {
      clearResult();
      setBadge(es ? "no disponible" : "unavailable", "badge badge--warn");
      say(describePhonemizeError(result.error, es, lang.value), "error");
      return;
    }

    const skipped = result.value.skipped ?? [];
    if (ipaOut) ipaOut.textContent = result.value.ipa;
    renderUnresolved(skipped, result.value.variants ?? []);
    if (copyButton) copyButton.disabled = false;
    setBadge(es ? "motor cargado" : "engine loaded", "badge badge--ok");
    say(doneMessage(skipped.length, es), "ok");
  };

  runButton.addEventListener("click", () => {
    void phonemize();
  });

  clearButton?.addEventListener("click", () => {
    input.value = "";
    clearResult();
    if (tableOut) tableOut.textContent = "—";
    if (tableName) tableName.textContent = "";
    setBadge("", "badge");
    say(es ? "Escribe un texto y pulsa «Fonemizar»." : "Type a text and press “Phonemize”.", "idle");
    input.focus();
  });

  copyButton?.addEventListener("click", async () => {
    const ipa = ipaOut?.textContent?.trim() ?? "";
    if (ipa === "" || ipa === "—") return;

    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(ipa);
      if (copyNote) copyNote.textContent = es ? "Copiado." : "Copied.";
    } catch {
      // La salida sigue seleccionable: la alternativa es una frase, no el silencio.
      if (copyNote) {
        copyNote.textContent = es
          ? "No se pudo copiar: selecciona la transcripción y cópiala a mano."
          : "Could not copy: select the transcription and copy it by hand.";
      }
    }
  });

  // Ctrl/Cmd + Intro transcribe, igual que en la estación de texto.
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void phonemize();
    }
  });
};
