/* ============================================================
   LinguaLab — filtro de las listas de Glosario y Bibliografía
   Las dos páginas tenían el mismo script copiado, salvo el sustantivo del
   contador. Vive aquí una sola vez; cada página dice qué cuenta.
   ============================================================ */

import type { Locale } from "../../i18n";
import { filterCatalogue } from "./catalogue";

/** Lo que cuenta la página («términos», «recursos»), en sus dos lenguas. */
export type CountNoun = Readonly<Record<Locale, string>>;

export const catalogueCountLabel = (
  visible: number,
  total: number,
  noun: CountNoun,
  locale: Locale,
): string =>
  locale === "es" ? `${visible} de ${total} ${noun.es}` : `${visible} of ${total} ${noun.en}`;

export const initCatalogueFilter = (noun: CountNoun): void => {
  const root = document.querySelector<HTMLElement>("[data-catalogue]");
  const list = root?.querySelector<HTMLElement>("[data-list]");
  if (!root || !list) return;

  const locale: Locale = document.documentElement.lang === "en" ? "en" : "es";
  const records = [...list.querySelectorAll<HTMLElement>("[data-record]")].map((element) => ({
    element,
    facet: element.dataset["facetValue"] ?? "",
    search: element.dataset["search"] ?? "",
  }));

  const query = root.querySelector<HTMLInputElement>("[data-query]");
  const count = root.querySelector<HTMLElement>("[data-count]");
  const empty = root.querySelector<HTMLElement>("[data-empty]");
  let facet = "";

  const apply = (): void => {
    const visible = filterCatalogue(records, {
      query: query?.value ?? "",
      facet,
      fields: (record) => [record.search],
      facetValue: (record) => record.facet,
    });

    const shown = new Set(visible.map((record) => record.element));
    for (const record of records) {
      record.element.toggleAttribute("hidden", !shown.has(record.element));
    }

    if (count) count.textContent = catalogueCountLabel(visible.length, records.length, noun, locale);
    empty?.toggleAttribute("hidden", visible.length > 0);
  };

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("[data-facet]");
    if (!button) return;

    facet = button.dataset["facet"] ?? "";
    for (const other of root.querySelectorAll<HTMLButtonElement>("[data-facet]")) {
      other.setAttribute("aria-pressed", other === button ? "true" : "false");
    }
    apply();
  });

  query?.addEventListener("input", apply);
  apply();
};
