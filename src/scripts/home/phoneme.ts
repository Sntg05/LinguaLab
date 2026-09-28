/* ============================================================
   LinguaLab — phoneme of the day (DOM)
   The build renders one entry as static HTML. This advances it to the
   entry for the visitor's current day, in place, without a reflow of
   the surrounding page.
   ============================================================ */

import { markContext, phonemeForDate, type PhonemeOfDay } from "../../data/phoneme-of-day";
import { localePath, type Locale } from "../../i18n";

/** The locale-specific view of one phoneme entry. */
interface PhonemeView {
  symbol: string;
  ipa: string;
  name: string;
  ctx: string;
  why: string;
  related: string[];
}

function pickLocale(entry: PhonemeOfDay, locale: Locale): PhonemeView {
  const es = locale === "es";
  return {
    symbol: entry.symbol,
    ipa: es ? entry.ipa_es : entry.ipa_en,
    name: es ? entry.name_es : entry.name_en,
    ctx: es ? entry.ctx_es : entry.ctx_en,
    why: es ? entry.why_es : entry.why_en,
    related: es ? entry.rel_es : entry.rel_en,
  };
}

export function rotatePhoneme(): void {
  const root = document.querySelector<HTMLElement>("[data-phoneme]");
  const dataEl = root?.querySelector<HTMLScriptElement>("[data-phoneme-data]");
  if (!root || !dataEl?.textContent) return;

  let entries: readonly PhonemeOfDay[];
  let locale: Locale;
  try {
    const parsed: unknown = JSON.parse(dataEl.textContent);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("entries" in parsed) ||
      !Array.isArray(parsed.entries) ||
      !("locale" in parsed) ||
      (parsed.locale !== "es" && parsed.locale !== "en")
    ) {
      return;
    }
    entries = parsed.entries as readonly PhonemeOfDay[];
    locale = parsed.locale;
  } catch {
    return;
  }

  if (entries.length === 0) return;

  const target = phonemeForDate(new Date());
  const view = pickLocale(target, locale);

  const set = (selector: string, text: string): void => {
    const el = root.querySelector<HTMLElement>(selector);
    if (el) el.textContent = text;
  };

  set("[data-phoneme-symbol]", view.symbol);
  set("[data-phoneme-ipa]", view.ipa);
  set("[data-phoneme-name]", view.name);
  set("[data-phoneme-why]", view.why);

  // Context keeps its highlighted target words, so rebuild the children
  // as real nodes rather than assigning innerHTML.
  const ctx = root.querySelector<HTMLElement>("[data-phoneme-ctx]");
  if (ctx) {
    const nodes: Node[] = [];
    for (const part of markContext(view.ctx)) {
      if (!part.hit) {
        nodes.push(document.createTextNode(part.word));
        continue;
      }
      const em = document.createElement("em");
      em.textContent = part.word;
      nodes.push(em);
    }
    ctx.replaceChildren(...nodes);
  }

  const related = root.querySelector<HTMLElement>("[data-phoneme-related]");
  if (related) {
    related.replaceChildren(
      ...view.related.map((term) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.className = "badge";
        a.href = localePath(locale, "/glosario");
        a.textContent = term;
        li.append(a);
        return li;
      }),
    );
  }
}
