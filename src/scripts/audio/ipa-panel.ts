/* ============================================================
   LinguaLab — panel del teclado IPA del visor

   El inventario y la insercion son puros y viven en `./ipa-keyboard.ts`; aqui
   se construyen los botones y se escribe el simbolo en el ultimo campo de
   texto de intervalo que tuvo el foco.
   ============================================================ */

import { IPA_GROUPS, insertSymbol } from "./ipa-keyboard";

/** Grupos IPA del panel: se construyen aqui para no repetir 90 botones en el marcado. */
export const mountIpaKeyboard = (): void => {
  const container = document.querySelector<HTMLElement>("[data-audio-ipa]");
  if (container === null || container.childElementCount > 0) {
    return;
  }
  const es = document.documentElement.lang !== "en";

  for (const group of IPA_GROUPS) {
    const wrapper = document.createElement("div");
    wrapper.className = "audiolab__ipa-group";

    const title = document.createElement("p");
    title.className = "audiolab__ipa-title";
    title.id = `audio-ipa-${group.label}`;
    title.textContent = {
      consonants: es ? "Consonantes" : "Consonants",
      vowels: es ? "Vocales" : "Vowels",
      diacritics: es ? "Diacríticos" : "Diacritics",
      prosody: es ? "Prosodia" : "Prosody",
    }[group.label];

    const buttons = document.createElement("div");
    buttons.className = "audiolab__ipa-buttons";
    buttons.setAttribute("role", "group");
    buttons.setAttribute("aria-labelledby", title.id);

    for (const symbol of group.symbols) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "audiolab__ipa-symbol";
      button.textContent = symbol;
      button.dataset.audioIpaSymbol = symbol;
      buttons.append(button);
    }

    wrapper.append(title, buttons);
    container.append(wrapper);
  }
};

/**
 * Escribe el simbolo pulsado en el campo de texto que `lastTextInput` devuelva.
 *
 * El evento `input` se dispara a mano para que la edicion entre al documento
 * por el mismo camino que una tecla.
 */
export const listenForIpaSymbols = (
  container: HTMLElement | null,
  lastTextInput: () => HTMLInputElement | null,
): void => {
  container?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>("[data-audio-ipa-symbol]");
    const symbol = button?.dataset.audioIpaSymbol;
    const input = lastTextInput();
    if (symbol === undefined || input === null) {
      return;
    }
    const result = insertSymbol(
      input.value,
      input.selectionStart ?? input.value.length,
      input.selectionEnd ?? input.value.length,
      symbol,
    );
    input.value = result.value;
    input.focus();
    input.setSelectionRange(result.selectionStart, result.selectionEnd);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};
