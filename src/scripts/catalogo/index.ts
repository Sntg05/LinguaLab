/* ============================================================
   LinguaLab — ToolCatalog filters

   The catalog is static and already rendered in the HTML, so this script does
   not fetch or build a single card: it toggles the `hidden` attribute of the
   cards that are already there. That keeps the tool usable without
   JavaScript — every card stays visible — and makes the filtering cheap and
   impossible to disagree with the server-rendered list, because there is only
   one list.

   The filter model is AND over the three facets: area, language and
   integration. A tool with an empty `languages` list is language-independent,
   so it matches only the "all languages" option.
   ============================================================ */

import { createStrings, format, parseStrings } from "./strings";

const isHiddenByFilters = (
  card: HTMLElement,
  facet: (name: string) => string,
): boolean => {
  const area = facet("area");
  const language = facet("language");
  const integration = facet("integration");

  if (area !== "" && card.dataset["area"] !== area) {
    return true;
  }
  if (integration !== "" && card.dataset["integration"] !== integration) {
    return true;
  }
  if (language !== "" && !(card.dataset["languages"] ?? "").split(" ").includes(language)) {
    return true;
  }
  return false;
};

export const initToolCatalog = (): void => {
  const root = document.querySelector<HTMLElement>("[data-catalog]");
  if (root === null) {
    return;
  }

  const strings = createStrings(
    parseStrings(document.querySelector<HTMLElement>("[data-catalog-strings]")?.dataset["json"]),
  );

  const cards = [...root.querySelectorAll<HTMLElement>("[data-tool-card]")];
  const groups = [...root.querySelectorAll<HTMLElement>("[data-catalog-group]")];
  const controls = [...root.querySelectorAll<HTMLSelectElement>("[data-catalog-filter]")];
  const count = root.querySelector<HTMLElement>("[data-catalog-count]");
  const empty = root.querySelector<HTMLElement>("[data-catalog-empty]");

  const facet = (name: string): string =>
    controls.find((control) => control.dataset["catalogFilter"] === name)?.value ?? "";

  /** The active filters named as a person would read them, for the empty state. */
  const activeFilters = (): readonly string[] => {
    const labels: string[] = [];
    for (const control of controls) {
      if (control.value === "") {
        continue;
      }
      const option = control.selectedOptions[0];
      const name = control.dataset["catalogLabel"] ?? control.dataset["catalogFilter"] ?? "";
      labels.push(`${name}: ${option?.textContent ?? control.value}`);
    }
    return labels;
  };

  const apply = (): void => {
    let visible = 0;
    for (const card of cards) {
      const hidden = isHiddenByFilters(card, facet);
      card.hidden = hidden;
      if (!hidden) {
        visible += 1;
      }
    }

    // Un nivel de analisis sin coincidencias deja de ocupar lugar: su titulo
    // encabezando una seccion vacia es peor que no tener seccion, porque sugiere
    // que el catalogo esta incompleto. La seccion se oculta entera, encabezado
    // incluido, y reaparece en cuanto una ficha suya vuelve a coincidir.
    for (const group of groups) {
      group.hidden = [...group.querySelectorAll<HTMLElement>("[data-tool-card]")].every(
        (card) => card.hidden,
      );
    }

    if (count !== null) {
      count.textContent = format(strings.text("catalog.count"), {
        count: visible,
        total: cards.length,
      });
    }

    if (empty !== null) {
      empty.hidden = visible > 0;
      if (visible === 0) {
        empty.textContent = format(strings.text("catalog.empty"), {
          filters: activeFilters().join(", "),
        });
      }
    }
  };

  for (const control of controls) {
    control.addEventListener("change", apply);
  }
  // The server already rendered the full count; applying once keeps the DOM and
  // the script in the same state even if a browser restores a previous
  // selection on reload.
  apply();
};
