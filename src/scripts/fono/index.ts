/* ============================================================
   LinguaLab — FonoLab: cableado de la página
   Tres piezas independientes (tabla del AFI, audio, transcriptor), cada una
   con su propio inicializador para que `safeInitAll` contenga el fallo de una
   sin llevarse las otras. Las reglas viven en `rules.ts`.
   ============================================================ */

import { lingualab } from "../../composition-root";
import { articulationFor } from "../../data/articulation";
import type { Locale } from "../../i18n";
import { play, sampleCount, stop, warmUpVoices } from "./audio";
import {
  articulationRows,
  arrowStep,
  audioNote,
  audioTierBadge,
  coverageText,
  matchesIpaFilters,
  placeName,
  symbolCountLabel,
  symbolFromDataset,
  transcriberFailure,
} from "./rules";
import { applyArticulation } from "./vocal-tract";

/** Se mantiene igual que `INITIAL_SYMBOL` en el frontmatter del componente. */
const INITIAL_SYMBOL = "θ";

const pageLocale = (): Locale => (document.documentElement.lang === "en" ? "en" : "es");

const setText = (selector: string, text: string): void => {
  const el = document.querySelector<HTMLElement>(selector);
  if (el) el.textContent = text;
};

const selectSymbol = (button: HTMLButtonElement, locale: Locale): void => {
  const { symbol, categoryId } = symbolFromDataset(button.dataset, locale === "es");

  for (const el of document.querySelectorAll<HTMLButtonElement>("[data-symbol]")) {
    el.setAttribute("aria-pressed", el === button ? "true" : "false");
  }

  setText("[data-detail-glyph]", symbol.ipa);
  setText("[data-detail-name]", symbol.es || symbol.en);
  setText("[data-detail-ipa]", `/${symbol.ipa}/`);

  const rows = document.querySelector<HTMLElement>("[data-detail-rows]");
  rows?.replaceChildren(
    ...articulationRows(symbol, locale).map(([term, description]) => {
      const row = document.createElement("div");
      row.className = "detail__row";
      const dt = document.createElement("dt");
      dt.textContent = term;
      const dd = document.createElement("dd");
      dd.textContent = description;
      row.append(dt, dd);
      return row;
    }),
  );

  const tract = document.querySelector<HTMLElement>("[data-vocal-tract]");
  if (tract) {
    applyArticulation(tract, articulationFor(symbol, categoryId), {
      locale,
      placeText: placeName(symbol.place_en, locale),
    });
  }

  // El audio del símbolo anterior no describe al nuevo.
  const tier = document.querySelector<HTMLElement>("[data-audio-tier]");
  if (tier) {
    tier.textContent = "";
    tier.className = "badge";
  }
  setText("[data-audio-note]", "");

  document.querySelector<HTMLElement>(".lab__detail")?.scrollIntoView({
    block: "nearest",
    behavior: "smooth",
  });
};

export const initIpaChart = (): void => {
  const chart = document.querySelector<HTMLElement>("[data-ipachart]");
  if (!chart || !document.querySelector("[data-ipa-detail]")) return;

  const locale = pageLocale();
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-symbol]")];
  const groups = [...document.querySelectorAll<HTMLElement>("[data-ipa-group]")];
  const search = document.querySelector<HTMLInputElement>("[data-ipa-search]");
  const count = document.querySelector<HTMLElement>("[data-ipa-count]");
  let categoryFilter = "all";

  const isShown = (button: HTMLButtonElement): boolean =>
    !button.closest("li")?.hasAttribute("hidden");

  const applyFilters = (): void => {
    let visible = 0;
    for (const button of buttons) {
      const show = matchesIpaFilters(button.dataset, categoryFilter, search?.value ?? "");
      button.closest("li")?.toggleAttribute("hidden", !show);
      if (show) visible += 1;
    }
    for (const group of groups) {
      const anyVisible = [...group.querySelectorAll<HTMLButtonElement>("[data-symbol]")].some(
        isShown,
      );
      group.toggleAttribute("hidden", !anyVisible);
    }
    if (count) count.textContent = symbolCountLabel(visible, buttons.length, locale === "es");
  };

  chart.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const filter = target.closest<HTMLButtonElement>("[data-ipa-filter]");
    if (filter) {
      categoryFilter = filter.dataset["ipaFilter"] ?? "all";
      for (const other of chart.querySelectorAll<HTMLButtonElement>("[data-ipa-filter]")) {
        other.setAttribute("aria-pressed", other === filter ? "true" : "false");
      }
      applyFilters();
      return;
    }

    const symbol = target.closest<HTMLButtonElement>("[data-symbol]");
    if (symbol) selectSymbol(symbol, locale);
  });

  search?.addEventListener("input", applyFilters);
  applyFilters();

  // Las flechas recorren los símbolos visibles, en círculo.
  chart.addEventListener("keydown", (event) => {
    const step = arrowStep(event.key);
    if (step === null || !(event.target instanceof Element)) return;
    const current = event.target.closest<HTMLButtonElement>("[data-symbol]");
    if (!current) return;

    const shown = buttons.filter(isShown);
    const index = shown.indexOf(current);
    if (index < 0) return;

    const next = shown[(index + step + shown.length) % shown.length];
    event.preventDefault();
    if (next) {
      next.focus();
      selectSymbol(next, locale);
    }
  });

  const initial = buttons.find((b) => b.dataset["symbol"] === INITIAL_SYMBOL) ?? buttons[0];
  if (initial) selectSymbol(initial, locale);
};

