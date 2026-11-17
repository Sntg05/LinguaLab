/* ============================================================
   LinguaLab — prueba del filtro de Glosario y Bibliografía sobre un DOM

   El fixture imita el marcado de `src/components/Glossary.astro` y
   `Bibliography.astro` (mismos atributos `data-*`) y se arma con nodos, sin
   `innerHTML`, como el resto de las pruebas `.dom.test.ts`.
   ============================================================ */

import { afterEach, describe, expect, it } from "vitest";
import { catalogueCountLabel, initCatalogueFilter } from "./catalogue-filter";

const el = (
  tag: string,
  attributes: Readonly<Record<string, string>> = {},
  ...children: (Node | string)[]
): HTMLElement => {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
};

const ENTRIES = [
  { facet: "Fonética", search: "alófono variante de un fonema" },
  { facet: "Fonética", search: "fonema unidad distintiva" },
  { facet: "Sintaxis", search: "núcleo de un sintagma" },
];

const mount = (): HTMLElement => {
  const root = el(
    "section",
    { "data-catalogue": "" },
    el("input", { "data-query": "" }),
    el("button", { "data-facet": "", "aria-pressed": "true" }, "Todo"),
    el("button", { "data-facet": "Sintaxis", "aria-pressed": "false" }, "Sintaxis"),
    el("p", { "data-count": "" }),
    el(
      "ul",
      { "data-list": "" },
      ...ENTRIES.map((entry) =>
        el("li", { "data-record": "", "data-facet-value": entry.facet, "data-search": entry.search }),
      ),
    ),
    el("p", { "data-empty": "", hidden: "" }),
  );
  document.body.append(root);
  return root;
};

const NOUN = { es: "términos", en: "terms" } as const;

const hiddenCount = (root: HTMLElement): number =>
  [...root.querySelectorAll("[data-record]")].filter((item) => item.hasAttribute("hidden")).length;

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.lang = "es";
});

describe("catalogueCountLabel", () => {
  it("dice cuántos se ven de cuántos hay, con el sustantivo de la página", () => {
    expect(catalogueCountLabel(2, 5, NOUN, "es")).toBe("2 de 5 términos");
    expect(catalogueCountLabel(2, 5, { es: "recursos", en: "resources" }, "en")).toBe(
      "2 of 5 resources",
    );
  });
});

describe("initCatalogueFilter", () => {
  it("al arrancar muestra todo y cuenta", () => {
    const root = mount();
    initCatalogueFilter(NOUN);
    expect(hiddenCount(root)).toBe(0);
    expect(root.querySelector("[data-count]")?.textContent).toBe("3 de 3 términos");
  });

  it("la búsqueda oculta lo que no coincide", () => {
    const root = mount();
    initCatalogueFilter(NOUN);
    const query = root.querySelector<HTMLInputElement>("[data-query]");
    if (!query) throw new Error("fixture sin búsqueda");
    query.value = "fonema";
    query.dispatchEvent(new Event("input"));
    expect(hiddenCount(root)).toBe(1);
    expect(root.querySelector("[data-count]")?.textContent).toBe("2 de 3 términos");
  });

  it("un filtro de área marca su botón y deja solo esa área", () => {
    const root = mount();
    initCatalogueFilter(NOUN);
    const syntax = root.querySelector<HTMLButtonElement>('[data-facet="Sintaxis"]');
    syntax?.click();
    expect(syntax?.getAttribute("aria-pressed")).toBe("true");
    expect(root.querySelector('[data-facet=""]')?.getAttribute("aria-pressed")).toBe("false");
    expect(hiddenCount(root)).toBe(2);
  });

  it("sin coincidencias, muestra el aviso de vacío", () => {
    const root = mount();
    initCatalogueFilter(NOUN);
    const query = root.querySelector<HTMLInputElement>("[data-query]");
    if (!query) throw new Error("fixture sin búsqueda");
    query.value = "zzz";
    query.dispatchEvent(new Event("input"));
    expect(root.querySelector("[data-empty]")?.hasAttribute("hidden")).toBe(false);
    expect(root.querySelector("[data-count]")?.textContent).toBe("0 de 3 términos");
  });

  it("en una página en inglés cuenta en inglés", () => {
    document.documentElement.lang = "en";
    const root = mount();
    initCatalogueFilter(NOUN);
    expect(root.querySelector("[data-count]")?.textContent).toBe("3 of 3 terms");
  });

  it("sin la lista en la página no hace nada y no lanza", () => {
    expect(() => initCatalogueFilter(NOUN)).not.toThrow();
  });
});
