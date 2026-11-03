/* ============================================================
   LinguaLab — phoneme of the day (DOM)

   The build renders the first entry as static HTML and embeds every entry,
   already resolved for the page's locale, as JSON. This script moves the
   card to today's entry and lets the reader step through the others and
   hear the recording when there is one.
   ============================================================ */

import { dayIndex, markContext } from "../../data/phoneme-of-day";

/** One entry, resolved at build time for the page's locale. */
export interface PhonemeView {
  readonly symbol: string;
  readonly ipa: string;
  readonly name: string;
  readonly ctx: string;
  readonly why: string;
  readonly related: readonly string[];
  readonly features: readonly { readonly label: string; readonly value: string }[];
  readonly audio: string | null;
}

const isView = (value: unknown): value is PhonemeView =>
  typeof value === "object" &&
  value !== null &&
  "symbol" in value &&
  typeof value.symbol === "string" &&
  "ctx" in value &&
  typeof value.ctx === "string";

/** Replaces an element's children with a sentence whose {targets} are marked. */
function renderMarked(el: HTMLElement, sentence: string): void {
  el.replaceChildren(
    ...markContext(sentence).map((part) => {
      if (!part.hit) return document.createTextNode(part.word);
      const em = document.createElement("em");
      em.textContent = part.word;
      return em;
    }),
  );
}

export function rotatePhoneme(): void {
  const root = document.querySelector<HTMLElement>("[data-phoneme]");
  const dataEl = root?.querySelector<HTMLScriptElement>("[data-phoneme-data]");
  if (!root || !dataEl?.textContent) return;

  let views: readonly PhonemeView[];
  try {
    const parsed: unknown = JSON.parse(dataEl.textContent);
    if (!Array.isArray(parsed) || !parsed.every(isView)) return;
    views = parsed;
  } catch {
    return;
  }
  if (views.length === 0) return;

  const get = <T extends HTMLElement>(selector: string): T | null =>
    root.querySelector<T>(selector);
  const set = (selector: string, text: string): void => {
    const el = get(selector);
    if (el) el.textContent = text;
  };

  const audioButton = get<HTMLButtonElement>("[data-phoneme-play]");
  const nextButton = get<HTMLButtonElement>("[data-phoneme-next]");
  const position = get("[data-phoneme-position]");
  let player: HTMLAudioElement | null = null;

  const show = (index: number): void => {
    const view = views[index];
    if (!view) return;

    set("[data-phoneme-symbol]", view.symbol);
    set("[data-phoneme-ipa]", view.ipa);
    set("[data-phoneme-name]", view.name);

    const ctx = get("[data-phoneme-ctx]");
    if (ctx) renderMarked(ctx, view.ctx);
    const why = get("[data-phoneme-why]");
    if (why) renderMarked(why, view.why);

    const features = get("[data-phoneme-features]");
    if (features) {
      features.hidden = view.features.length === 0;
      features.replaceChildren(
        ...view.features.map((feature) => {
          const row = document.createElement("div");
          const dt = document.createElement("dt");
          const dd = document.createElement("dd");
          dt.textContent = feature.label;
          dd.textContent = feature.value;
          row.append(dt, dd);
          return row;
        }),
      );
    }

    const related = get("[data-phoneme-related]");
    if (related) {
      related.replaceChildren(
        ...view.related.map((term) => {
          const li = document.createElement("li");
          li.className = "badge";
          li.textContent = term;
          return li;
        }),
      );
    }

    if (audioButton) {
      player?.pause();
      player = null;
      audioButton.hidden = view.audio === null;
      audioButton.dataset["src"] = view.audio ?? "";
    }
    if (position) position.textContent = `${index + 1} / ${views.length}`;
    root.dataset["index"] = String(index);
  };

  audioButton?.addEventListener("click", () => {
    const src = audioButton.dataset["src"];
    if (!src) return;
    player?.pause();
    player = new Audio(src);
    void player.play().catch(() => {
      // A blocked or missing file leaves the card as it is: the button is a
      // convenience, and the transcription above is the content.
    });
  });

  nextButton?.addEventListener("click", () => {
    // Announce changes the reader asked for, not the silent move to today's
    // entry on load.
    get("[data-phoneme-body]")?.setAttribute("aria-live", "polite");
    const current = Number(root.dataset["index"] ?? "0");
    show((current + 1) % views.length);
  });

  if (nextButton) nextButton.hidden = views.length < 2;
  show(dayIndex(new Date(), views.length));
}