export const initFonoAudio = (): void => {
  const button = document.querySelector<HTMLButtonElement>("[data-audio-play]");
  if (!button) return;

  const locale = pageLocale();
  const es = locale === "es";
  warmUpVoices();

  button.addEventListener("click", async () => {
    const selected = document.querySelector<HTMLButtonElement>('[data-symbol][aria-pressed="true"]');
    const symbol = selected?.dataset["symbol"];
    if (!symbol) return;

    const tierEl = document.querySelector<HTMLElement>("[data-audio-tier]");
    const labelEl = button.querySelector<HTMLElement>("[data-audio-label]");

    button.disabled = true;
    if (labelEl) labelEl.textContent = es ? "Reproduciendo…" : "Playing…";

    const result = await play(symbol, { locale });

    button.disabled = false;
    if (labelEl) labelEl.textContent = es ? "Reproducir" : "Play";

    if (tierEl) {
      const badge = audioTierBadge(result.tier, es);
      tierEl.className = badge.className;
      tierEl.textContent = badge.text;
    }
    setText("[data-audio-note]", audioNote(result, es));
  });

  // Al salir de la página, el sonido se corta limpio.
  window.addEventListener("pagehide", () => stop());
};

export const initFonoTranscriber = (): void => {
  const input = document.querySelector<HTMLTextAreaElement>("[data-tx-input]");
  const output = document.querySelector<HTMLElement>("[data-tx-out]");
  const run = document.querySelector<HTMLButtonElement>("[data-tx-run]");
  const clear = document.querySelector<HTMLButtonElement>("[data-tx-clear]");
  const langs = [...document.querySelectorAll<HTMLButtonElement>("[data-tx-lang]")];
  if (!input || !output || !run) return;

  const locale = pageLocale();
  let lang: "es" | "en" = locale;
  // Una respuesta que llega tarde no puede pisar a una más nueva: el inglés
  // espera la descarga del diccionario la primera vez.
  let latest = 0;

  const render = async (): Promise<void> => {
    const text = input.value.trim();
    if (text === "") {
      output.textContent = "—";
      return;
    }
    const request = ++latest;
    output.setAttribute("aria-busy", "true");
    const result = await lingualab.phonemizeText({
      text,
      languageCode: lang === "en" ? "eng" : "spa",
    });
    if (request !== latest) return;
    output.removeAttribute("aria-busy");
    output.textContent = result.ok ? result.value.ipa || "—" : transcriberFailure(locale === "es");
  };

  run.addEventListener("click", () => void render());

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void render();
    }
  });

  clear?.addEventListener("click", () => {
    input.value = "";
    output.textContent = "—";
    input.focus();
  });

  for (const button of langs) {
    button.addEventListener("click", () => {
      lang = button.dataset["txLang"] === "en" ? "en" : "es";
      for (const other of langs) {
        other.setAttribute("aria-pressed", other === button ? "true" : "false");
      }
      void render();
    });
  }

  output.textContent = "—";
  setText("[data-audio-coverage]", coverageText(sampleCount(), locale === "es"));
};
